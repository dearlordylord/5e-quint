#!/usr/bin/env bash
set -euo pipefail

venv=".scratch/srd521-ocr-venv"
python="$venv/bin/python"

if [[ ! -x "$python" ]]; then
  uv venv --python 3.11 "$venv"
  uv pip install --python "$python" \
    rapidocr==3.4.2 PyMuPDF==1.28.2 onnxruntime==1.23.2
  uv pip uninstall --python "$python" opencv-python
  uv pip install --python "$python" --reinstall opencv-python-headless==4.12.0.88
fi

exec "$python" scripts/srd521/verify-ocr.py
