import { useEffect, useImperativeHandle, useRef, useState, type Ref } from "react";
import WaveSurfer from "wavesurfer.js";
import RegionsPlugin, { type Region } from "wavesurfer.js/dist/plugins/regions.esm.js";
import { Alert } from "./ui/components";
import type { Range } from "./state";

export type WaveHandle = { playRegion: () => void };
const tok = (n: string) => getComputedStyle(document.documentElement).getPropertyValue(n).trim();

/** One draggable region over a waveform. `range` is read only at creation; edits flow out through onRange. */
export function Waveform({ blob, range, initial, kind, label, onReady, onRange, ref }: {
  blob: Blob; range: Range | null; initial: (duration: number) => Range; kind: "process" | "reference"; label: string;
  onReady: (duration: number) => void; onRange: (r: Range) => void; ref?: Ref<WaveHandle>;
}) {
  const box = useRef<HTMLDivElement>(null);
  const latest = useRef({ range, initial, onReady, onRange }); latest.current = { range, initial, onReady, onRange };
  const inst = useRef<{ ws: WaveSurfer; region: Region | null } | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    setError("");
    const regions = RegionsPlugin.create(), url = URL.createObjectURL(blob);
    const ws = WaveSurfer.create({
      container: box.current!, height: 80, url, plugins: [regions],
      waveColor: tok("--vk-text-muted"), progressColor: tok("--vk-text"), cursorColor: tok("--vk-live"),
    });
    const me = (inst.current = { ws, region: null as Region | null });
    ws.on("error", (e) => setError("오디오를 해독할 수 없습니다: " + e.message));
    ws.on("ready", (d) => {
      const r = latest.current.range ?? latest.current.initial(d);
      const c = kind === "process" ? "--vk-primary" : "--vk-live";
      me.region = regions.addRegion({ start: r.start, end: Math.min(r.end, d), content: label, drag: true, resize: true, color: `color-mix(in srgb, var(${c}) 35%, transparent)` });
      latest.current.onReady(d);
    });
    regions.on("region-updated", (r) => latest.current.onRange({ start: r.start, end: r.end }));
    return () => { if (inst.current === me) inst.current = null; ws.destroy(); URL.revokeObjectURL(url); };
  }, [blob, kind, label]);

  useImperativeHandle(ref, () => ({
    playRegion() { // ponytail: same as web.html; replays from region start, stops at end
      const i = inst.current;
      if (!i?.region) return;
      const { ws, region } = i;
      ws.setTime(region.start); ws.play();
      const stop = () => { if (ws.getCurrentTime() >= region.end) { ws.pause(); ws.un("timeupdate", stop); } };
      ws.on("timeupdate", stop);
    },
  }), []);

  return (
    <>
      <div ref={box} className={`vk-wave vk-wave-${kind}`} role="img" aria-label={`${label} 파형`} />
      {error && <Alert tone="danger" title="파형 오류">{error}</Alert>}
    </>
  );
}
