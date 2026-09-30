"""Adapter for the pinned REAL-TSE baseline, preserving the checkpoint's amplitude."""
from pathlib import Path
import sys
import importlib.util
import importlib.machinery
import types
import yaml
import time
import numpy as np
import torch


class TargetExtractor:
    sample_rate = 16000

    def __init__(self, model_dir, vendor_dir, device="cpu", threads=6):
        vendor_dir = Path(vendor_dir).resolve()
        if not (vendor_dir / "wesep").is_dir():
            raise FileNotFoundError("REAL-TSE source missing; run scripts/setup.sh")
        # Upstream package __init__ eagerly imports training/ASR/diarization CLIs.
        # Mount their unchanged core modules without those optional entry points.
        # This avoids unrelated dependencies and an observed macOS shutdown abort.
        speaker_spec = importlib.util.find_spec("wespeaker")
        if speaker_spec is None:
            raise ModuleNotFoundError("Install the pinned wespeaker source via scripts/setup.sh")
        for name, directory in [("wespeaker", Path(speaker_spec.origin).parent),
                                ("wesep", vendor_dir / "wesep")]:
            if name not in sys.modules:
                package = types.ModuleType(name)
                package.__path__ = [str(directory)]
                package.__package__ = name
                package.__spec__ = importlib.machinery.ModuleSpec(name, loader=None, is_package=True)
                package.__spec__.submodule_search_locations = package.__path__
                sys.modules[name] = package
        from wesep.models import get_model
        torch.set_num_threads(threads)
        torch.manual_seed(42)
        config = yaml.safe_load((Path(model_dir) / "config.yaml").read_text())
        model_config = config["model_args"]["tse_model"]
        def clear_pretrained(value):
            if isinstance(value, dict):
                return {key: None if key == "pretrained" else clear_pretrained(item)
                        for key, item in value.items()}
            return value
        self.model = get_model(config["model"]["tse_model"])(clear_pretrained(model_config))
        states = torch.load(Path(model_dir) / "avg_model.pt", map_location="cpu", weights_only=True)
        self.model.load_state_dict(states["models"][0], strict=True)
        self.model.eval().to(device)
        if model_config["separator"]["sr"] != self.sample_rate:
            raise ValueError("This adapter supports only the 16 kHz REAL-TSE checkpoints")
        self.device = device

    def extract(self, mixture, enrollment, chunk_seconds=12.0, overlap_seconds=2.0):
        if chunk_seconds <= overlap_seconds or overlap_seconds < 0 or chunk_seconds < 1:
            raise ValueError("require chunk >= 1 second and 0 <= overlap < chunk")
        n = len(mixture)
        if not n or not len(enrollment):
            raise ValueError("empty mixture or enrollment")
        chunk = round(chunk_seconds * self.sample_rate)
        overlap = round(overlap_seconds * self.sample_rate)
        step = chunk - overlap
        output = np.zeros(n, dtype=np.float64)
        weights = np.zeros(n, dtype=np.float64)
        enrollment_tensor = torch.from_numpy(np.asarray(enrollment, dtype=np.float32)).unsqueeze(0)
        timings = []
        for start in range(0, n, step):
            end = min(n, start + chunk)
            length = end - start
            # Baseline iSTFT has no length argument: align to its 128-sample hop.
            padded_length = max(512, ((length + 127) // 128) * 128)
            segment = np.pad(mixture[start:end], (0, padded_length - length))
            begin = time.perf_counter()
            with torch.inference_mode():
                estimate = self.model(
                    torch.from_numpy(segment.astype(np.float32)).unsqueeze(0).to(self.device),
                    enrollment_tensor.to(self.device),
                ).reshape(-1).cpu().numpy()[:length]
            elapsed = time.perf_counter() - begin
            if estimate.shape != (length,) or not np.isfinite(estimate).all():
                raise RuntimeError("model returned invalid waveform")
            window = np.ones(length)
            fade = min(overlap, length)
            if start and fade:
                window[:fade] = np.linspace(0, 1, fade, endpoint=False)
            if end < n and fade:
                window[-fade:] = np.minimum(window[-fade:], np.linspace(1, 0, fade, endpoint=False))
            output[start:end] += estimate * window
            weights[start:end] += window
            timings.append({"start": start / self.sample_rate, "end": end / self.sample_rate, "seconds": elapsed})
            print(f"target {end / self.sample_rate:.1f}/{n / self.sample_rate:.1f}s ({elapsed:.2f}s)", flush=True)
            if end == n:
                break
        if np.any(weights <= 0):
            raise RuntimeError("uncovered samples in overlap-add")
        return (output / weights).astype(np.float32), timings
