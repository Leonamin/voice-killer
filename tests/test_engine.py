from pathlib import Path
import numpy as np
import pytest
from voice_killer.engine import StreamSuppressor, check_enrollment


def test_check_enrollment_rejects_silence_and_short():
    with pytest.raises(ValueError):
        check_enrollment(np.zeros(16000, dtype=np.float32))
    with pytest.raises(ValueError):
        check_enrollment(np.ones(100, dtype=np.float32))


@pytest.mark.skipif(not Path("models/real-tse/spk_emb_100/avg_model.pt").exists(), reason="model missing")
def test_stream_suppressor_keeps_block_length():
    rng = np.random.default_rng(0)
    s = StreamSuppressor(rng.normal(0, .1, 32000).astype(np.float32))
    for _ in range(3):
        out = s.push(rng.normal(0, .1, 16000).astype(np.float32))
        assert out.shape == (16000,) and np.isfinite(out).all()
