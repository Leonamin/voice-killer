import { useEffect, useRef, useState } from "react";
import { Alert, Button, Select } from "./ui/components";
import type { Range } from "./state";

type Speaker = { id: number; total: number; is_minor: boolean; candidates: Range[]; from?: number[] };
type Found = { speakers: Speaker[]; overlaps: Range[] };
const MINOR_TOTAL = 5, PER_SPEAKER = 5; // keep in step with candidates.py

/** Fold voices the user marked as the same person: root id -> one voice with summed time and the longest spans. */
function fold(speakers: Speaker[], link: Record<number, number>): Speaker[] {
  const root = (id: number): number => (link[id] && link[id] !== id ? root(link[id]) : id);
  const by = new Map<number, Speaker>();
  for (const sp of speakers) {
    const r = root(sp.id), cur = by.get(r);
    by.set(r, cur ? { ...cur, total: cur.total + sp.total, candidates: [...cur.candidates, ...sp.candidates], from: [...cur.from!, sp.id] } : { ...sp, id: r, from: [sp.id] });
  }
  return [...by.values()].map((sp) => ({
    ...sp, is_minor: sp.total < MINOR_TOTAL,
    candidates: sp.candidates.sort((a, b) => b.end - b.start - (a.end - a.start)).slice(0, PER_SPEAKER),
  })).sort((a, b) => b.total - a.total);
}
const cache = new WeakMap<Blob, { key: string; found: Found }>(); // survives leaving the panel; a new source Blob drops it

/** Add-on above the reference picker: finds single-speaker spans to audition. Picking one only sets the reference range. */
export function Candidates({ blob, range, onPick }: { blob: Blob; range: Range; onPick: (r: Range) => void }) {
  const [count, setCount] = useState("0"); // 0 = automatic
  const key = `${range.start}-${range.end}-${count}`, hit = cache.get(blob);
  const [found, setFound] = useState<Found | null>(hit?.key === key ? hit.found : null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [playing, setPlaying] = useState<Range | null>(null);
  const [link, setLink] = useState<Record<number, number>>({}); // voice id -> voice it was merged into
  const [sel, setSel] = useState<number[]>([]); // checked voices (folded ids)
  const audio = useRef<HTMLAudioElement>(null), stopAt = useRef(0);
  useEffect(() => { const u = URL.createObjectURL(blob); audio.current!.src = u; return () => URL.revokeObjectURL(u); }, [blob]);
  useEffect(() => { const h = cache.get(blob); setFound(h?.key === key ? h.found : null); }, [blob, key]);

  async function search() {
    setIsLoading(true); setError("");
    try {
      const fd = new FormData();
      fd.append("audio", blob, "input"); fd.append("start", String(range.start)); fd.append("end", String(range.end)); fd.append("num_speakers", count);
      const r = await fetch("/api/candidates", { method: "POST", body: fd });
      if (!r.ok) {
        let m = r.statusText;
        try { const j = await r.json(); m = typeof j.detail === "string" ? j.detail : JSON.stringify(j.detail); } catch { /* keep statusText */ }
        throw new Error(m);
      }
      const f = (await r.json()) as Found;
      cache.set(blob, { key, found: f }); setFound(f); setLink({}); setSel([]);
    } catch (e) { setError((e as Error).message); }
    finally { setIsLoading(false); }
  }

  function play(c: Range) {
    const a = audio.current!;
    if (playing === c) { a.pause(); setPlaying(null); return; }
    stopAt.current = c.end; a.currentTime = c.start; void a.play(); setPlaying(c);
  }

  const merge = () => { const r = Math.min(...sel); setLink((l) => ({ ...l, ...Object.fromEntries(sel.filter((i) => i !== r).map((i) => [i, r])) })); setSel([]); };
  const speakers = found ? fold(found.speakers, link) : [];
  const speaker = (sp: Speaker) => (
    <section key={sp.id} className="vk-voice" aria-label={`목소리 ${sp.id}`}>
      <header className="vk-voice-head">
        <div>
          <h3 className="vk-voice-name">목소리 {sp.id}</h3>
          <span className="vk-muted">후보 {sp.candidates.length}개 · 혼자 말한 구간 합계 {sp.total.toFixed(0)}초{sp.from && sp.from.length > 1 ? ` · 합침: ${sp.from.join("+")}` : ""}</span>
        </div>
        <label className="vk-check"><span className="vk-check-box"><input className="gc-checkbox-input" type="checkbox" checked={sel.includes(sp.id)} onChange={(e) => setSel((a) => (e.target.checked ? [...a, sp.id] : a.filter((i) => i !== sp.id)))} /></span>합치기용 선택</label>
      </header>
      <ul className="vk-voice-spans">
        {sp.candidates.map((c) => (
          <li key={c.start} className="vk-span">
            <span className="vk-clock">{c.start.toFixed(1)}초 – {c.end.toFixed(1)}초</span>
            <Button variant="secondary" onClick={() => play(c)}>{playing === c ? "⏸ 정지" : "▶ 듣기"}</Button>
            <Button variant="secondary" onClick={() => { audio.current!.pause(); setPlaying(null); onPick(c); }}>이 구간 사용</Button>
          </li>
        ))}
      </ul>
    </section>
  );

  return (
    <section className="vk-cand" aria-labelledby="cand-title">
      <h2 id="cand-title" className="vk-title">기준 목소리 후보 찾기</h2>
      <p className="vk-muted" style={{ margin: 0 }}>한 사람만 말하는 구간을 찾습니다. 10분 분량에 1분 가까이 걸릴 수 있습니다.</p>
      <Select label="화자 수" value={count} onValueChange={setCount}
        options={[{ value: "0", label: "자동" }, ...[1, 2, 3, 4, 5, 6].map((n) => ({ value: String(n), label: `${n}명` }))]} />
      <div className="vk-row"><Button variant="secondary" isLoading={isLoading} onClick={search}>{found ? "다시 찾기" : "후보 찾기"}</Button></div>
      {error && <Alert tone="danger" title="후보를 찾지 못했습니다">{error}</Alert>}
      {found && found.speakers.length > 0 && <p style={{ margin: 0 }}><strong>목소리 {found.speakers.length}명</strong>을 찾았습니다. 목소리마다 혼자 말한 구간이 후보로 묶여 있습니다.</p>}
      {found && found.speakers.length === 0 && <Alert tone="warning" title="후보 없음">한 사람만 말하는 구간(2초 이상)을 찾지 못했습니다. 아래에서 직접 지정하세요.</Alert>}
      {sel.length > 1 && <div className="vk-row"><Button variant="secondary" onClick={merge}>선택한 {sel.length}개를 같은 사람으로 합치기</Button></div>}
      {speakers.filter((sp) => !sp.is_minor).map(speaker)}
      {speakers.some((sp) => sp.is_minor) && (
        <details>
          <summary className="vk-muted">말한 양이 적은 목소리 {speakers.filter((sp) => sp.is_minor).length}개 (잡음이거나 같은 사람의 일부일 수 있음)</summary>
          {speakers.filter((sp) => sp.is_minor).map(speaker)}
        </details>
      )}
      {found && found.speakers.length > 0 && <p className="vk-muted" style={{ margin: 0 }}>자동 분류라 같은 사람이 둘로 나뉘거나 다른 사람이 섞일 수 있습니다. 같은 사람이 나뉘었으면 각 목소리의 "합치기용 선택"을 체크하고 "합치기"를 누르세요.</p>}
      <audio ref={audio} hidden onTimeUpdate={() => { const a = audio.current!; if (playing && a.currentTime >= stopAt.current) { a.pause(); setPlaying(null); } }} onEnded={() => setPlaying(null)} />
    </section>
  );
}
