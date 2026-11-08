import { useEffect, useRef, useState, type ReactNode } from "react";
import { Alert, Button, Card, Progress, RadioGroup } from "./ui/components";
import { go, labelOf, NODES, StatusBadge } from "./App";
import { refBlobOf, refRangeOf, statusOf, TASK_LABEL, useApp, type NodeId, type Range, type Result, type Task } from "./state";
import type WaveSurfer from "wavesurfer.js";
import { Waveform } from "./Waveform";
import { Candidates } from "./Candidates";

const fmt = (r: Range | null) => (r ? `${r.start.toFixed(2)}초 – ${r.end.toFixed(2)}초 (${(r.end - r.start).toFixed(2)}초)` : "-");

function Panel({ title, purpose, cta, children }: { title: string; purpose: string; cta?: ReactNode; children: ReactNode }) {
  return (
    <section className="vk-panel" aria-labelledby="panel-title">
      <header><h1 id="panel-title" className="vk-display">{title}</h1><p>{purpose}</p></header>
      {children}
      {cta && <div className="vk-cta">{cta}</div>}
    </section>
  );
}

function Missing({ items }: { items: NodeId[] }) {
  return (
    <Alert tone="neutral" title="먼저 필요한 것이 있습니다"
      action={<div className="vk-row" style={{ marginTop: 8 }}>{items.map((i) => <Button key={i} variant="secondary" onClick={() => go(i)}>{labelOf(i)} 지정하기</Button>)}</div>}>
      {items.map(labelOf).join(", ")}이(가) 아직 없습니다.
    </Alert>
  );
}

const FORMATS = "wav, mp3, mp4, webm 등 오디오·영상 파일을 올릴 수 있습니다.";

function FilePick({ label, onFile }: { label: string; onFile: (f: File) => void }) {
  const input = useRef<HTMLInputElement>(null);
  return (
    <>
      <Button variant="secondary" onClick={() => input.current?.click()}>{label}</Button>
      <input ref={input} className="vk-hidden-input" type="file" accept="audio/*,video/*" aria-label={label} tabIndex={-1}
        onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); e.target.value = ""; }} />
    </>
  );
}

export function Hub() {
  const { s } = useApp();
  const next: [string, NodeId] = statusOf(s, "source") !== "완료" ? ["다음: 원본 오디오 불러오기", "source"]
    : statusOf(s, "reference") !== "완료" ? ["다음: 기준 목소리 지정", "reference"] : ["추천: 목소리 크기 조절 해 보기", "remove"];
  return (
    <Panel title="작업 공간" purpose="원본 오디오와 기준 목소리를 정한 뒤 크기를 조절하세요."
      cta={<Button onClick={() => go(next[1])}>{next[0]}</Button>}>
      <div className="vk-hub">
        {NODES.map((n) => (
          <Card key={n.id} title={<><a className="vk-stretch" href={`#/${n.id}`}>{n.label}</a><StatusBadge status={statusOf(s, n.id)} /></>}>
            <span className="vk-muted">{n.desc}</span>
          </Card>
        ))}
      </div>
    </Panel>
  );
}

export function SourcePanel() {
  const { s, dispatch } = useApp();
  const src = s.source;
  const [error, setError] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const rec = useRef<MediaRecorder | null>(null);
  useEffect(() => () => { rec.current?.stop(); }, []);

  async function toggleRec() {
    if (rec.current) { rec.current.stop(); return; }
    setError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const r = new MediaRecorder(stream), chunks: Blob[] = [];
      rec.current = r;
      r.ondataavailable = (e) => chunks.push(e.data);
      r.onstop = () => {
        stream.getTracks().forEach((t) => t.stop()); rec.current = null; setIsRecording(false);
        dispatch({ type: "source", blob: new Blob(chunks, { type: r.mimeType }), name: "녹음" });
      };
      r.start(); setIsRecording(true);
    } catch (e) { setError("마이크를 사용할 수 없습니다: " + (e as Error).message); }
  }

  return (
    <Panel title="원본 오디오" purpose="처리할 오디오를 올리거나 녹음하고, 결과를 만들 구간을 정합니다."
      cta={<Button onClick={() => go("reference")}>다음: 기준 목소리 지정</Button>}>
      <div className="vk-row">
        <FilePick label="파일 올리기" onFile={(f) => { setError(""); dispatch({ type: "source", blob: f, name: f.name }); }} />
        <Button variant="secondary" onClick={toggleRec}>{isRecording ? "녹음 중지" : "녹음 시작"}</Button>
        {src && <span className="vk-muted">{src.name}</span>}
      </div>
      <p className="vk-muted" style={{ margin: 0 }}>{FORMATS}</p>
      {error && <Alert tone="danger" title="오류">{error}</Alert>}
      {src ? (
        <>
          <Waveform blob={src.blob} range={src.range} initial={(d) => ({ start: 0, end: d })} kind="process" label="처리 구간" note={`처리 구간 ${fmt(src.range)}`}
            onReady={(duration) => dispatch({ type: "sourceReady", duration })} onRange={(range) => dispatch({ type: "sourceRange", range })} />
        </>
      ) : <p className="vk-muted">아직 불러온 오디오가 없습니다.</p>}
    </Panel>
  );
}

export function ReferencePanel() {
  const { s, dispatch } = useApp();
  const { mode, file } = s.reference, blob = refBlobOf(s), range = refRangeOf(s);
  const r = range && range.end - range.start;
  const [pick, setPick] = useState(0); // Waveform reads its region only at creation: a picked candidate remounts it
  return (
    <Panel title="기준 목소리" purpose="대상 목소리가 혼자 말하는 5~10초 구간을 지정합니다."
      cta={<Button onClick={() => go("hub")}>다음: 작업 선택</Button>}>
      <RadioGroup label="기준 목소리 위치" value={mode} onValueChange={(v) => dispatch({ type: "refMode", mode: v as "same" | "file" })}
        options={[{ value: "same", label: "원본 오디오와 같은 파일" }, { value: "file", label: "다른 파일" }]} />
      {mode === "file" && (
        <>
          <div className="vk-row"><FilePick label="기준 목소리 파일 올리기" onFile={(f) => dispatch({ type: "refFile", blob: f, name: f.name })} />{file && <span className="vk-muted">{file.name}</span>}</div>
          <p className="vk-muted" style={{ margin: 0 }}>{FORMATS}</p>
        </>
      )}
      {mode === "same" && !s.source && <Missing items={["source"]} />}
      {mode === "same" && s.source?.range && (
        <Candidates blob={s.source.blob} range={s.source.range} onPick={(rg) => { dispatch({ type: "refRange", range: rg }); setPick((n) => n + 1); }} />
      )}
      {blob && (
        <>
          <Waveform key={`${mode}-${pick}`} blob={blob} range={range} initial={(d) => ({ start: 0, end: Math.min(7, d) })} kind="reference" label="기준 구간" note={`기준 구간 ${fmt(range)}`}
            onReady={(duration) => mode === "file" && dispatch({ type: "refFileReady", duration })} onRange={(rg) => dispatch({ type: "refRange", range: rg })} />
          {r !== null && r < 1 && <Alert tone="warning" title="기준 구간이 너무 짧습니다">최소 1초, 권장 5~10초입니다.</Alert>}
        </>
      )}
    </Panel>
  );
}

function ResultBlock({ res }: { res: Result }) {
  const out = useRef<WaveSurfer | null>(null), orig = useRef<HTMLAudioElement>(null);
  const [side, setSide] = useState<"A" | "B">("A");
  // A/B: original 처리 구간 (A) vs result (B); both play from the same offset within the 처리 구간
  function toggle() {
    const ws = out.current, o = orig.current;
    if (!ws || !o) return;
    const a = side === "A", off = Math.max(0, a ? o.currentTime - res.procStart : ws.getCurrentTime());
    setSide(a ? "B" : "A");
    if (a) { o.pause(); ws.setTime(off); void ws.play(); } else { ws.pause(); o.currentTime = res.procStart + off; void o.play(); } // ponytail: original is not stopped at 처리 구간 end; webm may seek imprecisely
  }
  return (
    <div className="vk-result" aria-label="결과">
      <div className="vk-row"><h2 className="vk-title">결과</h2>
        <span className="vk-muted">{new Date(res.createdAt).toLocaleTimeString("ko-KR")}</span></div>
      <Waveform blob={res.blob} kind="result" label="결과" wsRef={out} />
      <audio ref={orig} src={res.origUrl} hidden />
      <div className="vk-row">
        <Button variant="secondary" aria-pressed={side === "B"} onClick={toggle}>
          {side === "A" ? "원본(A) 재생 중 - 눌러서 결과(B)로 전환" : "결과(B) 재생 중 - 눌러서 원본(A)로 전환"}
        </Button>
        <a className="gc-button gc-button-secondary" href={res.url} download="result.wav">다운로드</a>
      </div>
    </div>
  );
}

// Slider u in [-1, 1]: left = reduce, middle = unchanged, right = boost. Server strength: 1 .. 0 .. -4.
const strengthOf = (u: number) => (u <= 0 ? -u : -4 * u);
// Measured on a controlled mix (wiki gain-sweep): reduce 1 -> -25 dB, boost 1 -> +5.8 dB, boost 4 -> +13.6 dB.
function describe(u: number) {
  const k = strengthOf(u);
  if (k === 0) return "그대로";
  if (k > 0) return k >= 1 ? "최대로 줄임 (약 −25 dB)" : `줄이기 ${Math.round(k * 100)}%`;
  return `키우기 약 +${(20 * Math.log10(1 - k)).toFixed(1)} dB`;
}

export function TaskPanel({ task }: { task: Task }) {
  const { s, run } = useApp();
  const [u, setU] = useState(-1);
  const running = !!s.running[task];
  const res = s.results[task], err = s.errors[task];
  const missing: NodeId[] = [];
  if (statusOf(s, "source") !== "완료") missing.push("source");
  if (statusOf(s, "reference") !== "완료") missing.push("reference");
  const exec = () => run(task, { strength: strengthOf(u) });
  return (
    <Panel title={TASK_LABEL[task]} purpose="기준 목소리와 같은 화자의 목소리 크기를 줄이거나 키웁니다."
      cta={res ? undefined : <Button isLoading={running} disabled={missing.length > 0} onClick={exec}>실행</Button>}>
      {missing.length > 0 && <Missing items={missing} />}
      <div className="vk-field"><label htmlFor="strength">크기 <output className="vk-metric" style={{ fontSize: "inherit" }}>{describe(u)}</output></label>
        <input id="strength" type="range" min={-1} max={1} step={0.05} value={u} onChange={(e) => setU(+e.target.value)} />
        <div className="vk-row" style={{ justifyContent: "space-between" }}><span className="vk-muted">줄이기</span><span className="vk-muted">그대로</span><span className="vk-muted">키우기</span></div></div>
      {u > 0 && <p className="vk-muted" style={{ margin: 0 }}>키우면 대상 목소리와 함께 주변 소리도 조금 커지고, 크게 키우면 소리가 깨질 수 있습니다.</p>}
      {running && <Progress label="처리 중" size="thin" />}
      {err && <Alert tone="danger" title="오류" action={<div style={{ marginTop: 8 }}><Button variant="secondary" disabled={running || missing.length > 0} onClick={exec}>재시도</Button></div>}>{err}</Alert>}
      {res && <ResultBlock key={res.createdAt} res={res} />}
      {res && <div><Button variant="secondary" isLoading={running} disabled={missing.length > 0} onClick={exec}>다시 실행</Button></div>}
    </Panel>
  );
}
