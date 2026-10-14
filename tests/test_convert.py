import numpy as np
import pytest
import soundfile as sf
from voice_killer import engine

pytestmark = pytest.mark.skipif(not engine.vc_available(), reason="run scripts/setup_vc.sh")
EXAMPLES = engine.ROOT / "vendor/seed-vc/examples"


def load(path):
    x, sr = sf.read(path, dtype="float32")
    return engine.resample(x.mean(axis=1) if x.ndim > 1 else x, sr, 16000)


def test_convert_keeps_length():
    x = load(EXAMPLES / "source/source_s1.wav")[:3 * 16000]
    out = engine.convert(x, load(EXAMPLES / "reference/s1p1.wav"), steps=4)
    assert out.dtype == np.float32 and np.isfinite(out).all() and abs(len(out) - len(x)) < 0.1 * 16000
