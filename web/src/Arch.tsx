import { useLayoutEffect, useRef, useState } from "react";
import react from "./arch/react.svg";
import cloudflare from "./arch/cloudflare.svg";
import fastapi from "./arch/fastapi.svg";
import ffmpeg from "./arch/ffmpeg.svg";
import onnx from "./arch/onnx.png";
import pytorch from "./arch/pytorch.svg";
import scipy from "./arch/scipy.svg";

// Hand-placed coordinates from the stack-diagram skill (node box 132x100, tile 60x60, edges anchored on box edges).
const W = 1000, H = 440;
// Crop the empty margins: the visible window is VIEW_W x VIEW_H, starting at (CROP_X, CROP_Y) of the drawing.
const CROP_X = 40, CROP_Y = 40, VIEW_W = 860, VIEW_H = 380, MIN_SCALE = 0.65;
const NODES = [
  { cx: 110, top: 120, icon: react, name: "React", role: "브라우저 화면" },
  { cx: 280, top: 120, icon: cloudflare, name: "Cloudflare Tunnel", role: "인터넷 → 이 PC" },
  { cx: 480, top: 120, icon: fastapi, name: "FastAPI", role: "웹 서버 (한 번에 1건)" },
  { cx: 640, top: 120, icon: ffmpeg, name: "ffmpeg", role: "16 kHz 모노로 변환" },
  { cx: 480, top: 260, icon: onnx, name: "sherpa-onnx", role: "화자 분리·후보", isWide: true },
  { cx: 640, top: 260, icon: pytorch, name: "REAL-TSE", role: "대상 목소리 추정" },
  { cx: 800, top: 260, icon: scipy, name: "STFT 마스크", role: "크기 줄이기·키우기" },
];
// kind: main = 크기 조절 처리 흐름, side = 후보 찾기
const EDGES = [
  { d: "M146 150 H238", label: "파일", lx: 192, ly: 142, kind: "main" },
  { d: "M322 150 H438", label: "https", lx: 380, ly: 142, kind: "main" },
  { d: "M516 150 H598", label: "디코딩", lx: 557, ly: 142, kind: "main" },
  { d: "M640 226 V254", label: "16 kHz", lx: 650, ly: 244, kind: "main", isStart: true },
  { d: "M676 290 H758", label: "대상 성분", lx: 717, ly: 282, kind: "main" },
  { d: "M480 226 V254", label: "후보 찾기", lx: 490, ly: 244, kind: "side", isStart: true },
] as const;

/** Structure diagram of the web app. Scrolls sideways on narrow screens instead of shrinking the text. */
export function Arch() {
  const box = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  useLayoutEffect(() => {
    const el = box.current!;
    const fit = () => setScale(Math.max(MIN_SCALE, Math.min(1, el.clientWidth / VIEW_W)));
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return (
    <figure className="vk-arch" aria-label="처리 구조: 브라우저, Cloudflare Tunnel, FastAPI, ffmpeg, REAL-TSE, STFT 마스크 순서로 처리하고 후보 찾기는 sherpa-onnx가 맡는다">
      <div className="vk-arch-scroll" ref={box} tabIndex={0}>
        <div style={{ width: VIEW_W * scale, height: VIEW_H * scale }}>
        <div className="vk-arch-canvas" style={{ width: VIEW_W, height: VIEW_H, transform: `scale(${scale})` }}>
        <div className="vk-arch-draw" style={{ width: W, height: H, left: -CROP_X, top: -CROP_Y }}>
          <div className="vk-arch-group" style={{ left: 390, top: 60, width: 500, height: 350 }}><span>이 PC (집 서버)</span></div>
          <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} aria-hidden="true">
            <defs>
              <marker id="vk-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6.5" markerHeight="6.5" orient="auto-start-reverse">
                <path d="M0 0 L10 5 L0 10 z" fill="context-stroke" />
              </marker>
            </defs>
            {EDGES.map((e) => (
              <g key={e.d}>
                <path className={`vk-edge-${e.kind}`} d={e.d} markerEnd="url(#vk-arrow)" />
                <text className={`vk-edge-label vk-edge-label-${e.kind}`} x={e.lx} y={e.ly} textAnchor={"isStart" in e ? "start" : "middle"}>{e.label}</text>
              </g>
            ))}
          </svg>
          {NODES.map((n) => (
            <div key={n.name} className="vk-arch-node" style={{ left: n.cx - 66, top: n.top }}>
              <div className={`vk-arch-tile${"isWide" in n ? " is-wide" : ""}`}><img src={n.icon} alt="" /></div>
              <div className="vk-arch-name">{n.name}</div>
              <div className="vk-arch-role">{n.role}</div>
            </div>
          ))}
        </div>
        </div>
        </div>
      </div>
      <figcaption className="vk-muted">
        <span className="vk-legend vk-legend-main" />크기 조절 처리 흐름 (결과 WAV는 같은 길로 돌아옵니다)
        <span className="vk-legend vk-legend-side" />기준 목소리 후보 찾기
        {scale <= MIN_SCALE && <span>그림이 넓어요. 좌우로 밀어서 보세요.</span>}
      </figcaption>
    </figure>
  );
}
