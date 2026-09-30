"""Controlled overlap uses separate Jobs and audience excerpts as known components.
It complements (does not replace) evaluation on natural simultaneous applause.
"""
from pathlib import Path
import json
import numpy as np
import soundfile as sf
from voice_killer.cli import read_audio
from voice_killer.dsp import suppress
from voice_killer.model import TargetExtractor

root = Path(__file__).resolve().parents[1]
out = root / "outputs/controlled"
out.mkdir(parents=True, exist_ok=True)
source = root / "data/source/iphone-2007.wav"
# Excludes the enrollment [12.4,19.4]. These are source-interval labels,
# not studio isolated stems: room noise still exists in the speech excerpt.
speech, _ = read_audio(source, 39.8, 8.8)
audience, _ = read_audio(source, 49.5, 8.8)
enroll, _ = read_audio(root / "data/jobs-enroll.wav")
rms = lambda x: np.sqrt(np.mean(x.astype(np.float64) ** 2))
# Fixed scaling shared by mixture and ground-truth components; no output boost.
speech *= .08 / rms(speech)
audience *= .08 / rms(audience)
model = TargetExtractor(root / "models/real-tse/spk_emb_100", root / "vendor/wesep-real-tse")
results = {}
for name, mixture in [("speech_only", speech), ("audience_only", audience), ("overlap_equal_rms", speech + audience)]:
    target, timing = model.extract(mixture, enroll)
    sf.write(out / (name + ".original.wav"), mixture, 16000, subtype="FLOAT")
    rows = {}
    for method, power in [("subtract", 1), ("mask", 1), ("mask", 2), ("mask", 4), ("mask", 8), ("mask_hard", 4)]:
        variant = method + (str(power) if method == "mask" else "")
        y = suppress(mixture, target, method="mask" if method == "mask_hard" else method, mask_power=power, hard_threshold=.65 if method == "mask_hard" else 1)
        sf.write(out / (name + "." + variant + ".wav"), y, 16000, subtype="FLOAT")
        row = {"rms_change_db": float(20 * np.log10((rms(y)+1e-12)/(rms(mixture)+1e-12)))}
        if name == "overlap_equal_rms":
            # Joint least-squares component gains are diagnostic, not perceptual scores.
            gains = np.linalg.lstsq(np.stack([speech, audience], axis=1), y, rcond=None)[0]
            row.update({"speech_component_gain_db": float(20*np.log10(abs(gains[0])+1e-12)),
                        "audience_component_gain_db": float(20*np.log10(abs(gains[1])+1e-12)),
                        "audience_error_snr_db": float(10*np.log10(np.sum(audience**2)/(np.sum((y-audience)**2)+1e-12)))})
        rows[variant] = row
    results[name] = rows
    print(name, rows, flush=True)
sf.write(out / "speech_component.wav", speech, 16000, subtype="FLOAT")
sf.write(out / "audience_component.wav", audience, 16000, subtype="FLOAT")
(out / "metrics.json").write_text(json.dumps({"source_intervals": {"speech": [39.8,48.6], "audience": [49.5,58.3]}, "results": results}, indent=2)+"\n")
