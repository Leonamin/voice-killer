import argparse
import hashlib
import json
from pathlib import Path
import time
import numpy as np
import soundfile as sf
from .dsp import resample, suppress
from .engine import DEFAULT_MODEL_DIR, DEFAULT_VENDOR_DIR, check_enrollment


def sha256(path):
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for block in iter(lambda: f.read(1024 * 1024), b""):
            h.update(block)
    return h.hexdigest()


def read_audio(path, start=0, duration=None):
    with sf.SoundFile(path) as f:
        sr = f.samplerate
        if start < 0 or start * sr >= len(f):
            raise ValueError("start must fall inside input")
        f.seek(round(start * sr))
        frames = -1 if duration is None else round(duration * sr)
        if frames == 0 or (duration is not None and duration <= 0):
            raise ValueError("duration must be positive")
        data = f.read(frames, dtype="float32", always_2d=True)
    if not np.isfinite(data).all():
        raise ValueError("audio contains non-finite values")
    return resample(data.mean(axis=1), sr, 16000), sr


def main():
    parser = argparse.ArgumentParser(description="Suppress an enrolled speaker; writes mono 16 kHz WAV.")
    parser.add_argument("input", type=Path)
    parser.add_argument("--enroll", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--model-dir", type=Path, default=DEFAULT_MODEL_DIR)
    parser.add_argument("--vendor-dir", type=Path, default=DEFAULT_VENDOR_DIR)
    parser.add_argument("--method", choices=["mask", "subtract"], default="mask")
    parser.add_argument("--strength", type=float, default=1.0)
    parser.add_argument("--mask-power", type=float, default=4.0)
    parser.add_argument("--hard-threshold", type=float, default=0.65)
    parser.add_argument("--chunk-seconds", type=float, default=12)
    parser.add_argument("--overlap-seconds", type=float, default=2)
    parser.add_argument("--start", type=float, default=0)
    parser.add_argument("--duration", type=float)
    parser.add_argument("--device", choices=["cpu", "cuda", "mps"], default="cpu")
    parser.add_argument("--threads", type=int, default=6)
    parser.add_argument("--force", action="store_true", dest="should_overwrite")
    args = parser.parse_args()
    if not 0 <= args.strength <= 1 or not np.isfinite(args.strength):
        parser.error("strength must be in [0, 1]")
    if args.mask_power <= 0 or not np.isfinite(args.mask_power):
        parser.error("mask-power must be positive and finite")
    if not 0 < args.hard_threshold <= 1 or not np.isfinite(args.hard_threshold):
        parser.error("hard-threshold must be in (0, 1]")
    if args.output.suffix.lower() != ".wav":
        parser.error("output must have .wav extension")
    if args.threads < 1:
        parser.error("threads must be positive")
    if (not np.isfinite(args.chunk_seconds) or not np.isfinite(args.overlap_seconds)
            or args.chunk_seconds < 1 or args.overlap_seconds < 0
            or args.overlap_seconds >= args.chunk_seconds):
        parser.error("require chunk >= 1 and 0 <= overlap < chunk")
    if not np.isfinite(args.start) or (args.duration is not None and not np.isfinite(args.duration)):
        parser.error("start and duration must be finite")
    paths = {"filtered": args.output, "original": args.output.with_suffix(".original.wav"),
             "target": args.output.with_suffix(".target.wav"), "report": args.output.with_suffix(".json")}
    if any(p.resolve() in [args.input.resolve(), args.enroll.resolve()] for p in paths.values()):
        parser.error("output must not overwrite an input or enrollment file")
    if not args.should_overwrite and any(p.exists() for p in paths.values()):
        parser.error("output exists; choose another output or pass --force")
    begin = time.perf_counter()
    mixture, source_rate = read_audio(args.input, args.start, args.duration)
    enrollment, _ = read_audio(args.enroll)
    try:
        check_enrollment(enrollment)
    except ValueError:
        parser.error("enrollment must contain at least 1 second; use a clean 5–10 second segment")
    from .model import TargetExtractor
    extractor = TargetExtractor(args.model_dir, args.vendor_dir, args.device, args.threads)
    target, timings = extractor.extract(mixture, enrollment, args.chunk_seconds, args.overlap_seconds)
    filtered = suppress(mixture, target, args.strength, args.method, args.mask_power, args.hard_threshold)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    # Floating-point WAV avoids hidden normalization or clipping and supports honest A/B comparison.
    for name, waveform in [("original", mixture), ("target", target), ("filtered", filtered)]:
        sf.write(paths[name], waveform, 16000, subtype="FLOAT")
    report = {"input": str(args.input.resolve()), "input_sha256": sha256(args.input),
              "enroll": str(args.enroll.resolve()), "enroll_sha256": sha256(args.enroll),
              "model_dir": str(args.model_dir.resolve()), "checkpoint_sha256": sha256(args.model_dir / "avg_model.pt"),
              "config_sha256": sha256(args.model_dir / "config.yaml"),
              "method": args.method, "strength": args.strength, "mask_power": args.mask_power, "hard_threshold": args.hard_threshold,
              "device": args.device, "source_rate": source_rate, "output_rate": 16000,
              "start": args.start, "duration": len(mixture) / 16000, "channels": 1,
              "chunk_seconds": args.chunk_seconds, "overlap_seconds": args.overlap_seconds,
              "elapsed_seconds": time.perf_counter() - begin, "chunks": timings,
              "output_peak": float(np.max(np.abs(filtered))),
              "outputs": {key: {"path": str(value.resolve()), "sha256": sha256(value)}
                          for key, value in paths.items() if key != "report"}}
    paths["report"].write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n")
    print(f"Saved {args.output}; {report['duration']:.2f}s audio, {report['elapsed_seconds']:.2f}s processing")
