"""Buffered PCM streaming experiment; no low-latency or hardware I/O claim."""
import argparse
import contextlib
import json
from pathlib import Path
import sys
import time
import numpy as np
from .cli import read_audio
from .engine import DEFAULT_MODEL_DIR, DEFAULT_VENDOR_DIR, StreamSuppressor, load_extractor, check_enrollment


def main():
    p = argparse.ArgumentParser(description="stdin mono float32 PCM 16k -> stdout mono float32 PCM 16k")
    p.add_argument("--enroll", type=Path, required=True)
    p.add_argument("--model-dir", type=Path, default=DEFAULT_MODEL_DIR)
    p.add_argument("--vendor-dir", type=Path, default=DEFAULT_VENDOR_DIR)
    p.add_argument("--report", type=Path, required=True)
    p.add_argument("--block-seconds", type=float, default=2)
    p.add_argument("--context-seconds", type=float, default=2)
    p.add_argument("--hard-threshold", type=float, default=0.65)
    p.add_argument("--mask-power", type=float, default=4)
    args = p.parse_args()
    if not 0.5 <= args.block_seconds <= 10 or not 0 <= args.context_seconds <= 10:
        p.error("block must be 0.5–10 seconds and context 0–10 seconds")
    if not np.isfinite(args.mask_power) or args.mask_power <= 0:
        p.error("mask-power must be positive and finite")
    if not 0 < args.hard_threshold <= 1 or not np.isfinite(args.hard_threshold):
        p.error("hard-threshold must be in (0, 1]")
    if args.report.exists():
        p.error("report already exists; choose a new path")
    if args.report.resolve() == args.enroll.resolve():
        p.error("report cannot overwrite enrollment")
    enrollment, _ = read_audio(args.enroll)
    try:
        check_enrollment(enrollment)
    except ValueError:
        p.error("enrollment needs at least one second of non-silent audio")
    # Reserve stdout for raw audio, including during upstream model initialization.
    with contextlib.redirect_stdout(sys.stderr):
        suppressor = StreamSuppressor(enrollment, load_extractor(args.model_dir, args.vendor_dir),
                                      args.context_seconds, args.mask_power, args.hard_threshold)
    print("READY: float32 mono 16000 Hz", file=sys.stderr, flush=True)
    block = round(args.block_seconds * 16000)
    rows = []
    started = time.perf_counter()
    offset = 0
    while True:
        payload = sys.stdin.buffer.read(block * 4)
        if not payload:
            break
        if len(payload) % 4:
            raise ValueError("incomplete float32 PCM sample")
        current = np.frombuffer(payload, dtype="<f4").copy()
        begin = time.perf_counter()
        filtered = suppressor.push(current)
        sys.stdout.buffer.write(filtered.astype("<f4").tobytes())
        sys.stdout.buffer.flush()
        elapsed = time.perf_counter()-begin
        rows.append({"start":offset/16000,"duration":len(current)/16000,"processing_seconds":elapsed,
                     "emitted_seconds_since_ready":time.perf_counter()-started})
        offset += len(current)
    args.report.parent.mkdir(parents=True,exist_ok=True)
    args.report.write_text(json.dumps({"sample_rate":16000,"samples":offset,"block_seconds":args.block_seconds,
        "context_seconds":args.context_seconds,"mask_power":args.mask_power,"hard_threshold":args.hard_threshold,
        "model_dir":str(args.model_dir.resolve()),"elapsed_seconds":time.perf_counter()-started,
        "note":"Buffered noncausal model. Block accumulation + inference delay; microphone/DAC delay not measured.",
        "blocks":rows},indent=2)+"\n")
