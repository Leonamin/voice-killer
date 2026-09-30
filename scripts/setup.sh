#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
command -v uv >/dev/null
if [ ! -x .venv/bin/python ]; then
    uv venv --python 3.11 .venv
fi
.venv/bin/python -c 'import sys; assert sys.version_info[:2] == (3, 11), "Python 3.11 environment required"'
uv pip install --python .venv/bin/python -r requirements-lock.txt
uv pip install --python .venv/bin/python --no-deps 'git+https://github.com/wenet-e2e/wespeaker.git@8f53b6485d9f88a207bd17e7f8dba899495ec794'
uv pip install --python .venv/bin/python --no-deps -e .
mkdir -p vendor models
revision=2a540977a348fbaa92e623210505430e2cec608d
if [ ! -d vendor/wesep-real-tse ]; then
    git clone https://github.com/REAL-TSE/wesep-real-tse.git vendor/wesep-real-tse
    git -C vendor/wesep-real-tse checkout --detach "$revision"
fi
test "$(git -C vendor/wesep-real-tse rev-parse HEAD)" = "$revision"
test -z "$(git -C vendor/wesep-real-tse status --porcelain)"
.venv/bin/python scripts/download_model.py
printf '%s\n' 'Setup complete. Run .venv/bin/voice-killer --help'
