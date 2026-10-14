import { useCallback, useEffect, useRef, useState } from "react";
import { Alert, Button, RadioGroup, Select, Switch, TextField } from "./ui/components";
import { go, labelOf } from "./App";
import { refBlobOf, refRangeOf, statusOf, useApp, type NodeId } from "./state";

const SR = 16000;
// 16 kHz capture: posts 100 ms chunks. Inline so no extra file is served.
const WORKLET = `registerProcessor("cap", class extends AudioWorkletProcessor {
  constructor() { super(); this.b = new Float32Array(1600); this.n = 0; }
  process(inp) {
    const c = inp[0][0]; if (!c) return true;
    for (let i = 0; i < c.length; i++) { this.b[this.n++] = c[i]; if (this.n === 1600) { this.port.postMessage(this.b.slice()); this.n = 0; } }
    return true;
  }
});`;

type Sess = {
  block: number; rtts: number[]; sent: number[]; nextTime: number; isStopped: boolean;
  ctx?: AudioContext; ws?: WebSocket; stream?: MediaStream; src?: AudioBufferSourceNode; node?: AudioWorkletNode; url?: string;
};
type Stats = { block: number; n: number; avg: number; max: number; base: number; out: number };

const cat = (parts: Float32Array[]) => { const o = new Float32Array(parts.reduce((a, p) => a + p.length, 0)); let i = 0; for (const p of parts) { o.set(p, i); i += p.length; } return o; };
async function decode16(blob: Blob, ctx: AudioContext, start: number, end: number) {
  const b = await ctx.decodeAudioData(await blob.arrayBuffer()), m = new Float32Array(b.length); // resamples to ctx rate (16 kHz)
  for (let c = 0; c < b.numberOfChannels; c++) { const d = b.getChannelData(c); for (let i = 0; i < m.length; i++) m[i] += d[i] / b.numberOfChannels; }
  return m.slice(Math.round(start * SR), Math.round(end * SR));
}
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export function Live() {
  const { s, dispatch } = useApp();
  const [enrollSrc, setEnrollSrc] = useState("ref"), [inSrc, setInSrc] = useState("mic");
  const [secs, setSecs] = useState("7"), [block, setBlock] = useState("1"), [isOrig, setIsOrig] = useState(false);
  const [isRunning, setIsRunning] = useState(false), [status, setStatus] = useState(""), [error, setError] = useState("");
  const [stats, setStats] = useState<Stats | null>(null);
  const cur = useRef<Sess | null>(null);
  const ctxRef = useRef(s); ctxRef.current = s; // latest app state for start()

  const stop = useCallback((msg?: string) => {
    const x = cur.current;
    if (!x) return;
    cur.current = null; x.isStopped = true;
    try { x.ws?.close(); } catch { /* already closed */ }
    x.stream?.getTracks().forEach((t) => t.stop());
    try { x.src?.stop(); } catch { /* not started */ }
    x.node?.disconnect();
    if (x.url) URL.revokeObjectURL(x.url);
    void x.ctx?.close();
    setIsRunning(false); setStatus(msg ?? "정지됨");
    dispatch({ type: "liveRunning", isRunning: false });
  }, [dispatch]);
  useEffect(() => () => stop(), [stop]); // navigating away ends the session

  const fail = useCallback((e: unknown) => { setError(e instanceof Error ? e.message : String(e)); stop("오류"); }, [stop]);

  async function start() {
    if (cur.current) return; // block duplicate start
    const st = ctxRef.current, srcClip = st.source, rb = refBlobOf(st), rr = refRangeOf(st);
    setError(""); setStats(null);
    const x: Sess = { block: +block, rtts: [], sent: [], nextTime: 0, isStopped: false };
    cur.current = x; setIsRunning(true); setStatus("준비 중…");
    dispatch({ type: "liveRunning", isRunning: true });
    const alive = () => !x.isStopped;
    try {
      const ctx = x.ctx = new AudioContext({ sampleRate: SR });
      await ctx.resume();
      let pending: Float32Array[] = [], plen = 0, onChunk: (() => void) | null = null, enroll: Float32Array;
      if (enrollSrc === "mic" || inSrc === "mic")
        x.stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } });
      if (!alive()) { x.stream?.getTracks().forEach((t) => t.stop()); return; }
      let fileSrc: AudioBufferSourceNode | undefined;
      if (inSrc === "file") {
        const d = await decode16(srcClip!.blob, ctx, srcClip!.range!.start, srcClip!.range!.end), ab = ctx.createBuffer(1, d.length, SR);
        ab.copyToChannel(new Float32Array(d), 0); fileSrc = x.src = ctx.createBufferSource(); fileSrc.buffer = ab;
      }
      x.url = URL.createObjectURL(new Blob([WORKLET], { type: "text/javascript" }));
      await ctx.audioWorklet.addModule(x.url);
      if (!alive()) return;
      const node = x.node = new AudioWorkletNode(ctx, "cap"), zero = ctx.createGain(); zero.gain.value = 0;
      node.connect(zero).connect(ctx.destination);
      if (x.stream) ctx.createMediaStreamSource(x.stream).connect(node);
      if (fileSrc) { fileSrc.connect(node); if (isOrig) fileSrc.connect(ctx.destination); }
      node.port.onmessage = (e) => { pending.push(e.data); plen += e.data.length; onChunk?.(); };
      if (enrollSrc === "ref") enroll = await decode16(rb ?? srcClip!.blob, ctx, rr!.start, rr!.end);
      else {
        const sec = +secs, need = Math.round(sec * SR);
        if (!(Number.isInteger(sec) && sec >= 1 && sec <= 30)) throw new Error("녹음 시간은 1~30초입니다");
        for (let t = sec; t > 0 && alive(); t--) { setStatus(`등록 음성 녹음 중… ${t}초`); await sleep(1000); }
        if (!alive()) return;
        enroll = cat(pending).slice(0, need); pending = []; plen = 0;
      }
      if (!alive()) return;
      if (enroll.length > 30 * SR || enroll.length < SR) throw new Error("등록 음성은 1~30초여야 합니다");
      const ws = x.ws = new WebSocket((location.protocol === "https:" ? "wss://" : "ws://") + location.host + "/ws/stream");
      ws.binaryType = "arraybuffer";
      await new Promise<void>((res, rej) => {
        ws.onopen = () => { ws.send(JSON.stringify({ enroll_seconds: enroll.length / SR })); ws.send(enroll.buffer as ArrayBuffer); setStatus("서버에서 모델 준비 중…"); };
        ws.onmessage = (e) => { try { const j = JSON.parse(e.data); j.ready ? res() : rej(new Error(j.error || "서버 응답 오류")); } catch (err) { rej(err); } };
        ws.onerror = () => rej(new Error("연결 실패")); ws.onclose = () => rej(new Error("연결이 닫혔습니다"));
      });
      if (!alive()) return;
      ws.onerror = null;
      ws.onclose = () => { if (alive()) fail(new Error("서버 연결이 끊어졌습니다")); };
      ws.onmessage = (e) => {
        if (!alive()) return;
        if (typeof e.data === "string") { try { return fail(new Error(JSON.parse(e.data).error)); } catch { return fail(new Error(e.data)); } }
        x.rtts.push(performance.now() - x.sent.shift()!);
        const f = new Float32Array(e.data), ab = ctx.createBuffer(1, f.length, SR), src = ctx.createBufferSource();
        ab.copyToChannel(f, 0); src.buffer = ab; src.connect(ctx.destination);
        x.nextTime = Math.max(x.nextTime, ctx.currentTime); // never schedule in the past (underrun = gap)
        src.start(x.nextTime); x.nextTime += ab.duration;
        const r = x.rtts;
        setStats({ block: x.block, n: r.length, avg: r.reduce((a, b) => a + b, 0) / r.length, max: Math.max(...r), base: ctx.baseLatency || 0, out: ctx.outputLatency || 0 });
        dispatch({ type: "liveBlock" });
      };
      const N = x.block * SR;
      pending = []; plen = 0;
      onChunk = () => { if (plen < N) return; const all = cat(pending); x.sent.push(performance.now()); ws.send(all.slice(0, N).buffer); pending = [all.slice(N)]; plen = all.length - N; };
      fileSrc?.start(); // mic: chunks already flowing; file: audio reaches the worklet in real time
      setStatus("실행 중"); setStats({ block: x.block, n: 0, avg: 0, max: 0, base: ctx.baseLatency || 0, out: ctx.outputLatency || 0 });
    } catch (e) { if (!x.isStopped) fail(e); }
  }

  const missing: NodeId[] = [];
  if (inSrc === "file" && statusOf(s, "source") !== "완료") missing.push("source");
  if (enrollSrc === "ref" && statusOf(s, "reference") !== "완료") missing.push("reference");
  const ms = (v: number) => `${v.toFixed(0)} ms`;

  return (
    <section className="vk-panel" aria-labelledby="panel-title">
      <header>
        <h1 id="panel-title" className="vk-display">실시간 {isRunning && <span className="vk-live-dot" role="img" aria-label="실행 중" />}</h1>
        <p>마이크나 파일에서 대상 목소리를 실시간으로 제거합니다.</p>
      </header>
      <Alert tone="warning" title="헤드폰을 쓰세요">스피커 되먹임을 막기 위해서입니다. 마이크는 에코 제거, 잡음 억제, 자동 게인을 끄고 받습니다.</Alert>
      <RadioGroup label="등록 음성" value={enrollSrc} onValueChange={setEnrollSrc} isDisabled={isRunning}
        options={[{ value: "ref", label: "참조 구간" }, { value: "mic", label: "마이크로 녹음" }]} />
      {enrollSrc === "mic" && <TextField label="녹음 시간 (초, 1~30)" type="number" min={1} max={30} value={secs} disabled={isRunning} onChange={(e) => setSecs(e.target.value)} />}
      <RadioGroup label="입력" value={inSrc} onValueChange={setInSrc} isDisabled={isRunning}
        options={[{ value: "mic", label: "마이크" }, { value: "file", label: "소스의 처리 구간 (실시간 재생)" }]} />
      <div className="vk-row">
        <Switch label="원본 듣기" isChecked={isOrig} isDisabled={isRunning || inSrc !== "file"} onCheckedChange={setIsOrig} />
        <Select label="블록" value={block} onValueChange={setBlock} isDisabled={isRunning} options={[{ value: "1", label: "1초" }, { value: "2", label: "2초" }]} />
      </div>
      {missing.length > 0 && (
        <Alert tone="neutral" title="먼저 필요한 것이 있습니다"
          action={<div className="vk-row" style={{ marginTop: 8 }}>{missing.map((i) => <Button key={i} variant="secondary" onClick={() => go(i)}>{labelOf(i)} 지정하기</Button>)}</div>}>
          {missing.map(labelOf).join(", ")}이(가) 아직 없습니다.
        </Alert>
      )}
      {error && <Alert tone="danger" title="오류" action={<div style={{ marginTop: 8 }}><Button variant="secondary" onClick={start} disabled={isRunning || missing.length > 0}>다시 시작</Button></div>}>{error}</Alert>}
      <div className="vk-row">
        <Button className="vk-btn-live" disabled={isRunning || missing.length > 0} onClick={start}>시작</Button>
        <Button variant="secondary" disabled={!isRunning} onClick={() => stop()}>정지</Button>
        <span role="status" className="vk-muted">{status}</span>
      </div>
      <div className="vk-tiles">
        <Tile label="블록" value={stats ? `${stats.block} 초` : "-"} />
        <Tile label={`서버 왕복 평균 / 최대${stats?.n ? ` (${stats.n}블록)` : ""}`} value={stats?.n ? `${ms(stats.avg)} / ${ms(stats.max)}` : "-"} />
        <Tile label="AudioContext 지연 (base + output)" value={stats ? `${ms(stats.base * 1000)} + ${ms(stats.out * 1000)}` : "-"} />
        <Tile label="예상 총 지연" value={stats?.n ? ms(stats.block * 1000 + stats.avg + (stats.base + stats.out) * 1000) : "-"} />
      </div>
    </section>
  );
}

const Tile = ({ label, value }: { label: string; value: string }) => (
  <div className="vk-tile"><span className="vk-muted">{label}</span><output className="vk-metric">{value}</output></div>
);
