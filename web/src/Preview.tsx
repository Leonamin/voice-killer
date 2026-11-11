import { useEffect, useRef, useState } from "react";
import { Alert, Button } from "./ui/components";
import { QueueNote } from "./Queue";
import { Waveform } from "./Waveform";
import { request, useApp, type Params, type Range, type Result } from "./state";

const SECONDS = 3;

/** Short try-out of the current settings on a 3-second box the user drags over the source waveform. Nothing here is the final result. */
export function Preview({ params, label, isDisabled }: { params: Params; label: string; isDisabled: boolean }) {
  const { s } = useApp();
  const src = s.source!;
  const [pos, setPos] = useState<Range>({ start: src.range?.start ?? 0, end: (src.range?.start ?? 0) + SECONDS });
  const [made, setMade] = useState<{ res: Result; key: string; label: string; range: Range } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [playing, setPlaying] = useState<"A" | "B" | null>(null);
  const orig = useRef<HTMLAudioElement>(null), out = useRef<HTMLAudioElement>(null);
  const free = (r: Result | undefined) => { if (r) { URL.revokeObjectURL(r.url); URL.revokeObjectURL(r.origUrl); } };
  const madeRef = useRef(made); madeRef.current = made;
  useEffect(() => () => free(madeRef.current?.res), []);
  useEffect(() => { free(madeRef.current?.res); setMade(null); }, [src.blob]);

  const key = `${label}|${pos.start.toFixed(2)}`;
  const isStale = !!made && made.key !== key;

  async function make() {
    setIsLoading(true); setError("");
    try {
      const range = { ...pos };
      const res = await request(s, params, range);
      free(made?.res); setMade({ res, key, label, range }); setPlaying(null);
    } catch (e) { setError((e as Error).message); }
    finally { setIsLoading(false); }
  }

  function play(side: "A" | "B") {
    const a = orig.current, b = out.current;
    if (!a || !b || !made) return;
    a.pause(); b.pause();
    if (playing === side) { setPlaying(null); return; }
    setPlaying(side);
    if (side === "A") { a.currentTime = made.range.start; void a.play(); } else { b.currentTime = 0; void b.play(); }
  }

  return (
    <section className="vk-preview" aria-labelledby="preview-title">
      <h2 id="preview-title" className="vk-title">3초 미리듣기</h2>
      <Waveform blob={src.blob} range={pos} kind="preview" label="미리듣기 3초" note={`${pos.start.toFixed(2)}초 – ${pos.end.toFixed(2)}초`}
        onRange={(r) => setPos({ start: r.start, end: r.end })} />
      <div className="vk-row">
        <Button variant="secondary" isLoading={isLoading} disabled={isDisabled} onClick={make}>{made ? "다시 만들기" : "미리듣기 만들기"}</Button>
        {made && <>
          <Button variant="secondary" aria-pressed={playing === "A"} disabled={isStale} onClick={() => play("A")}>{playing === "A" ? "⏸ 원본 듣기" : "▶ 원본 듣기"}</Button>
          <Button variant="secondary" aria-pressed={playing === "B"} disabled={isStale} onClick={() => play("B")}>{playing === "B" ? "⏸ 결과 듣기" : "▶ 결과 듣기"}</Button>
        </>}
      </div>
      {isLoading && <QueueNote />}
      {error && <Alert tone="danger" title="미리듣기 오류">{error}</Alert>}
      {made && !isStale && <p className="vk-muted" style={{ margin: 0 }}>{made.label}로 만든 3초입니다.</p>}
      {isStale && <p className="vk-stale" style={{ margin: 0 }}>설정이나 위치가 바뀌었습니다. 다시 만들어 보세요. (지금 결과: {made!.label})</p>}
      {made && <>
        <audio ref={orig} src={made.res.origUrl} hidden onTimeUpdate={() => { const a = orig.current!; if (playing === "A" && a.currentTime >= made.range.end) { a.pause(); setPlaying(null); } }} />
        <audio ref={out} src={made.res.url} hidden onEnded={() => setPlaying(null)} />
      </>}
    </section>
  );
}
