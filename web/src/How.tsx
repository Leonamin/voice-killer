import { useState, type ReactNode } from "react";
import { Slider, Tabs } from "./ui/components";
import { Arch } from "./Arch";
import { describe, strengthOf } from "./strength";

const COLS = 28, ROWS = 10;
const hash = (a: number, b: number) => { const s = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return s - Math.floor(s); };
const band = (center: number, width: number, r: number) => Math.exp(-((r - center) ** 2) / (2 * width * width));
/** Target voice energy at time column c, frequency row r: two thin bands that drift over time. */
const voice = (c: number, r: number) => {
  const t = c / (COLS - 1);
  const e = Math.max(band(2.3 + 1.7 * Math.sin(t * 6.2), 1, r), 0.85 * band(6.1 + 1.5 * Math.cos(t * 5.1 + 1.2), 1.1, r));
  return Math.min(1, 0.12 + 0.98 * e);
};
/** Everything else (applause, cheers): wide, steady, a little brighter at high frequency. */
const crowd = (c: number, r: number) => Math.min(1, (0.32 + 0.68 * hash(c, r)) * (0.45 + 0.55 * (r / (ROWS - 1))) * 0.92);
// Toy cells: v = target energy, o = everything else. The model's estimate is assumed perfect here (S = v, R = o).
const BASE = Array.from({ length: ROWS * COLS }, (_, i) => {
  const c = i % COLS, r = ROWS - 1 - Math.floor(i / COLS); // low frequencies at the bottom
  return { v: voice(c, r), o: crowd(c, r) };
});

const HARD = 0.65; // dsp.suppress hard_threshold: cells with ratio >= HARD are cut fully
/** Same steps as dsp.suppress: ratio q = S / (S + R), sharpen with power p, hard cut at HARD. */
const maskOf = (q: number, p: number) => (q >= HARD ? 1 : q ** p / (q ** p + (1 - q) ** p));
const glow = (e: number) => Math.max(0.04, 1 - Math.exp(-1.1 * e));

type Cell = { v: number; o: number; q: number; m: number };
const cellsOf = (p: number): Cell[] => BASE.map(({ v, o }) => { const q = v / (v + o); return { v, o, q, m: maskOf(q, p) }; });

type Tone = "mix" | "voice" | "other" | "heat";
/** One grid of cells. `at` returns the cell's brightness 0..1; for "mix" the colour shows how much of the cell is voice. */
function Grid({ cells, tone, at, label }: { cells: Cell[]; tone: Tone; at: (c: Cell) => number; label: string }) {
  return (
    <div className="vk-grid" role="img" aria-label={label}>
      {cells.map((c, i) => {
        const share = tone === "mix" ? Math.round((c.v / (c.v + c.o)) * 100) : tone === "voice" || tone === "heat" ? 100 : 0;
        return <i key={i} style={{ background: `color-mix(in srgb, var(--vk-primary) ${share}%, var(--vk-text-muted))`, opacity: at(c) }} />;
      })}
    </div>
  );
}

/** Mask value against the target ratio, with the current sharpening power and the hard cut. */
function MaskCurve({ p }: { p: number }) {
  const X0 = 36, Y0 = 8, W = 280, H = 140;
  const pts = (power: number) => Array.from({ length: 101 }, (_, k) => k / 100)
    .map((q) => `${(X0 + q * W).toFixed(1)},${(Y0 + (1 - maskOf(q, power)) * H).toFixed(1)}`).join(" ");
  return (
    <svg className="vk-curve" viewBox="0 0 330 190" role="img" aria-label={`대상 비율에 따라 줄이는 정도를 나타낸 곡선. 비율 0.5에서 0.5, ${HARD} 이상에서 1`}>
      <polyline points={pts(1)} className="vk-curve-ref" />
      <line x1={X0 + HARD * W} x2={X0 + HARD * W} y1={Y0} y2={Y0 + H} className="vk-curve-cut" />
      <polyline points={pts(p)} className="vk-curve-line" />
      <line x1={X0} x2={X0 + W} y1={Y0 + H} y2={Y0 + H} className="vk-curve-axis" />
      <line x1={X0} x2={X0} y1={Y0} y2={Y0 + H} className="vk-curve-axis" />
      <text x={X0 + W / 2} y={Y0 + H + 30} textAnchor="middle">대상 비율 (0 = 남의 소리, 1 = 전부 대상)</text>
      <text x={X0 - 8} y={Y0 + 4} textAnchor="end">1</text>
      <text x={X0 - 8} y={Y0 + H + 4} textAnchor="end">0</text>
      <text x={X0 + HARD * W + 4} y={Y0 + 14}>{HARD}</text>
      <text transform={`translate(10 ${Y0 + H / 2}) rotate(-90)`} textAnchor="middle">줄이는 정도</text>
    </svg>
  );
}

function Step({ n, title, visual, children, more }: { n: number; title: string; visual?: ReactNode; children: ReactNode; more?: ReactNode }) {
  return (
    <li className="vk-step">
      <h3 className="vk-title"><span className="vk-step-n" aria-hidden="true">{n}</span>{title}</h3>
      <div className="vk-step-body">{children}</div>
      {visual && <div className="vk-visual">{visual}</div>}
      {more && <details className="vk-more"><summary>더 자세히</summary>{more}</details>}
    </li>
  );
}

const Cap = ({ children }: { children: ReactNode }) => <figcaption className="vk-cap">{children}</figcaption>;

function Principle() {
  const [p, setP] = useState(4);
  const [u, setU] = useState(-1); // starts at max reduce so step 5 differs from step 1 before any touch
  const k = strengthOf(u);
  const cells = cellsOf(p);
  return (
    <div className="vk-how-tab">
      <p className="vk-muted" style={{ margin: 0 }}>그림의 칸은 실제 소리가 아니라, 모델이 대상 목소리를 완벽하게 추정했다고 가정한 모형입니다. 계산식은 서버와 같습니다.</p>
      <ol className="vk-steps">
        <Step n={1} title="소리를 시간 × 주파수 칸으로 나눈다"
          visual={<figure><Grid cells={cells} tone="mix" at={(c) => glow(c.v + c.o)} label="섞인 소리를 시간과 주파수 칸으로 나눈 그림" /><Cap>밝을수록 큰 소리입니다. 주황은 대상 목소리, 회색은 박수·환호, 섞인 칸은 중간 색입니다.</Cap></figure>}
          more={<p>이 변환 이름이 STFT입니다. 서버는 512 샘플(16 kHz에서 약 0.03초)을 128 샘플(약 0.008초)씩 밀면서 잽니다. 섞인 소리와 아래 3단계의 대상 추정을 모두 이렇게 나눕니다. 실제 소리에서는 목소리와 박수가 같은 칸을 나눠 쓰기도 합니다.</p>}>
          <p>짧은 시간 조각마다 낮은 소리부터 높은 소리까지 얼마나 큰지 잽니다. 목소리와 박수는 대부분 서로 다른 칸을 차지합니다.</p>
        </Step>
        <Step n={2} title="기준 목소리로 “이 사람”을 정한다"
          visual={<figure><div className="vk-print" aria-hidden="true">{Array.from({ length: 24 }, (_, i) => <i key={i} style={{ height: `${20 + hash(i, 3) * 80}%` }} />)}</div><Cap>한 사람의 목소리 특징을 숫자 묶음으로 바꾼 것(예시 모양)</Cap></figure>}
          more={<p>기준 목소리 구간을 화자 인코더(ECAPA)가 숫자 묶음(화자 임베딩)으로 바꿉니다. 비어 있지 않은 소리가 1초 이상이면 받고, 5~10초를 권합니다. 다른 소리가 섞이면 엉뚱한 사람의 숫자 묶음이 만들어집니다.</p>}>
          <p>그 사람이 혼자 말하는 구간을 모델에 줍니다. 이름이 아니라 목소리 특징으로 찾습니다.</p>
        </Step>
        <Step n={3} title="섞인 소리에서 대상 목소리를 추정한다"
          visual={<div className="vk-pair">
            <figure><Grid cells={cells} tone="voice" at={(c) => glow(c.v)} label="대상 목소리 추정" /><Cap>대상 추정</Cap></figure>
            <figure><Grid cells={cells} tone="other" at={(c) => glow(c.o)} label="나머지 소리" /><Cap>나머지 = 섞인 소리 − 대상 추정</Cap></figure>
          </div>}
          more={<p>REAL-TSE 모델(BSRNN 구조)이 기준 목소리의 숫자 묶음과 섞인 소리를 받아 대상 목소리를 만듭니다. 12초씩 끊어 처리하고 2초씩 겹쳐 이어 붙입니다. 추정이라 대상이 남거나 다른 소리가 딸려 올 수 있습니다.</p>}>
          <p>모델이 대상 목소리만 따로 만듭니다. 섞인 소리에서 이 추정을 빼면 나머지 소리가 남습니다.</p>
        </Step>
        <Step n={4} title="칸마다 “대상 비율”을 구해 마스크를 만든다"
          visual={<div className="vk-how-demo">
            <div className="vk-pair">
              <figure><Grid cells={cells} tone="heat" at={(c) => Math.max(0.04, c.q)} label="칸마다 대상 비율" /><Cap>대상 비율 = 대상 ÷ (대상 + 나머지)</Cap></figure>
              <figure><Grid cells={cells} tone="heat" at={(c) => Math.max(0.04, c.m)} label="칸마다 줄이는 정도(마스크)" /><Cap>마스크 = 줄이는 정도</Cap></figure>
            </div>
            <MaskCurve p={p} />
            <Slider label="날카롭게 하는 정도 (p)" min={1} max={8} step={1} value={p} onValueChange={setP} valueText={`p = ${p}`}
              description="p가 클수록 비율이 0.5에서 조금만 벗어나도 0이나 1에 가깝게 밀립니다. 점선은 p=1입니다." />
          </div>}
          more={<p>비율은 0에서 1 사이입니다. 0.5는 대상과 나머지가 같다는 뜻이라 p와 상관없이 0.5로 남습니다. 0.5보다 높으면 1쪽으로, 낮으면 0쪽으로 밀립니다. 비율이 {HARD} 이상인 칸은 1로 고정해 작은 흔적이 남지 않게 합니다. 서버의 기본값은 p=4입니다.</p>}>
          <p>0은 남의 소리, 1은 전부 대상입니다. 이 비율을 p제곱으로 날카롭게 다듬은 값이 마스크이고, 마스크는 그 칸을 얼마나 줄일지 정합니다.</p>
        </Step>
        <Step n={5} title="마스크만큼 곱해서 줄이거나 키운다"
          visual={<div className="vk-how-demo">
            <figure><Grid cells={cells} tone="mix" at={(c) => glow((c.v + c.o) * (1 - k * c.m))} label="크기를 바꾼 결과" /><Cap>섞인 소리의 칸에 (1 − 강도 × 마스크)를 곱한 결과</Cap></figure>
            <Slider label="강도" min={-1} max={1} step={0.05} value={u} onValueChange={setU} valueText={describe(u)}
              description="왼쪽은 줄이기, 가운데는 그대로, 오른쪽은 키우기입니다." />
          </div>}
          more={<p>줄이기는 칸의 소리에 (1 − 강도 × 마스크)를 곱하고, 키우기는 강도를 음수로 두어 (1 + |강도| × 마스크)를 곱합니다. 서버는 강도 −4~1을 받습니다. 곱한 뒤 다시 소리로 합칩니다(역변환). 칸 안에 박수가 섞여 있으면 박수도 같은 비율로 바뀝니다.</p>}>
          <p>마스크가 1인 칸은 최대로 바뀌고, 0인 칸은 그대로입니다. 목소리 칸만 바뀌므로 같은 순간의 박수는 대부분 남습니다.</p>
        </Step>
      </ol>

      <h2 className="vk-title">우리가 잰 것</h2>
      <p className="vk-muted" style={{ margin: 0 }}>발표 영상의 발화와 환호를 같은 크기로 섞은 시험 한 건입니다. 한국어와 실제 마이크는 확인하지 않았습니다.</p>
      <div className="vk-table-wrap">
        <table className="vk-table">
          <thead><tr><th>설정</th><th>대상 목소리</th><th>주변 소리</th></tr></thead>
          <tbody>
            <tr><td>최대로 줄임</td><td>−25.1 dB</td><td>−1.0 dB</td></tr>
            <tr><td>절반으로 줄임</td><td>−5.6 dB</td><td>−0.5 dB</td></tr>
            <tr><td>키움 (강도 −1)</td><td>+5.8 dB</td><td>+0.9 dB</td></tr>
            <tr><td>더 키움 (강도 −2)</td><td>+9.2 dB</td><td>+1.7 dB</td></tr>
            <tr><td>최대로 키움 (강도 −4)</td><td>+13.6 dB</td><td>+3.1 dB</td></tr>
          </tbody>
        </table>
      </div>
      <ul className="vk-muted vk-notes">
        <li>키우면 대상 목소리와 함께 주변 소리도 조금 커집니다. 모델이 대상과 주변 소리를 완전히 가르지 못하기 때문으로 보이며 원인은 확인하지 않았습니다.</li>
        <li>소리 크기 변화만 잰 값이고, 사람이 알아듣는 정도는 아닙니다.</li>
      </ul>
    </div>
  );
}

export function How() {
  return (
    <section className="vk-panel" aria-labelledby="panel-title">
      <header>
        <h1 id="panel-title" className="vk-display">원리와 구조</h1>
      </header>
      <Tabs label="원리와 구조" items={[
        { value: "structure", label: "구조", content: <div className="vk-how-tab"><Arch /></div> },
        { value: "principle", label: "원리", content: <Principle /> },
      ]} />
    </section>
  );
}
