import { useToast } from "./ui/components";
import { createContext, useCallback, useContext, useMemo, useReducer, useRef, type ReactNode } from "react";

export type Range = { start: number; end: number };
export type NodeId = "source" | "reference" | "adjust";
export type Status = "필요" | "진행 중" | "완료";
// strength: 1 = reduce fully, 0 = unchanged, negative = boost (server accepts [-4, 1])
export type Params = { strength: number; shouldKeepTarget: boolean; maskPower: number };
export type Result = { blob: Blob; url: string; origUrl: string; procStart: number; params: Params; createdAt: number };
export type Clip = { blob: Blob; name: string; duration: number; range: Range | null };

type State = {
  source: Clip | null;
  reference: { mode: "same" | "file"; sameRange: Range | null; file: Clip | null };
  result: Result | null;
  isRunning: boolean;
  error: string;
};
type Action =
  | { type: "source"; blob: Blob; name: string }
  | { type: "sourceReady"; duration: number }
  | { type: "sourceRange"; range: Range }
  | { type: "refMode"; mode: "same" | "file" }
  | { type: "refFile"; blob: Blob; name: string }
  | { type: "refFileReady"; duration: number }
  | { type: "refRange"; range: Range }
  | { type: "start" }
  | { type: "done"; result: Result }
  | { type: "fail"; message: string };

export const ADJUST_LABEL = "목소리 크기 조절";
const initial: State = { source: null, reference: { mode: "same", sameRange: null, file: null }, result: null, isRunning: false, error: "" };
const REF_DEFAULT = 7; // seconds
const revoke = (r?: Result) => r && (URL.revokeObjectURL(r.url), URL.revokeObjectURL(r.origUrl));

function reducer(s: State, a: Action): State {
  switch (a.type) {
    case "source":
      revoke(s.result ?? undefined); // the result belongs to the old source
      return { ...s, source: { blob: a.blob, name: a.name, duration: 0, range: null }, reference: { ...s.reference, sameRange: null }, result: null, error: "" };
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
    case "start":
      return { ...s, isRunning: true, error: "" };
    case "done":
      revoke(s.result ?? undefined);
      return { ...s, isRunning: false, result: a.result };
    case "fail":
      return { ...s, isRunning: false, error: a.message };
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
    case "adjust": return s.isRunning ? "진행 중" : s.result ? "완료" : "필요";
  }
}

type Ctx = { s: State; dispatch: React.Dispatch<Action>; run: (p: Params) => Promise<void> };
const C = createContext<Ctx | null>(null);
export const useApp = () => useContext(C)!;

/** `range` overrides the 처리 구간 (used by the 3-second preview). */
export async function request(s: State, p: Params, range?: Range): Promise<Result> {
  const src = s.source, rr = refRangeOf(s), rb = refBlobOf(s), pr = range ?? src?.range;
  if (!src || !pr || !rr || !rb) throw new Error("원본 오디오와 기준 목소리가 필요합니다");
  const fd = new FormData();
  fd.append("audio", src.blob, "input");
  fd.append("start", String(pr.start)); fd.append("end", String(pr.end));
  if (s.reference.mode === "file") fd.append("ref", rb, "ref");
  fd.append("ref_start", String(rr.start)); fd.append("ref_end", String(rr.end));
  fd.append("strength", String(p.strength));
  fd.append("keep", String(p.shouldKeepTarget));
  fd.append("mask_power", String(p.maskPower));
  const r = await fetch("/api/process", { method: "POST", body: fd });
  if (!r.ok) {
    let m = r.statusText;
    try { const j = await r.json(); m = typeof j.detail === "string" ? j.detail : JSON.stringify(j.detail); } catch { /* keep statusText */ }
    throw new Error(`${r.status}: ${m}`);
  }
  const blob = await r.blob();
  return { blob, url: URL.createObjectURL(blob), origUrl: URL.createObjectURL(src.blob), procStart: pr.start, params: p, createdAt: Date.now() };
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [s, dispatch] = useReducer(reducer, initial);
  const ref = useRef(s); ref.current = s;
  const { notify } = useToast();
  const isBusy = useRef(false); // the server runs one request at a time (global lock)
  const run = useCallback(async (p: Params) => {
    if (isBusy.current) return;
    isBusy.current = true;
    dispatch({ type: "start" });
    const src = ref.current.source?.blob;
    try {
      const result = await request(ref.current, p);
      if (ref.current.source?.blob !== src) { URL.revokeObjectURL(result.url); URL.revokeObjectURL(result.origUrl); dispatch({ type: "fail", message: "원본 오디오가 바뀌어 결과를 버렸습니다" }); }
      else { dispatch({ type: "done", result }); notify({ title: `${ADJUST_LABEL} 완료`, tone: "success", timer: "circle" }); }
    }
    catch (e) { dispatch({ type: "fail", message: (e as Error).message }); notify({ title: `${ADJUST_LABEL} 실패`, tone: "error" }); }
    finally { isBusy.current = false; }
  }, [notify]);
  const v = useMemo(() => ({ s, dispatch, run }), [s, run]);
  return <C.Provider value={v}>{children}</C.Provider>;
}
