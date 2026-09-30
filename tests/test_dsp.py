import numpy as np
import pytest
from voice_killer.dsp import suppress, resample


def test_subtraction_preserves_simultaneous_non_target():
    t = np.arange(16000) / 16000
    target = .25 * np.sin(2 * np.pi * 330 * t)
    audience = .1 * np.sin(2 * np.pi * 2200 * t)
    output = suppress(target + audience, target, method="subtract")
    np.testing.assert_allclose(output, audience, atol=5e-8)


def test_mask_suppresses_target_without_muting_overlap():
    t = np.arange(32000) / 16000
    target = .25 * np.sin(2 * np.pi * 312.5 * t)
    audience = .1 * np.sin(2 * np.pi * 2250 * t)
    output = suppress(target + audience, target, method="mask", mask_power=2)
    target_gain = np.dot(output, target) / np.dot(target, target)
    audience_gain = np.dot(output, audience) / np.dot(audience, audience)
    assert abs(target_gain) < .02
    assert audience_gain > .98


def test_zero_strength_is_identity():
    x = np.random.default_rng(0).normal(size=128).astype(np.float32)
    np.testing.assert_array_equal(suppress(x, x, strength=0), x)


@pytest.mark.parametrize("length", [1, 127, 512, 1001, 16000])
def test_no_target_preserves_signal_and_length(length):
    x = np.random.default_rng(4).normal(size=length).astype(np.float32) * .1
    y = suppress(x, np.zeros_like(x))
    assert len(y) == length
    np.testing.assert_allclose(y, x, atol=1e-7)


def test_resampling_and_silence_are_finite():
    x = resample(np.zeros(48001, dtype=np.float32), 48000, 16000)
    assert len(x) == 16001
    assert np.isfinite(suppress(x, x)).all()


def test_invalid_shape_and_parameters_rejected():
    for kwargs in [{"strength": 1.1}, {"strength": float("nan")}, {"mask_power": 0}]:
        with pytest.raises(ValueError):
            suppress(np.zeros(512), np.zeros(512), **kwargs)
    with pytest.raises(ValueError):
        suppress(np.zeros(512), np.zeros(513))


def test_mask_is_scale_invariant_at_high_power():
    t = np.arange(16000) / 16000
    target = .25 * np.sin(2 * np.pi * 312.5 * t)
    other = .1 * np.sin(2 * np.pi * 2250 * t)
    y = suppress(target + other, target, mask_power=8)
    quiet = suppress((target + other) * .0001, target * .0001, mask_power=8)
    np.testing.assert_allclose(quiet / .0001, y, atol=2e-7)


def test_confident_target_bins_are_removed_not_just_made_quieter():
    t = np.arange(16000) / 16000
    x = (.2 * np.sin(2 * np.pi * 312.5 * t)).astype(np.float32)
    # Checkpoint estimates can have a different global scale from the mixture.
    y = suppress(x, 1.26 * x)
    assert np.sqrt(np.mean(y*y)) < 1e-7
    soft = suppress(x, 1.26*x, hard_threshold=1)
    assert np.sqrt(np.mean(soft*soft)) > 1e-5
