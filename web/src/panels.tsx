import { useEffect, useRef, useState, type ReactNode } from "react";
import { QueueNote } from "./Queue";
import { maskOf } from "./How";
import { Alert, Button, Card, Progress, RadioGroup, Slider } from "./ui/components";
import { go, labelOf, NODES, StatusBadge } from "./App";
import { refBlobOf, refRangeOf, statusOf, ADJUST_LABEL, useApp, type NodeId, type Range, type Result } from "./state";
import type WaveSurfer from "wavesurfer.js";
import { Waveform } from "./Waveform";
import { Candidates } from "./Candidates";
import { describe, strengthOf } from "./strength";

const fmt = (r: Range | null) => (r ? `${r.start.toFixed(2)}초 – ${r.end.toFixed(2)}초 (${(r.end - r.start).toFixed(2)}초)` : "-");

function Panel({ title, purpose, cta, children }: { title: string; purpose?: string; cta?: ReactNode; children: ReactNode }) {
  return (
    <section className="vk-panel" aria-labelledby="panel-title">
      <header><h1 id="panel-title" className="vk-display">{title}</h1>{purpose && <p>{purpose}</p>}</header>
      {children}
      {cta && <div className="vk-cta">{cta}</div>}
    </section>
  );
}

function Missing({ items }: { items: NodeId[] }) {
  return (
    <Alert tone="neutral" title="먼저 필요한 것이 있습니다"
      action={<div className="vk-row" style={{ marginTop: 8 }}>{items.map((i) => <Button key={i} variant="secondary" onClick={() => go(i)}>{labelOf(i)} 지정하기</Button>)}</div>}>
      {(() => { const t = items.map(labelOf).join(", "), c = t.charCodeAt(t.length - 1) - 0xac00; return t + (c >= 0 && c % 28 ? "이" : "가"); })()} 아직 없습니다.
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

/** The whole window accepts a dropped file while `onFile` is set. Returns true while a file is held over the window. */
function usePageDrop(onFile: ((f: File) => void) | null) {
  const [isOver, setIsOver] = useState(false);
  const cb = useRef(onFile);
  cb.current = onFile;
  const isOn = onFile !== null;
  useEffect(() => {
    if (!isOn) return;
    let depth = 0; // dragenter/dragleave also fire for every child element
    const hasFiles = (e: DragEvent) => !!e.dataTransfer?.types.includes("Files");
    const enter = (e: DragEvent) => { if (hasFiles(e)) { depth++; setIsOver(true); } };
    const over = (e: DragEvent) => { if (hasFiles(e)) e.preventDefault(); };
    const leave = (e: DragEvent) => { if (hasFiles(e) && --depth <= 0) { depth = 0; setIsOver(false); } };
    const drop = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      e.preventDefault(); depth = 0; setIsOver(false);
      const f = e.dataTransfer?.files[0];
      if (f) cb.current?.(f);
    };
    window.addEventListener("dragenter", enter); window.addEventListener("dragover", over);
    window.addEventListener("dragleave", leave); window.addEventListener("drop", drop);
    return () => {
      window.removeEventListener("dragenter", enter); window.removeEventListener("dragover", over);
      window.removeEventListener("dragleave", leave); window.removeEventListener("drop", drop);
      setIsOver(false);
    };
  }, [isOn]);
  return isOver;
}

function DropZone({ label, isOver, hasFile }: { label: string; isOver: boolean; hasFile: boolean }) {
  return (
    <>
      {hasFile ? <p className="vk-muted" style={{ margin: 0 }}>{FORMATS}</p>
        : <div className="vk-drop" data-over={isOver}><b>파일을 끌어다 놓기</b><span className="vk-muted">{FORMATS}</span></div>}
      {isOver && <div className="vk-drop-all" aria-hidden="true">{label}</div>}
    </>
  );
}

export function Hub() {
  const { s } = useApp();
  const next: [string, NodeId] = statusOf(s, "source") !== "완료" ? ["다음: 원본 오디오 불러오기", "source"]
    : statusOf(s, "reference") !== "완료" ? ["다음: 기준 목소리 지정", "reference"] : ["추천: 목소리 크기 조절 해 보기", "adjust"];
  return (
    <Panel title="작업 공간"
      cta={<Button onClick={() => go(next[1])}>{next[0]}</Button>}>
      <div className="vk-hub">
        {NODES.map((n) => (
          <Card key={n.id} title={<><a className="vk-stretch" href={`#/${n.id}`}>{n.label}</a><StatusBadge status={statusOf(s, n.id)} /></>}>{null}</Card>
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
  const load = (f: File) => { setError(""); dispatch({ type: "source", blob: f, name: f.name }); };
  const isOver = usePageDrop(load);

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
    <Panel title="원본 오디오"
      cta={<Button onClick={() => go("reference")}>다음: 기준 목소리 지정</Button>}>
      <div className="vk-row">
        <FilePick label="파일 올리기" onFile={load} />
        <Button variant="secondary" onClick={toggleRec}>{isRecording ? "녹음 중지" : "녹음 시작"}</Button>
        {src && <span className="vk-muted">{src.name}</span>}
      </div>
      <DropZone label="원본 오디오로 올리기" isOver={isOver} hasFile={!!src} />
      {error &&<Alert tone="danger" title="오류">{error}</Alert>}
      {src ? (
        <>
          <Waveform blob={src.blob} range={src.range} initial={(d) => ({ start: 0, end: d })} kind="process" label="처리 구간" note={`처리 구간 ${fmt(src.range)}`}
            onReady={(duration) => dispatch({ type: "sourceReady", duration })} onRange={(range) => dispatch({ type: "sourceRange", range })} />
        </>
      ) : null}
    </Panel>
  );
}

export function ReferencePanel() {
  const { s, dispatch } = useApp();
  const { mode, file } = s.reference, blob = refBlobOf(s), range = refRangeOf(s);
  const r = range && range.end - range.start;
  const [pick, setPick] = useState(0); // Waveform reads its region only at creation: a picked candidate remounts it
  const loadRef = (f: File) => dispatch({ type: "refFile", blob: f, name: f.name });
  const isOver = usePageDrop(mode === "file" ? loadRef : null);
  return (
    <Panel title="기준 목소리" purpose="대상 목소리가 혼자 말하는 5~10초 구간을 지정합니다."
      cta={<Button onClick={() => go("hub")}>다음: 작업 선택</Button>}>
      <RadioGroup label="기준 목소리 위치" value={mode} onValueChange={(v) => dispatch({ type: "refMode", mode: v as "same" | "file" })}
        options={[{ value: "same", label: "원본 오디오와 같은 파일" }, { value: "file", label: "다른 파일" }]} />
      {mode === "file" && (
        <>
          <div className="vk-row"><FilePick label="기준 목소리 파일 올리기" onFile={loadRef} />{file && <span className="vk-muted">{file.name}</span>}</div>
          <DropZone label="기준 목소리 파일로 올리기" isOver={isOver} hasFile={!!file} />
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

/** Live example for the p slider: how much a half-mixed cell counts as the target voice. Same formula as the server (no hard cut below 0.65). */
function MaskExample({ p }: { p: number }) {
  const rows = [{ share: 0.6, text: "대상 목소리 60%, 주변 소리 40%가 섞인 칸" }, { share: 0.4, text: "대상 목소리 40%, 주변 소리 60%가 섞인 칸" }];
  return (
    <div className="vk-mask-ex" aria-label="p 예시">
      {rows.map((r) => {
        const m = Math.round(maskOf(r.share, p) * 100);
        return (
          <div key={r.share}>
            <div className="vk-mask-ex-row"><span>{r.text}</span><strong>대상으로 {m}% 취급</strong></div>
            <div className="vk-mask-ex-bar" aria-hidden="true"><i style={{ width: `${m}%` }} /></div>
          </div>
        );
      })}
      <p className="vk-muted" style={{ margin: 0 }}>p를 올리면 애매한 칸도 한쪽으로 확실히 갈립니다. 1이면 섞인 비율 그대로 취급합니다. <a href="#/how">원리 탭의 그림</a>에서 칸별로 볼 수 있습니다.</p>
    </div>
  );
}

export function AdjustPanel() {
  const { s, run } = useApp();
  const [u, setU] = useState(0); // starts at the centre = unchanged
  const { isRunning, result: res, error: err } = s;
  const missing: NodeId[] = [];
  if (statusOf(s, "source") !== "완료") missing.push("source");
  if (statusOf(s, "reference") !== "완료") missing.push("reference");
  const [who, setWho] = useState<"target" | "rest">("target"); // rest = keep the reference voice, reduce everything else
  const [p, setP] = useState(4); // mask sharpness; server default 4
  const shouldKeepTarget = who === "rest";
  const exec = () => run({ strength: shouldKeepTarget ? -u : strengthOf(u), shouldKeepTarget, maskPower: p });
  return (
    <Panel title={ADJUST_LABEL}
      cta={res ? undefined : <Button isLoading={isRunning} disabled={missing.length > 0 || u === 0} onClick={exec}>실행</Button>}>
      {missing.length > 0 && <Missing items={missing} />}
      <RadioGroup label="조절할 소리" value={who} onValueChange={(v) => { setWho(v as "target" | "rest"); setU(0); }}
        options={[{ value: "target", label: "기준 목소리를 줄이거나 키움" }, { value: "rest", label: "기준 목소리만 남기고 나머지를 줄임" }]} />
      <div className={shouldKeepTarget ? "vk-reduce-only" : "vk-centered"} data-side={u < 0 ? "reduce" : u > 0 ? "boost" : undefined}>
        <Slider label="크기" min={-1} max={shouldKeepTarget ? 0 : 1} step={0.05} value={u} onValueChange={setU}
          valueText={shouldKeepTarget ? (u === 0 ? "그대로" : `나머지 줄이기 ${Math.round(-u * 100)}%`) : describe(u)}
          description={shouldKeepTarget ? "왼쪽으로 밀수록 기준 목소리를 뺀 나머지 소리가 줄어듭니다." : "왼쪽으로 밀면 줄이고, 가운데는 그대로, 오른쪽으로 밀면 키웁니다."} />
      </div>
      <Slider label="마스크 날카로움 (p)" min={1} max={8} step={1} value={p} onValueChange={setP} valueText={String(p)}
        description="한 칸에 대상과 주변 소리가 섞여 있을 때, 그 칸을 대상으로 볼지 정하는 기준의 날카로움입니다. 기본 4." />
      <MaskExample p={p} />
      {!shouldKeepTarget && u > 0 &&<p className="vk-muted" style={{ margin: 0 }}>키우면 대상 목소리와 함께 주변 소리도 조금 커지고, 크게 키우면 소리가 깨질 수 있습니다.</p>}
      {isRunning && <><Progress label="처리 중" size="thin" /><QueueNote /></>}
      {err && <Alert tone="danger" title="오류" action={<div style={{ marginTop: 8 }}><Button variant="secondary" disabled={isRunning || missing.length > 0} onClick={exec}>재시도</Button></div>}>{err}</Alert>}
      {res && <ResultBlock key={res.createdAt} res={res} />}
      {res && <div><Button variant="secondary" isLoading={isRunning} disabled={missing.length > 0} onClick={exec}>다시 실행</Button></div>}
    </Panel>
  );
}
