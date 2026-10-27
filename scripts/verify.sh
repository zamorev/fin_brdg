#!/usr/bin/env bash
# Agent feedback loop: run before marking a task done or opening PR.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

PYTHON="${PYTHON:-}"
if [[ -z "$PYTHON" ]]; then
  if [[ -x "$ROOT/.venv/bin/python" ]]; then
    PYTHON="$ROOT/.venv/bin/python"
  else
    PYTHON="python3"
  fi
fi

echo "== fin_brdg verify =="
echo "python: $PYTHON"

export PYTHONPYCACHEPREFIX="$ROOT/.pycache"
"$PYTHON" -m compileall -q app src

if "$PYTHON" -m pytest --version >/dev/null 2>&1; then
  "$PYTHON" -m pytest -q tests/
else
  echo "pytest not installed; run: pip install -r requirements.txt"
  exit 1
fi

echo "OK"
