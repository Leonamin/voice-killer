import { useEffect, useRef, useState, type MutableRefObject, type ReactNode } from "react";
import WaveSurfer from "wavesurfer.js";
import RegionsPlugin, { type Region } from "wavesurfer.js/dist/plugins/regions.esm.js";
import { Alert, Button } from "./ui/components";
import type { Range } from "./state";

const tok = (n: string) => getComputedStyle(document.documentElement).getPropertyValue(n).trim();

const clock = (t: number) => `${Math.floor(t / 60)}:${(t % 60).toFixed(3).padStart(6, "0")}`;

/** One draggable region over a waveform, with play controls, a live clock and a 0-300% volume. `range` is read only at creation; edits flow out through onRange.
 *  kind "result" shows the bare waveform (no region); `wsRef` exposes the player to the caller. */
export function Waveform({ blob, range, initial, kind, label, note, onReady, onRange, wsRef }: {
  blob: Blob; range?: Range | null; initial?: (duration: number) => Range; kind: "process" | "reference" | "result"; label: string; note?: ReactNode;
  onReady?: (duration: number) => void; onRange?: (r: Range) => void; wsRef?: MutableRefObject<WaveSurfer | null>;
}) {
  const box = useRef<HTMLDivElement>(null);
  const latest = useRef({ range, initial, onReady, onRange }); latest.current = { range, initial, onReady, onRange };
  const inst = useRef<{ ws: WaveSurfer; region: Region | null } | null>(null);
  const stopAt = useRef<number | null>(null); // region end while playing a position inside the region
  const [error, setError] = useState("");
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(100);
  const clockEl = useRef<HTMLSpanElement>(null), gain = useRef<GainNode | null>(null), volumeRef = useRef(100);
  const show = (t: number, d: number) => { if (clockEl.current) clockEl.current.textContent = `${clock(t)} / ${clock(d)}`; };

  useEffect(() => {
    setError("");
    const regions = RegionsPlugin.create(), url = URL.createObjectURL(blob);
    const ws = WaveSurfer.create({
      container: box.current!, height: 80, url, plugins: [regions],
      waveColor: tok("--vk-text-muted"), progressColor: tok("--vk-text"), cursorColor: tok("--vk-live"),
    });
    const me = (inst.current = { ws, region: null as Region | null });
    if (wsRef) wsRef.current = ws;
    // an <audio> element tops out at 100%; route it through a GainNode to go to 300%
    const ac = new AudioContext(), g = gain.current = ac.createGain();
    g.gain.value = volumeRef.current / 100;
    ac.createMediaElementSource(ws.getMediaElement()).connect(g).connect(ac.destination);
    ws.on("play", () => void ac.resume());
    ws.on("error", (e) => setError("오디오를 해독할 수 없습니다: " + e.message));
    ws.on("ready", (d) => {
      show(0, d);
      if (kind !== "result") {
        const r = latest.current.range ?? latest.current.initial!(d);
        const c = kind === "process" ? "--vk-primary" : "--vk-live";
        me.region = regions.addRegion({ start: r.start, end: Math.min(r.end, d), content: label, drag: true, resize: true, color: `color-mix(in srgb, var(${c}) 35%, transparent)` });
      }
      latest.current.onReady?.(d);
    });
    regions.on("region-updated", (r) => { if (stopAt.current !== null) stopAt.current = r.end; latest.current.onRange?.({ start: r.start, end: r.end }); });
    // the region covers the waveform, so it swallows the click that would seek
    regions.on("region-clicked", (_r, e) => {
      const b = ws.getWrapper().getBoundingClientRect();
      ws.setTime(Math.min(Math.max((e.clientX - b.left) / b.width, 0), 1) * ws.getDuration());
    });
    ws.on("play", () => setIsPlaying(true));
    ws.on("pause", () => setIsPlaying(false));
    ws.on("timeupdate", (t) => {
      show(t, ws.getDuration());
      if (stopAt.current === null || t < stopAt.current) return;
      stopAt.current = null; ws.pause(); ws.setTime(me.region?.start ?? 0); // ready to replay the region
    });
    return () => { if (inst.current === me) inst.current = null; if (wsRef?.current === ws) wsRef.current = null; ws.destroy(); void ac.close(); URL.revokeObjectURL(url); };
  }, [blob, kind, label]);

  function toggle() {
    const i = inst.current;
    if (!i) return;
    if (i.ws.isPlaying()) { i.ws.pause(); return; }
    const t = i.ws.getCurrentTime(), r = i.region;
    stopAt.current = r && t >= r.start && t < r.end ? r.end : null; // ponytail: from outside the region, plays to the end of the file
    void i.ws.play();
  }
  function restart() {
    const i = inst.current;
    if (!i?.region) return;
    stopAt.current = i.region.end;
    i.ws.setTime(i.region.start);
    void i.ws.play();
  }

  function changeVolume(v: number) { setVolume(v); volumeRef.current = v; if (gain.current) gain.current.gain.value = v / 100; }

  return (
    <>
      <div ref={box} className={`vk-wave vk-wave-${kind}`} role="img" aria-label={`${label} 파형`} />
      {error && <Alert tone="danger" title="파형 오류">{error}</Alert>}
      <div className="vk-row">
        <Button variant="secondary" className="vk-play" onClick={toggle}>{isPlaying ? "⏸ 일시정지" : "▶ 재생"}</Button>
        {kind !== "result" && <Button variant="secondary" onClick={restart}>⏮ {label} 처음부터</Button>}
        <span ref={clockEl} className="vk-clock" aria-label="재생 위치">0:00.000 / 0:00.000</span>
        {note && <span className="vk-muted">{note}</span>}
      </div>
      <div className="vk-row vk-volume">
        <label htmlFor={`vol-${kind}`}>음량 <output className="vk-metric" style={{ fontSize: "inherit" }}>{volume}%</output></label>
        <input id={`vol-${kind}`} type="range" min={0} max={300} step={5} value={volume} onChange={(e) => changeVolume(+e.target.value)} />
      </div>
    </>
  );
}
