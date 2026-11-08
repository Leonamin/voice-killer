"""Small engine API shared by the CLIs and the web server."""
import functools
from pathlib import Path
import numpy as np
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


ROOT = Path(__file__).resolve().parents[2]
