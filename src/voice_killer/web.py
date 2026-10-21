"""Local web demo: POST /api/process crops, extracts or removes a speaker."""
import argparse
import contextlib
import asyncio
import io
import json
import subprocess
import tempfile
import threading
import numpy as np
import soundfile as sf
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, File, Form, HTTPException, UploadFile
from fastapi.responses import HTMLResponse, Response
from fastapi.staticfiles import StaticFiles
from . import engine

SR = 16000
MAX_BYTES = 200 * 1024 * 1024  # ponytail: the 10-min stereo 48 kHz demo wav is 119 MB; whole upload sits in RAM
MAX_SECONDS = 600
lock = threading.Lock()  # ponytail: global lock, one request at a time; a queue if several users matter


@contextlib.asynccontextmanager
async def lifespan(_):
    engine.load_extractor()
    yield


app = FastAPI(lifespan=lifespan)


DIST = engine.ROOT / "web" / "dist"
if (DIST / "assets").is_dir():
    app.mount("/assets", StaticFiles(directory=DIST / "assets"), name="assets")


@app.get("/", response_class=HTMLResponse)
def index():
    page = DIST / "index.html"
    if not page.is_file():
        return HTMLResponse("프런트엔드가 빌드되지 않았습니다. cd web && npm ci && npm run build 를 실행하세요.", status_code=503)
    return page.read_text(encoding="utf-8")


def decode(upload):
    data = upload.file.read(MAX_BYTES + 1)
    if len(data) > MAX_BYTES:
        raise HTTPException(400, f"파일이 너무 큽니다 (최대 {MAX_BYTES >> 20} MB)")
    # rematrix_maxval=1.0 makes -ac 1 average channels (ffmpeg default is 0.707 per channel, ~+3 dB vs read_audio)
    with tempfile.NamedTemporaryFile() as f:
        f.write(data)
        f.flush()
        p = subprocess.run(["ffmpeg", "-v", "error", "-i", f.name, "-af", "aresample=rematrix_maxval=1.0", "-ac", "1", "-f", "f32le", "-ar", str(SR), "-"],
                           capture_output=True)
    if p.returncode or not p.stdout:
        raise HTTPException(400, "오디오를 읽을 수 없습니다: " + p.stderr.decode(errors="replace")[-200:])
    x = np.frombuffer(p.stdout[:len(p.stdout) // 4 * 4], dtype="<f4").astype(np.float32)
    if not np.isfinite(x).all():
        raise HTTPException(400, "오디오에 유효하지 않은 값이 있습니다")
    return x


def crop(x, start, end, name, max_seconds=None):
    n = len(x) / SR
    if not (np.isfinite(start) and np.isfinite(end)) or not 0 <= start < end <= n + 1e-3:
        raise HTTPException(400, f"{name} 구간이 올바르지 않습니다: 0 <= 시작 < 끝 <= {n:.2f}초 여야 합니다")
    if max_seconds and end - start > max_seconds:
        raise HTTPException(400, f"{name} 구간은 최대 {max_seconds // 60}분입니다")
    return x[round(start * SR):round(end * SR)]


@app.post("/api/process")
def process(audio: UploadFile = File(...), start: float = Form(0.0), end: float = Form(...), ref: UploadFile | None = File(None),
            ref_start: float = Form(0.0), ref_end: float = Form(...), mode: str = Form("remove"), strength: float = Form(1.0), steps: int = Form(10)):
    if mode not in ("extract", "remove", "convert"):
        raise HTTPException(400, "mode는 extract, remove, convert 중 하나여야 합니다")
    if not 0 <= strength <= 1:  # also rejects NaN
        raise HTTPException(400, "strength는 0~1이어야 합니다")
    if mode == "convert" and steps not in (4, 10):
        raise HTTPException(400, "steps는 4 또는 10이어야 합니다")
    x = decode(audio)
    mix = crop(x, start, end, "처리", MAX_SECONDS)
    if mode == "convert" and len(mix) > engine.MAX_VC_SOURCE * SR:
        raise HTTPException(400, f"변환할 구간은 최대 {engine.MAX_VC_SOURCE}초입니다")
    enroll = crop(decode(ref) if ref and ref.filename else x, ref_start, ref_end, "기준 목소리")
    try:
        engine.check_enrollment(enroll)
    except ValueError as e:
        raise HTTPException(400, f"기준 목소리 구간: {e}")
    if mode == "convert" and len(enroll) > engine.MAX_VC_REFERENCE * SR:
        raise HTTPException(400, f"기준 목소리 구간은 최대 {engine.MAX_VC_REFERENCE}초입니다")
    with lock:
        if mode == "convert":
            try:
                out = engine.convert(mix, enroll, steps)
            except RuntimeError as e:
                raise HTTPException(503, str(e))
        else:
            out = engine.extract(mix, enroll) if mode == "extract" else engine.remove(mix, enroll, strength)
    buf = io.BytesIO()
    sf.write(buf, out.astype(np.float32), SR, format="WAV", subtype="FLOAT")
    return Response(buf.getvalue(), media_type="audio/wav")


MAX_BLOCK = 4 * SR


def pcm(data, max_n, name):
    if len(data) % 4 or not data:
        raise ValueError(f"{name} 길이가 올바르지 않습니다")
    x = np.frombuffer(data, dtype="<f4").astype(np.float32)
    if len(x) > max_n or not np.isfinite(x).all():
        raise ValueError(f"{name}이(가) 너무 길거나 유효하지 않은 값이 있습니다")
    return x


def infer(sup, block):
    with lock:  # shared with /api/process
        return sup.push(block)


@app.websocket("/ws/stream")
async def stream(ws: WebSocket):
    await ws.accept()
    try:
        try:
            n = json.loads(await ws.receive_text())["enroll_seconds"]
            if isinstance(n, bool) or not isinstance(n, (int, float)) or not np.isfinite(n) or not 1 <= n <= 30:
                raise ValueError("enroll_seconds는 1~30이어야 합니다")
            enroll = pcm(await ws.receive_bytes(), 30 * SR, "등록 음성")
            if abs(len(enroll) - n * SR) > SR / 10:
                raise ValueError("등록 음성 길이가 enroll_seconds와 맞지 않습니다")
            engine.check_enrollment(enroll)
            sup = await asyncio.to_thread(lambda: engine.StreamSuppressor(enroll, engine.load_extractor()))
        except (ValueError, KeyError, TypeError) as e:  # json errors are ValueError
            await ws.send_text(json.dumps({"error": f"잘못된 요청: {e}"}, ensure_ascii=False))
            await ws.close()
            return
        await ws.send_text('{"ready": true}')
        while True:
            try:
                block = pcm(await ws.receive_bytes(), MAX_BLOCK, "블록")
            except (ValueError, KeyError) as e:  # KeyError: text frame instead of binary
                await ws.send_text(json.dumps({"error": f"잘못된 블록: {e}"}, ensure_ascii=False))
                await ws.close()
                return
            await ws.send_bytes((await asyncio.to_thread(infer, sup, block)).astype("<f4").tobytes())
    except (WebSocketDisconnect, RuntimeError):  # RuntimeError: receive after the client already closed
        pass  # ponytail: a block mid-inference at disconnect still finishes before the lock frees


def main():
    import uvicorn
    ap = argparse.ArgumentParser()
    ap.add_argument("port", nargs="?", type=int, default=8000)
    ap.add_argument("--host", default="127.0.0.1", help="0.0.0.0 to accept other devices (no auth)")
    # Browsers allow the mic and AudioWorklet only on https or localhost.
    ap.add_argument("--ssl-certfile")
    ap.add_argument("--ssl-keyfile")
    args = ap.parse_args()
    uvicorn.run(app, host=args.host, port=args.port, ssl_certfile=args.ssl_certfile, ssl_keyfile=args.ssl_keyfile)
