#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
command -v uv >/dev/null
revision=51383efd921027683c89e5348211d93ff12ac2a8
mkdir -p vendor
if [ ! -d vendor/seed-vc ]; then
    git clone https://github.com/Plachtaa/seed-vc.git vendor/seed-vc
    git -C vendor/seed-vc checkout --detach "$revision"
fi
test "$(git -C vendor/seed-vc rev-parse HEAD)" = "$revision"
if [ ! -x .venv-seedvc/bin/python ]; then
    uv venv --python 3.11 .venv-seedvc
fi
.venv-seedvc/bin/python -c 'import sys; assert sys.version_info[:2] == (3, 11), "Python 3.11 environment required"'
# torch/torchaudio pins carry +cpu local versions, served only by the PyTorch CPU index
uv pip install --python .venv-seedvc/bin/python --extra-index-url https://download.pytorch.org/whl/cpu --index-strategy unsafe-best-match -r requirements-vc-lock.txt
# Seed-VC downloads its checkpoints into vendor/seed-vc/checkpoints and the HF cache on first run
printf '%s\n' 'VC setup complete. Weights download on first conversion.'
