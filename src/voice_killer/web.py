"""Local web demo: POST /api/process crops and adjusts one speaker's level; POST /api/candidates finds reference spans."""
import argparse
import contextlib
import io
import subprocess
import tempfile
import threading
import numpy as np
import soundfile as sf
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.responses import HTMLResponse, Response
from fastapi.staticfiles import StaticFiles
from . import candidates, engine

SR = 16000
MAX_BYTES = 200 * 1024 * 1024  # ponytail: the 10-min stereo 48 kHz demo wav is 119 MB; whole upload sits in RAM
MAX_SECONDS = 600
lock = threading.Lock()  # ponytail: global lock, one request at a time; waiters get no order guarantee or ticket
count_lock, pending = threading.Lock(), 0  # requests running or waiting for `lock`


@contextlib.contextmanager
def slot():
    """Hold the model lock; `pending` counts this request from the moment it starts waiting."""
    global pending
    with count_lock:
        pending += 1
    try:
        with lock:
            yield
    finally:
        with count_lock:
            pending -= 1


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


@app.get("/api/queue")
def queue():
    return {"pending": pending}


@app.post("/api/process")
def process(audio: UploadFile = File(...), start: float = Form(0.0), end: float = Form(...), ref: UploadFile | None = File(None),
            ref_start: float = Form(0.0), ref_end: float = Form(...), strength: float = Form(1.0),
            keep: bool = Form(False), mask_power: float = Form(4.0)):
    if not 0 < mask_power <= 16:  # also rejects NaN
        raise HTTPException(400, "mask_power는 0 초과 16 이하여야 합니다")
    if not -4 <= strength <= 1:  # also rejects NaN; negative = boost
        raise HTTPException(400, "strength는 -4~1이어야 합니다")
    if keep and strength < 0:
        raise HTTPException(400, "나머지 줄이기의 strength는 0~1이어야 합니다")
    x = decode(audio)
    mix = crop(x, start, end, "처리", MAX_SECONDS)
    enroll = crop(decode(ref) if ref and ref.filename else x, ref_start, ref_end, "기준 목소리")
    try:
        engine.check_enrollment(enroll)
    except ValueError as e:
        raise HTTPException(400, f"기준 목소리 구간: {e}")
    with slot():
        out = engine.remove(mix, enroll, strength, mask_power=mask_power, should_keep_target=keep)
    buf = io.BytesIO()
    sf.write(buf, out.astype(np.float32), SR, format="WAV", subtype="FLOAT")
    return Response(buf.getvalue(), media_type="audio/wav")


@app.post("/api/candidates")
def find_candidates(audio: UploadFile = File(...), start: float = Form(0.0), end: float = Form(...), num_speakers: int = Form(0)):
    if not 0 <= num_speakers <= 10:
        raise HTTPException(400, "화자 수는 0(자동)~10이어야 합니다")
    if not candidates.available():
        raise HTTPException(503, "후보 탐색 모델이 없습니다. scripts/setup_diarize.sh 를 실행하세요")
    x = crop(decode(audio), start, end, "탐색", MAX_SECONDS)
    with slot():
        return candidates.find(x, offset=start, num_speakers=num_speakers)


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
