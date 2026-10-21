import { useEffect, useRef, useState } from "react";
import { Alert, Button, Card } from "./ui/components";
import type { Range } from "./state";

type Found = { speakers: { id: number; total: number; candidates: Range[] }[]; overlaps: Range[] };
const cache = new WeakMap<Blob, { key: string; found: Found }>(); // survives leaving the panel; a new source Blob drops it

/** Add-on above the reference picker: finds single-speaker spans to audition. Picking one only sets the reference range. */
export function Candidates({ blob, range, onPick }: { blob: Blob; range: Range; onPick: (r: Range) => void }) {
  const key = `${range.start}-${range.end}`, hit = cache.get(blob);
  const [found, setFound] = useState<Found | null>(hit?.key === key ? hit.found : null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [playing, setPlaying] = useState<Range | null>(null);
  const audio = useRef<HTMLAudioElement>(null), stopAt = useRef(0);
  useEffect(() => { const u = URL.createObjectURL(blob); audio.current!.src = u; return () => URL.revokeObjectURL(u); }, [blob]);
  useEffect(() => { const h = cache.get(blob); setFound(h?.key === key ? h.found : null); }, [blob, key]);

  async function search() {
    setIsLoading(true); setError("");
    try {
      const fd = new FormData();
      fd.append("audio", blob, "input"); fd.append("start", String(range.start)); fd.append("end", String(range.end));
      const r = await fetch("/api/candidates", { method: "POST", body: fd });
      if (!r.ok) {
        let m = r.statusText;
        try { const j = await r.json(); m = typeof j.detail === "string" ? j.detail : JSON.stringify(j.detail); } catch { /* keep statusText */ }
        throw new Error(m);
      }
      const f = (await r.json()) as Found;
      cache.set(blob, { key, found: f }); setFound(f);
    } catch (e) { setError((e as Error).message); }
    finally { setIsLoading(false); }
  }

  function play(c: Range) {
    const a = audio.current!;
    if (playing === c) { a.pause(); setPlaying(null); return; }
    stopAt.current = c.end; a.currentTime = c.start; void a.play(); setPlaying(c);
  }

  return (
    <Card title="기준 목소리 후보 찾기">
      <p className="vk-muted" style={{ margin: 0 }}>처리 구간에서 한 사람만 말하는 구간을 자동으로 찾아 들려 줍니다. 10분 분량에 1분 가까이 걸릴 수 있고, 고르지 않아도 아래에서 직접 지정할 수 있습니다.</p>
      <div className="vk-row"><Button variant="secondary" isLoading={isLoading} onClick={search}>{found ? "다시 찾기" : "후보 찾기"}</Button></div>
      {error && <Alert tone="danger" title="후보를 찾지 못했습니다">{error}</Alert>}
      {found && found.speakers.length === 0 && <Alert tone="warning" title="후보 없음">한 사람만 말하는 구간(2초 이상)을 찾지 못했습니다. 아래에서 직접 지정하세요.</Alert>}
      {found?.speakers.map((sp) => (
        <div key={sp.id} className="vk-field">
          <strong>목소리 {sp.id}</strong> <span className="vk-muted">혼자 말한 구간 합계 {sp.total.toFixed(0)}초</span>
          {sp.candidates.map((c) => (
            <div key={c.start} className="vk-row">
              <span className="vk-clock">{c.start.toFixed(1)}초 – {c.end.toFixed(1)}초</span>
              <Button variant="secondary" onClick={() => play(c)}>{playing === c ? "⏸ 정지" : "▶ 듣기"}</Button>
              <Button variant="secondary" onClick={() => { audio.current!.pause(); setPlaying(null); onPick(c); }}>이 구간 사용</Button>
            </div>
          ))}
        </div>
      ))}
      {found && found.speakers.length > 0 && <p className="vk-muted" style={{ margin: 0 }}>자동 분류라 같은 사람이 둘로 나뉘거나 다른 사람이 섞일 수 있습니다. 직접 들어 보고 고르세요.</p>}
      <audio ref={audio} hidden onTimeUpdate={() => { const a = audio.current!; if (playing && a.currentTime >= stopAt.current) { a.pause(); setPlaying(null); } }} onEnded={() => setPlaying(null)} />
    </Card>
  );
}
