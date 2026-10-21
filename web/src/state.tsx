import { useToast } from "./ui/components";
import { createContext, useCallback, useContext, useMemo, useReducer, useRef, type ReactNode } from "react";

export type Range = { start: number; end: number };
export type Task = "extract" | "remove" | "convert";
export type NodeId = "source" | "reference" | Task | "live";
export type Status = "필요" | "진행 중" | "완료";
export type Params = { strength: number; steps: number };
export type Result = { blob: Blob; url: string; origUrl: string; procStart: number; params: Params; createdAt: number };
export type Clip = { blob: Blob; name: string; duration: number; range: Range | null };

type State = {
  source: Clip | null;
  reference: { mode: "same" | "file"; sameRange: Range | null; file: Clip | null };
  results: Partial<Record<Task, Result>>;
  running: Partial<Record<Task, boolean>>;
  errors: Partial<Record<Task, string>>;
  live: { isRunning: boolean; hasDone: boolean };
};
type Action =
  | { type: "source"; blob: Blob; name: string }
  | { type: "sourceReady"; duration: number }
  | { type: "sourceRange"; range: Range }
  | { type: "refMode"; mode: "same" | "file" }
  | { type: "refFile"; blob: Blob; name: string }
  | { type: "refFileReady"; duration: number }
  | { type: "refRange"; range: Range }
  | { type: "liveRunning"; isRunning: boolean }
  | { type: "liveBlock" }
  | { type: "start"; task: Task }
  | { type: "done"; task: Task; result: Result }
  | { type: "fail"; task: Task; message: string };

export const TASK_LABEL: Record<Task, string> = { extract: "목소리 추출", remove: "목소리 제거", convert: "목소리 변환" };
const initial: State = { source: null, reference: { mode: "same", sameRange: null, file: null }, results: {}, running: {}, errors: {}, live: { isRunning: false, hasDone: false } };
const REF_DEFAULT = 7; // seconds
const revoke = (r?: Result) => r && (URL.revokeObjectURL(r.url), URL.revokeObjectURL(r.origUrl));

function reducer(s: State, a: Action): State {
  switch (a.type) {
    case "source":
      Object.values(s.results).forEach(revoke); // results belong to the old source
      return { ...s, source: { blob: a.blob, name: a.name, duration: 0, range: null }, reference: { ...s.reference, sameRange: null }, results: {}, errors: {} };
    case "sourceReady":
      return s.source && !s.source.range ? {
        ...s,
        source: { ...s.source, duration: a.duration, range: { start: 0, end: a.duration } },
        reference: { ...s.reference, sameRange: { start: 0, end: Math.min(REF_DEFAULT, a.duration) } },
      } : s;
    case "sourceRange":
      return s.source ? { ...s, source: { ...s.source, range: a.range } } : s;
    case "refMode":
      return { ...s, reference: { ...s.reference, mode: a.mode } };
    case "refFile":
      return { ...s, reference: { ...s.reference, mode: "file", file: { blob: a.blob, name: a.name, duration: 0, range: null } } };
    case "refFileReady": {
      const f = s.reference.file;
      return f && !f.range ? { ...s, reference: { ...s.reference, file: { ...f, duration: a.duration, range: { start: 0, end: Math.min(REF_DEFAULT, a.duration) } } } } : s;
    }
    case "refRange": {
      const r = s.reference;
      return r.mode === "same" ? { ...s, reference: { ...r, sameRange: a.range } } : r.file ? { ...s, reference: { ...r, file: { ...r.file, range: a.range } } } : s;
    }
    case "liveRunning": return { ...s, live: { ...s.live, isRunning: a.isRunning } };
    case "liveBlock": return s.live.hasDone ? s : { ...s, live: { ...s.live, hasDone: true } };
    case "start":
      return { ...s, running: { ...s.running, [a.task]: true }, errors: { ...s.errors, [a.task]: undefined } };
    case "done":
      revoke(s.results[a.task]);
      return { ...s, running: { ...s.running, [a.task]: false }, results: { ...s.results, [a.task]: a.result } };
    case "fail":
      return { ...s, running: { ...s.running, [a.task]: false }, errors: { ...s.errors, [a.task]: a.message } };
  }
}

export const refRangeOf = (s: State) => (s.reference.mode === "same" ? s.reference.sameRange : s.reference.file?.range ?? null);
export const refBlobOf = (s: State) => (s.reference.mode === "same" ? s.source?.blob ?? null : s.reference.file?.blob ?? null);

// Status is derived from the data, never stored.
export function statusOf(s: State, id: NodeId): Status {
  switch (id) {
    case "source": return !s.source ? "필요" : s.source.range ? "완료" : "진행 중";
    case "reference": {
      const r = refRangeOf(s);
      if (r && r.end - r.start >= 1) return "완료";
      return s.reference.mode === "file" && s.reference.file ? "진행 중" : "필요";
    }
    case "live": return s.live.isRunning ? "진행 중" : s.live.hasDone ? "완료" : "필요"; // hasDone: >= 1 block this page lifetime
    default: return s.running[id] ? "진행 중" : s.results[id] ? "완료" : "필요";
  }
}

type Ctx = { s: State; dispatch: React.Dispatch<Action>; run: (t: Task, p: Params) => Promise<void> };
const C = createContext<Ctx | null>(null);
export const useApp = () => useContext(C)!;

async function request(s: State, task: Task, p: Params): Promise<Result> {
  const src = s.source, rr = refRangeOf(s), rb = refBlobOf(s);
  if (!src?.range || !rr || !rb) throw new Error("원본 오디오와 기준 목소리가 필요합니다");
  const fd = new FormData();
  fd.append("audio", src.blob, "input");
  fd.append("start", String(src.range.start)); fd.append("end", String(src.range.end));
  if (s.reference.mode === "file") fd.append("ref", rb, "ref");
  fd.append("ref_start", String(rr.start)); fd.append("ref_end", String(rr.end));
  fd.append("mode", task); fd.append("steps", String(p.steps)); fd.append("strength", String(p.strength));
  const r = await fetch("/api/process", { method: "POST", body: fd });
  if (!r.ok) {
    let m = r.statusText;
    try { const j = await r.json(); m = typeof j.detail === "string" ? j.detail : JSON.stringify(j.detail); } catch { /* keep statusText */ }
    throw new Error(`${r.status}: ${m}`);
  }
  const blob = await r.blob();
  return { blob, url: URL.createObjectURL(blob), origUrl: URL.createObjectURL(src.blob), procStart: src.range.start, params: p, createdAt: Date.now() };
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [s, dispatch] = useReducer(reducer, initial);
  const ref = useRef(s); ref.current = s;
  const { notify } = useToast();
  const busy = useRef(false); // the server runs one request at a time (global lock)
  const run = useCallback(async (task: Task, p: Params) => {
    if (busy.current) return;
    busy.current = true;
    dispatch({ type: "start", task });
    const src = ref.current.source?.blob;
    try {
      const result = await request(ref.current, task, p);
      if (ref.current.source?.blob !== src) { URL.revokeObjectURL(result.url); URL.revokeObjectURL(result.origUrl); dispatch({ type: "fail", task, message: "원본 오디오가 바뀌어 결과를 버렸습니다" }); }
      else { dispatch({ type: "done", task, result }); notify({ title: `${TASK_LABEL[task]} 완료`, tone: "success", timer: "circle" }); }
    }
    catch (e) { dispatch({ type: "fail", task, message: (e as Error).message }); notify({ title: `${TASK_LABEL[task]} 실패`, tone: "error" }); }
    finally { busy.current = false; }
  }, [notify]);
  const v = useMemo(() => ({ s, dispatch, run }), [s, run]);
  return <C.Provider value={v}>{children}</C.Provider>;
}
