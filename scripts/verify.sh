#!/usr/bin/env bash
# Agent feedback loop: run before marking a task done or opening PR.
# Проверка типов TS без записи файлов (dist/, lib/, *.tsbuildinfo не трогаем).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "== fin_brdg verify =="
echo "node: $(node -v)"

for dir in v2/web functions; do
  if [[ ! -d "$dir/node_modules" ]]; then
    echo "$dir: нет node_modules; run: (cd $dir && npm install)" >&2
    exit 1
  fi
  echo "-- typecheck $dir"
  (cd "$dir" && npx --no-install tsc --noEmit -p .)
done

echo "OK"
