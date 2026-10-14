"""Small engine API shared by the CLIs and the web server."""
import atexit
import functools
import json
import subprocess
import tempfile
import threading
from pathlib import Path
import numpy as np
import soundfile as sf
import torch
from .dsp import resample, suppress

DEFAULT_MODEL_DIR = Path("models/real-tse/spk_emb_100")
DEFAULT_VENDOR_DIR = Path("vendor/wesep-real-tse")


@functools.lru_cache(maxsize=1)
def load_extractor(model_dir=DEFAULT_MODEL_DIR, vendor_dir=DEFAULT_VENDOR_DIR, device="cpu", threads=6):
    from .model import TargetExtractor
    return TargetExtractor(model_dir, vendor_dir, device, threads)


def check_enrollment(enrollment):
    if len(enrollment) < 16000 or np.max(np.abs(enrollment)) < 1e-6:
        raise ValueError("enrollment must contain at least 1 second of non-silent audio")


def extract(mixture, enrollment, extractor=None, chunk_seconds=12.0, overlap_seconds=2.0):
    check_enrollment(enrollment)
    extractor = extractor or load_extractor()
    return extractor.extract(mixture, enrollment, chunk_seconds, overlap_seconds)[0]


def remove(mixture, enrollment, strength=1.0, extractor=None, mask_power=4.0, hard_threshold=0.65):
    target = extract(mixture, enrollment, extractor)
    return suppress(mixture, target, strength, "mask", mask_power, hard_threshold)


class StreamSuppressor:
    def __init__(self, enrollment, extractor=None, context_seconds=2.0, mask_power=4.0, hard_threshold=0.65):
        check_enrollment(enrollment)
        self.model = (extractor or load_extractor()).model
        self.enrollment = torch.from_numpy(np.asarray(enrollment, dtype=np.float32)).unsqueeze(0)
        self.context = round(context_seconds * 16000)
        self.mask_power, self.hard_threshold = mask_power, hard_threshold
        self.history = np.empty(0, dtype=np.float32)

    def push(self, block):
        current = np.asarray(block, dtype=np.float32)
        if current.ndim != 1 or not len(current):
            raise ValueError("block must be a nonempty 1-D array")
        if not np.isfinite(current).all():
            raise ValueError("non-finite input PCM")
        joined = np.concatenate([self.history, current])
        length = len(joined)
        padded = np.pad(joined, (0, max(512, ((length+127)//128)*128)-length))
        with torch.inference_mode():
            target = self.model(torch.from_numpy(padded).unsqueeze(0), self.enrollment).reshape(-1).numpy()[:length]
        filtered = suppress(joined, target, mask_power=self.mask_power, hard_threshold=self.hard_threshold)[len(self.history):]
        if not np.isfinite(filtered).all() or len(filtered) != len(current):
            raise RuntimeError("invalid stream output")
        self.history = joined[-self.context:] if self.context else np.empty(0, dtype=np.float32)
        return filtered


ROOT = Path(__file__).resolve().parents[2]
VC_PYTHON = ROOT / ".venv-seedvc/bin/python"
MAX_VC_SOURCE, MAX_VC_REFERENCE = 60, 30  # seconds
_worker = None
atexit.register(lambda: _worker and _worker.kill())
_worker_lock = threading.Lock()
_SETUP_HINT = "음성 변환 worker를 사용할 수 없습니다. scripts/setup_vc.sh를 실행하세요"


def vc_available():
    return VC_PYTHON.exists() and (ROOT / "vendor/seed-vc").is_dir()


def _get_worker():
    global _worker
    if _worker and _worker.poll() is None:
        return _worker
    if not vc_available():
        raise RuntimeError(_SETUP_HINT)
    p = subprocess.Popen([str(VC_PYTHON), str(ROOT / "scripts/vc_worker.py")], stdin=subprocess.PIPE, stdout=subprocess.PIPE,
                         stderr=subprocess.PIPE, text=True, cwd=ROOT)
    # ponytail: stderr drained by a thread that waits for READY then keeps discarding; no log file
    ready = threading.Event()

    def drain():
        for line in p.stderr:
            if line.strip() == "READY":
                ready.set()
    threading.Thread(target=drain, daemon=True).start()
    while not ready.wait(0.5):
        if p.poll() is not None:
            raise RuntimeError(f"{_SETUP_HINT} (worker가 시작 중 종료됨)")
    _worker = p
    return p


def convert(source, reference, steps=10):
    """Seed-VC: make `source` sound like `reference`. 16 kHz mono float32 in and out."""
    source, reference = (np.asarray(x, dtype=np.float32) for x in (source, reference))
    check_enrollment(reference)
    if len(reference) > MAX_VC_REFERENCE * 16000:
        raise ValueError(f"reference must be at most {MAX_VC_REFERENCE} seconds")
    if not len(source) or len(source) > MAX_VC_SOURCE * 16000:
        raise ValueError(f"source must be 0-{MAX_VC_SOURCE} seconds")
    if not (np.isfinite(source).all() and np.isfinite(reference).all()):
        raise ValueError("non-finite input PCM")
    if steps < 1:
        raise ValueError("steps must be positive")
    with _worker_lock, tempfile.TemporaryDirectory() as d:
        paths = {k: f"{d}/{k}.wav" for k in ("source", "reference", "output")}
        sf.write(paths["source"], source, 16000)
        sf.write(paths["reference"], reference, 16000)
        p = _get_worker()
        try:
            p.stdin.write(json.dumps({**paths, "steps": int(steps)}) + "\n")
            p.stdin.flush()
            line = p.stdout.readline()
        except OSError:
            line = ""
        if not line:
            raise RuntimeError("음성 변환 worker가 종료되었습니다. 다시 시도하세요")
        reply = json.loads(line)
        if not reply["ok"]:
            raise RuntimeError("음성 변환 실패: " + reply["error"])
        out, sr = sf.read(paths["output"], dtype="float32")
    out = out.mean(axis=1) if out.ndim > 1 else out
    return resample(out, sr, 16000).astype(np.float32)
