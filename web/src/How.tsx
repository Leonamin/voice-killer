import { useState, type ReactNode } from "react";
import { Slider } from "./ui/components";
import { Arch } from "./Arch";
import { describe, strengthOf } from "./strength";

const COLS = 28, ROWS = 10;
const hash = (a: number, b: number) => { const s = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return s - Math.floor(s); };
const band = (center: number, width: number, r: number) => Math.exp(-((r - center) ** 2) / (2 * width * width));
/** Energy of the target voice at time column c, frequency row r: two thin bands that drift over time. */
const voice = (c: number, r: number) => {
  const t = c / (COLS - 1);
  const e = Math.max(band(2.3 + 1.7 * Math.sin(t * 6.2), 1, r), 0.85 * band(6.1 + 1.5 * Math.cos(t * 5.1 + 1.2), 1.1, r));
  return Math.min(1, 0.12 + 0.98 * e);
};
/** Everything else (applause, cheers): wide, steady, a little brighter at high frequency. */
const crowd = (c: number, r: number) => Math.min(1, (0.32 + 0.68 * hash(c, r)) * (0.45 + 0.55 * (r / (ROWS - 1))) * 0.92);
const CELLS = Array.from({ length: ROWS * COLS }, (_, i) => {
  const c = i % COLS, r = ROWS - 1 - Math.floor(i / COLS); // low frequencies at the bottom
  const v = voice(c, r), o = crowd(c, r);
  return { isTarget: v > o + 0.03, v, o };
});

/** Same formula as the server: output = input x (1 - strength x mask). The mask is 1 on voice cells and 0 elsewhere here. */
function GridDemo() {
  const [u, setU] = useState(0);
  const k = strengthOf(u);
  return (
    <div className="vk-how-demo">
      <div className="vk-grid" role="img" aria-label="시간과 주파수로 나눈 칸. 주황 칸은 대상 목소리, 회색 칸은 박수와 환호">
        {CELLS.map((cell, i) => {
          const e = cell.isTarget ? cell.v * (1 - k) : cell.o; // 1 - k = gain on the voice
          const a = 1 - Math.exp(-1.6 * e);
          return <i key={i} className={cell.isTarget ? "is-voice" : "is-other"} style={{ opacity: Math.max(0.04, a) }} />;
        })}
      </div>
      <Slider label="대상 목소리 크기" min={-1} max={1} step={0.05} value={u} onValueChange={setU} valueText={describe(u)}
        description="주황 칸만 어두워지거나 밝아지고, 회색 칸(박수·환호)은 그대로입니다." />
    </div>
  );
}

function Step({ n, title, children, more }: { n: number; title: string; children: ReactNode; more?: ReactNode }) {
  return (
    <li className="vk-step">
      <h3 className="vk-title"><span className="vk-step-n" aria-hidden="true">{n}</span>{title}</h3>
      <div className="vk-step-body">{children}</div>
      {more && <details className="vk-more"><summary>더 자세히</summary>{more}</details>}
    </li>
  );
}

export function How() {
  return (
    <section className="vk-panel" aria-labelledby="panel-title">
      <header>
        <h1 id="panel-title" className="vk-display">원리와 구조</h1>
      </header>

      <h2 className="vk-title">1. 구조</h2>
      <Arch />

      <h2 className="vk-title">2. 원리 다섯 단계</h2>
      <ol className="vk-steps">
        <Step n={1} title="소리를 시간 × 주파수 칸으로 나눈다"
          more={<p>이 변환 이름은 STFT입니다. 0.03초쯤 되는 짧은 조각마다 낮은 소리부터 높은 소리까지 에너지를 잽니다. 이 서버는 512 샘플(16 kHz에서 약 0.03초) 조각을 128 샘플씩 밀면서 잽니다.</p>}>
          <p>사람 목소리와 박수는 같은 순간에 섞여 있어도 에너지가 사는 칸이 다릅니다. 시간만으로는 가를 수 없고, 칸으로 나누면 가를 수 있습니다.</p>
        </Step>
        <Step n={2} title="기준 목소리로 “이 사람”을 정한다"
          more={<p>5~10초의 기준 목소리를 모델이 숫자 묶음(화자 임베딩)으로 바꿉니다. 이 숫자 묶음이 그 사람 목소리의 지문입니다. 기준 구간에 다른 소리가 섞이면 엉뚱한 지문이 만들어집니다.</p>}>
          <p>그 사람이 혼자 말하는 짧은 구간을 모델에 줍니다. 이름이 아니라 목소리 특징으로 찾습니다.</p>
        </Step>
        <Step n={3} title="섞인 소리에서 대상 목소리를 추정한다"
          more={<p>REAL-TSE 모델이 기준 목소리와 섞인 소리를 함께 받아, 섞인 소리 안의 대상 성분만 따로 만들어 냅니다. 12초씩 끊어 처리하고 2초씩 겹쳐 이어 붙입니다. 추정이라서 완벽하지 않습니다.</p>}>
          <p>모델이 “이 소리 중 그 사람 몫”을 따로 그려 냅니다. 아직 크기는 바꾸지 않습니다.</p>
        </Step>
        <Step n={4} title="칸마다 “대상일 비율”을 계산한다"
          more={<p>칸마다 (대상 성분) ÷ (대상 + 나머지)를 계산합니다. 이 비율을 거듭제곱(p=4)으로 날카롭게 다듬으면 확실한 칸은 1에, 애매한 칸은 0에 가까워집니다. 비율이 0.65 이상인 칸은 1로 고정해 작은 흔적이 남지 않게 합니다.</p>}>
          <p>0이면 남의 소리, 1이면 전부 대상입니다. 이 비율 표가 마스크입니다.</p>
        </Step>
        <Step n={5} title="비율만큼 곱해서 줄이거나 키운다"
          more={<p>줄이기는 칸의 소리에 (1 − 강도 × 마스크)를 곱합니다. 키우기는 강도를 음수로 두어 (1 + |강도| × 마스크)를 곱합니다. 서버는 강도 −4~1을 받습니다.</p>}>
          <p>대상 칸만 바뀌고 나머지 칸은 그대로입니다. 그래서 같은 순간에 박수가 있어도 박수는 거의 남습니다.</p>
        </Step>
      </ol>

      <h2 className="vk-title">3. 직접 해 보기</h2>
      <p className="vk-muted" style={{ margin: 0 }}>실제 소리가 아니라 칸으로 그린 모형입니다.</p>
      <GridDemo />

      <h2 className="vk-title">4. 우리가 잰 것</h2>
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
        <li>키우면 대상 목소리와 함께 주변 소리도 조금 커집니다. 대상과 주변 소리를 완전히 가르지 못하기 때문으로 보이며 원인은 확인하지 않았습니다.</li>
        <li>소리 크기 변화만 잰 값이고, 사람이 알아듣는 정도는 아닙니다.</li>
      </ul>
    </section>
  );
}
