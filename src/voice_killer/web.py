"""Local web demo: POST /api/process crops, extracts or removes a speaker."""
import argparse
import contextlib
import io
import subprocess
import tempfile
import threading
from pathlib import Path
import numpy as np
import soundfile as sf
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.responses import HTMLResponse, Response
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


@app.get("/", response_class=HTMLResponse)
def index():
    return (Path(__file__).with_name("web.html")).read_text(encoding="utf-8")


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
            ref_start: float = Form(0.0), ref_end: float = Form(...), mode: str = Form("remove"), strength: float = Form(1.0)):
    if mode == "convert":
        raise HTTPException(501, "음성 변환은 아직 구현되지 않았습니다")
    if mode not in ("extract", "remove"):
        raise HTTPException(400, "mode는 extract, remove, convert 중 하나여야 합니다")
    if not 0 <= strength <= 1:  # also rejects NaN
        raise HTTPException(400, "strength는 0~1이어야 합니다")
    x = decode(audio)
    mix = crop(x, start, end, "처리", MAX_SECONDS)
    enroll = crop(decode(ref) if ref and ref.filename else x, ref_start, ref_end, "참조")
    try:
        engine.check_enrollment(enroll)
    except ValueError as e:
        raise HTTPException(400, f"참조 구간: {e}")
    with lock:
        out = engine.extract(mix, enroll) if mode == "extract" else engine.remove(mix, enroll, strength)
    buf = io.BytesIO()
    sf.write(buf, out.astype(np.float32), SR, format="WAV", subtype="FLOAT")
    return Response(buf.getvalue(), media_type="audio/wav")


def main():
    import uvicorn
    ap = argparse.ArgumentParser()
    ap.add_argument("port", nargs="?", type=int, default=8000)
    uvicorn.run(app, host="127.0.0.1", port=ap.parse_args().port)
