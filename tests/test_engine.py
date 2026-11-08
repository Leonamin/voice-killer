import numpy as np
import pytest
from voice_killer.engine import check_enrollment


def test_check_enrollment_rejects_silence_and_short():
    with pytest.raises(ValueError):
        check_enrollment(np.zeros(16000, dtype=np.float32))
    with pytest.raises(ValueError):
        check_enrollment(np.ones(100, dtype=np.float32))
