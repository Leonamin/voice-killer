"""Export pooled STFT magnitudes of the controlled speech + audience mix for the web 'principle' tab.

Writes web/src/data/spectrogram.json: mixture X, model target estimate S and residual R = X - S,
each pooled to ROWS x COLS and stored as dB in uint8 (base64). Magnitudes only, no phase: audio cannot be rebuilt from it.
"""
from pathlib import Path
import base64
import json
import numpy as np
from scipy import signal
from voice_killer.cli import read_audio
from voice_killer.model import TargetExtractor

root = Path(__file__).resolve().parents[1]
ROWS, COLS, SECONDS = 40, 100, 8.0
DB_FLOOR = -90.0  # relative to the loudest pooled cell of X
source = root / "data/source/iphone-2007.wav"
speech, _ = read_audio(source, 39.8, 8.8)
audience, _ = read_audio(source, 49.5, 8.8)
enroll, _ = read_audio(root / "data/jobs-enroll.wav")
rms = lambda x: np.sqrt(np.mean(x.astype(np.float64) ** 2))
speech *= .08 / rms(speech)
audience *= .08 / rms(audience)
mix = (speech + audience)[: int(SECONDS * 16000)]
target, _ = TargetExtractor(root / "models/real-tse/spk_emb_100", root / "vendor/wesep-real-tse").extract(mix, enroll)
_, _, X = signal.stft(mix, nperseg=512, noverlap=384)
_, _, S = signal.stft(target.astype(np.float32), nperseg=512, noverlap=384)
mags = {"x": np.abs(X), "s": np.abs(S), "r": np.abs(X - S)}


def pool(m):  # mean magnitude over blocks; frequency 0..8 kHz bottom to top
    f = np.array_split(np.arange(m.shape[0] - 1), ROWS)  # drop the Nyquist bin so 256 bins split evenly
    t = np.array_split(np.arange(m.shape[1]), COLS)
    return np.array([[m[np.ix_(fr, tc)].mean() for tc in t] for fr in f])[::-1]  # row 0 = highest frequency


pooled = {k: pool(v) for k, v in mags.items()}
top = pooled["x"].max()
out = {"rows": ROWS, "cols": COLS, "seconds": SECONDS, "dbFloor": DB_FLOOR}
for k, v in pooled.items():
    db = 20 * np.log10(np.maximum(v / top, 1e-9))
    q = np.clip(np.round((db - DB_FLOOR) / -DB_FLOOR * 255), 0, 255).astype(np.uint8)
    out[k] = base64.b64encode(q.tobytes()).decode()
dest = root / "web/src/data/spectrogram.json"
dest.write_text(json.dumps(out) + "\n")
print(dest, dest.stat().st_size, "bytes")
