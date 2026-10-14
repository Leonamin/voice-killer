"""Small engine API shared by the CLIs and the web server."""
import functools
from pathlib import Path
import numpy as np
import torch
from .dsp import suppress

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
