#!/usr/bin/env bash
# Optional add-on: reference-voice candidate search (sherpa-onnx diarization). Models go to models/diarize (git-ignored).
set -euo pipefail
cd "$(dirname "$0")/.."
uv pip install --python .venv/bin/python 'sherpa-onnx==1.13.8'
mkdir -p models/diarize
base=https://github.com/k2-fsa/sherpa-onnx/releases/download
[ -f models/diarize/sherpa-onnx-pyannote-segmentation-3-0/model.onnx ] || {
    curl -fsSL "$base/speaker-segmentation-models/sherpa-onnx-pyannote-segmentation-3-0.tar.bz2" | tar xj -C models/diarize
}
[ -f models/diarize/emb.onnx ] || curl -fsSL -o models/diarize/emb.onnx "$base/speaker-recongition-models/wespeaker_en_voxceleb_resnet34.onnx"
echo "Done. Restart voice-killer-web."
