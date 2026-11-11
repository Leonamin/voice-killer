import { useEffect, useRef, useState, type ReactNode } from "react";
import { Slider, Tabs } from "./ui/components";
import { Arch } from "./Arch";
import { describe, strengthOf } from "./strength";

import data from "./data/spectrogram.json";

// Real cells from scripts/export_spectrogram.py: the controlled speech + audience mix, REAL-TSE's target estimate S and residual R = X - S,
// pooled to ROWS x COLS and stored in dB (uint8, relative to the loudest cell of X).
const ROWS: number = data.rows, COLS: number = data.cols, FLOOR: number = data.dbFloor;
const decode = (b64: string) => Float32Array.from(atob(b64), (ch) => 10 ** ((ch.charCodeAt(0) / 255 * -FLOOR + FLOOR) / 20)); // linear magnitude
const X = decode(data.x), S = decode(data.s), R = decode(data.r);

const hash = (a: number, b: number) => { const v = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return v - Math.floor(v); }; // fixed pseudo-random bar heights

const HARD = 0.65; // dsp.suppress hard_threshold: cells with ratio >= HARD are cut fully
/** Same steps as dsp.suppress: ratio q = S / (S + R), sharpen with power p, hard cut at HARD. */
export const maskOf = (q: number, p: number) => (q >= HARD ? 1 : q ** p / (q ** p + (1 - q) ** p));
const RATIO = Float32Array.from(S, (s, i) => s / (s + R[i]));
const SHOWN_DB = 35; // brightness range: 0 dB (loudest) .. -35 dB
const bright = (mag: number) => Math.min(1, Math.max(0, 1 + 20 * Math.log10(Math.max(mag, 1e-9)) / SHOWN_DB));
const CUT_GRAY = 0.12; // cells cut to 0 stay dark gray, not pure black

type Tone = "mix" | "voice" | "other" | "heat";
const css = (name: string) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();
const rgb = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));

/** One spectrogram on a canvas. `at(i)` gives cell i's brightness 0..1; for "mix" the hue shows how much of the cell is the target voice. */
function Spectro({ tone, at, label }: { tone: Tone; at: (i: number) => number; label: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const cv = ref.current!, ctx = cv.getContext("2d")!;
    const img = ctx.createImageData(COLS, ROWS), voiceC = rgb(css("--vk-primary")), otherC = rgb(css("--vk-text-muted")), bg = rgb(css("--vk-bg"));
    for (let i = 0; i < ROWS * COLS; i++) {
      const share = tone === "mix" ? S[i] / (S[i] + R[i]) : tone === "other" ? 0 : 1, b = at(i);
      for (let c = 0; c < 3; c++) img.data[i * 4 + c] = bg[c] + (voiceC[c] * share + otherC[c] * (1 - share) - bg[c]) * b;
      img.data[i * 4 + 3] = 255;
    }
    ctx.putImageData(img, 0, 0);
  });
  return <canvas ref={ref} className="vk-spectro" width={COLS} height={ROWS} role="img" aria-label={label} />;
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
  return (
    <div className="vk-how-tab">
      <p className="vk-muted" style={{ margin: 0 }}>발표 영상의 발화와 환호를 섞은 8초를 실제로 처리해 뽑은 그림입니다. 칸을 합쳐 그렸고, 계산식은 서버와 같습니다.</p>
      <ol className="vk-steps">
        <Step n={1} title="소리를 시간 × 주파수 칸으로 나눈다"
          visual={<figure><Spectro tone="mix" at={(i) => bright(X[i])} label="섞인 소리를 시간과 주파수 칸으로 나눈 그림" /><Cap>가로는 시간(8초), 세로는 높은 소리(위)와 낮은 소리(아래), 밝을수록 큰 소리입니다. 주황은 대상 목소리가 많은 칸, 회색은 나머지가 많은 칸입니다.</Cap></figure>}
          more={<p>이 변환 이름이 STFT입니다. 서버는 512 샘플(16 kHz에서 약 0.03초)을 128 샘플(약 0.008초)씩 밀면서 잽니다. 섞인 소리와 아래 3단계의 대상 추정을 모두 이렇게 나눕니다. 실제 소리에서는 목소리와 박수가 같은 칸을 나눠 쓰기도 합니다.</p>}>
          <p>짧은 시간 조각마다 낮은 소리부터 높은 소리까지 얼마나 큰지 잽니다. 목소리와 박수는 밝은 자리가 서로 다릅니다.</p>
        </Step>
        <Step n={2} title="기준 목소리로 “이 사람”을 정한다"
          visual={<figure><div className="vk-print" aria-hidden="true">{Array.from({ length: 24 }, (_, i) => <i key={i} style={{ height: `${20 + hash(i, 3) * 80}%` }} />)}</div><Cap>한 사람의 목소리 특징을 숫자 묶음으로 바꾼 것(예시 모양)</Cap></figure>}
          more={<p>기준 목소리 구간을 화자 인코더(ECAPA)가 숫자 묶음(화자 임베딩)으로 바꿉니다. 비어 있지 않은 소리가 1초 이상이면 받고, 5~10초를 권합니다. 다른 소리가 섞이면 엉뚱한 사람의 숫자 묶음이 만들어집니다.</p>}>
          <p>그 사람이 혼자 말하는 구간을 모델에 줍니다. 이름이 아니라 목소리 특징으로 찾습니다.</p>
        </Step>
        <Step n={3} title="섞인 소리에서 대상 목소리를 추정한다"
          visual={<div className="vk-pair">
            <figure><Spectro tone="voice" at={(i) => bright(S[i])} label="대상 목소리 추정" /><Cap>대상 추정</Cap></figure>
            <figure><Spectro tone="other" at={(i) => bright(R[i])} label="나머지 소리" /><Cap>나머지 = 섞인 소리 − 대상 추정</Cap></figure>
          </div>}
          more={<p>REAL-TSE 모델(BSRNN 구조)이 기준 목소리의 숫자 묶음과 섞인 소리를 받아 대상 목소리를 만듭니다. 12초씩 끊어 처리하고 2초씩 겹쳐 이어 붙입니다. 추정이라 대상이 남거나 다른 소리가 딸려 올 수 있습니다.</p>}>
          <p>모델이 대상 목소리만 따로 만듭니다. 섞인 소리에서 이 추정을 빼면 나머지 소리가 남습니다.</p>
        </Step>
        <Step n={4} title="칸마다 “대상 비율”을 구해 마스크를 만든다"
          visual={<div className="vk-how-demo">
            <div className="vk-pair">
              <figure><Spectro tone="heat" at={(i) => RATIO[i]} label="칸마다 대상 비율" /><Cap>대상 비율 = 대상 ÷ (대상 + 나머지)</Cap></figure>
              <figure><Spectro tone="heat" at={(i) => maskOf(RATIO[i], p)} label="칸마다 줄이는 정도(마스크)" /><Cap>마스크 = 줄이는 정도</Cap></figure>
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
            <figure><Spectro tone="mix" at={(i) => Math.max(CUT_GRAY, bright(X[i] * Math.max(0, 1 - k * maskOf(RATIO[i], p))))} label="크기를 바꾼 결과" /><Cap>섞인 소리의 칸에 (1 − 강도 × 마스크)를 곱한 결과</Cap></figure>
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

const TERMS: [string, string][] = [
  ["REAL-TSE", "기준 목소리 샘플과 섞인 소리를 받아, 섞인 소리 안의 대상 목소리만 따로 뽑아 내는 AI 모델입니다. TSE는 Target Speaker Extraction(대상 화자 추출)입니다."],
  ["STFT 마스크", "소리를 짧은 시간 조각과 주파수 칸으로 나눈 표(스펙트로그램)에서, 칸마다 대상 목소리 비율을 보고 곱할 값(0~1)을 정해 그 칸의 크기를 줄이거나 키웁니다. 이 값 묶음이 마스크입니다."],
  ["PyTorch", "AI 모델을 학습하고 실행하는 파이썬 라이브러리입니다. REAL-TSE 모델이 PyTorch로 만들어져 있습니다."],
  ["SciPy", "과학·신호 계산용 파이썬 라이브러리입니다. 소리를 STFT로 변환하고 되돌리는 계산에 씁니다."],
  ["ONNX", "AI 모델을 프로그램 종류와 상관없이 같은 파일 형식으로 저장하는 규격입니다. PyTorch 같은 학습 도구 없이도 이 파일을 CPU에서 실행할 수 있습니다."],
  ["sherpa-onnx", "ONNX 모델을 CPU에서 돌리는 음성 처리 도구입니다. 여기서는 긴 녹음을 화자별로 나누는 데 써서, 기준 목소리 후보 구간을 찾습니다."],
];

function Glossary() {
  return (
    <dl className="vk-terms">
      {TERMS.map(([t, d]) => <div key={t}><dt>{t}</dt><dd>{d}</dd></div>)}
    </dl>
  );
}

export function How() {
  return (
    <section className="vk-panel" aria-labelledby="panel-title">
      <header>
        <h1 id="panel-title" className="vk-display">원리와 구조</h1>
      </header>
      <Tabs label="원리와 구조" items={[
        { value: "structure", label: "구조", content: <div className="vk-how-tab"><Arch /><Glossary /></div> },
        { value: "principle", label: "원리", content: <Principle /> },
      ]} />
    </section>
  );
}
