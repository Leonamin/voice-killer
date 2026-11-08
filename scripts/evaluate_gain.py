"""Sweep strength (1 = reduce fully, 0 = unchanged, negative = boost) on the controlled
speech + audience mixture. Components are source-interval excerpts, not studio stems."""
from pathlib import Path
import json
import numpy as np
import soundfile as sf
from voice_killer.cli import read_audio
from voice_killer.dsp import suppress
from voice_killer.model import TargetExtractor

root = Path(__file__).resolve().parents[1]
out = root / "outputs/gain"
out.mkdir(parents=True, exist_ok=True)
source = root / "data/source/iphone-2007.wav"
speech, _ = read_audio(source, 39.8, 8.8)
audience, _ = read_audio(source, 49.5, 8.8)
enroll, _ = read_audio(root / "data/jobs-enroll.wav")
rms = lambda x: np.sqrt(np.mean(x.astype(np.float64) ** 2))
speech *= .08 / rms(speech)
audience *= .08 / rms(audience)
mixture = speech + audience
model = TargetExtractor(root / "models/real-tse/spk_emb_100", root / "vendor/wesep-real-tse")
target, _ = model.extract(mixture, enroll)
sf.write(out / "mixture.wav", mixture, 16000, subtype="FLOAT")
rows = {}
for strength in [1, .5, 0, -1, -2, -4]:
    y = suppress(mixture, target, strength=strength)  # default: mask p=4 + hard 0.65
    g = np.linalg.lstsq(np.stack([speech, audience], axis=1), y, rcond=None)[0]
    rows[str(strength)] = {"speech_gain_db": float(20 * np.log10(abs(g[0]) + 1e-12)),
                           "audience_gain_db": float(20 * np.log10(abs(g[1]) + 1e-12)),
                           "peak": float(np.abs(y).max())}
    sf.write(out / f"strength_{strength}.wav", y, 16000, subtype="FLOAT")
    print(strength, rows[str(strength)], flush=True)
(out / "metrics.json").write_text(json.dumps(rows, indent=2) + "\n")
