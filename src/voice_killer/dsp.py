"""Suppression operates on estimated target components, never whole speech intervals."""
import math
import numpy as np
from scipy import signal


def resample(audio, source_rate, target_rate):
    if source_rate == target_rate:
        return np.asarray(audio, dtype=np.float32)
    divisor = math.gcd(source_rate, target_rate)
    return signal.resample_poly(audio, target_rate // divisor, source_rate // divisor, axis=0).astype(np.float32)


def suppress(mixture, target, strength=1.0, method="mask", mask_power=4.0, hard_threshold=0.65):
    """Mono 16 kHz mixture and aligned, unnormalized target estimate."""
    if not 0 <= strength <= 1 or not np.isfinite(strength):
        raise ValueError("strength must be in [0, 1]")
    if mask_power <= 0 or not np.isfinite(mask_power):
        raise ValueError("mask_power must be positive and finite")
    if not 0 < hard_threshold <= 1 or not np.isfinite(hard_threshold):
        raise ValueError("hard_threshold must be in (0, 1]")
    mixture = np.asarray(mixture, dtype=np.float32)
    target = np.asarray(target, dtype=np.float32)
    if mixture.ndim != 1 or target.shape != mixture.shape or not len(mixture):
        raise ValueError("mixture and target must be nonempty aligned mono arrays")
    if not np.isfinite(mixture).all() or not np.isfinite(target).all():
        raise ValueError("audio must be finite")
    if strength == 0:
        return mixture.copy()
    if method == "subtract":
        return mixture - strength * target
    if method != "mask":
        raise ValueError("method must be mask or subtract")
    # Pad short inputs to keep STFT parameters consistent.
    n = len(mixture)
    x = np.pad(mixture, (0, max(0, 512 - n)))
    s = np.pad(target, (0, max(0, 512 - n)))
    _, _, X = signal.stft(x, nperseg=512, noverlap=384)
    _, _, S = signal.stft(s, nperseg=512, noverlap=384)
    residual = X - S
    # Wiener-like target ratio. Power > 1 sharpens the target/non-target decision.
    target_magnitude = np.abs(S)
    residual_magnitude = np.abs(residual)
    total = target_magnitude + residual_magnitude
    # Normalize before exponentiation: raw STFT powers underflow on quiet audio.
    target_share = np.divide(target_magnitude, total, out=np.zeros_like(total), where=total > 0)
    target_power = target_share ** mask_power
    residual_power = (1 - target_share) ** mask_power
    mask = target_power / np.maximum(target_power + residual_power, np.finfo(np.float32).tiny)
    # Cut confidently target-dominated bins to zero: avoid faint intelligible speech.
    # Threshold 1 leaves the soft mask unchanged except a pure-target bin.
    mask = np.where(target_share >= hard_threshold, 1.0, mask)
    _, y = signal.istft(X * (1 - strength * mask), nperseg=512, noverlap=384)
    return y[:n].astype(np.float32)
