#!/usr/bin/env bash
# Agent feedback loop: run before marking a task done or opening PR.
# Типы, тесты functions, сборка фронта во временную папку и границы слоёв (docs/ARCHITECTURE.md).
# Файлы в репозитории не меняет: dist/, lib/, *.tsbuildinfo не трогаем.
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

echo "-- tests functions (сборка во временную functions/.test-build, удаляется)"
TEST_LOG="$(mktemp)"
(cd functions && npm test --silent > "$TEST_LOG" 2>&1) || {
  cat "$TEST_LOG" >&2
  rm -f "$TEST_LOG"
  echo "Тесты functions упали (см. вывод выше)." >&2
  exit 1
}
grep -E '^# (tests|pass|fail) ' "$TEST_LOG" | sed 's/^# /  /'
rm -f "$TEST_LOG"

echo "-- build v2/web (во временную папку)"
OUT="$(mktemp -d)"
trap 'rm -rf "$OUT"' EXIT
(cd v2/web && npx --no-install vite build --logLevel warn --outDir "$OUT" --emptyOutDir)

echo "-- architecture"
WEB_SRC="v2/web/src"
fail=0
violation() {
  echo "  НАРУШЕНИЕ: $1" >&2
  echo "$2" | sed 's/^/    /' >&2
  fail=1
}
src_grep() {
  grep -rnE "$1" "${@:2}" --include='*.ts' --include='*.tsx' || true
}

# 1. Firestore / firebase-admin — только в functions/.
hits="$(src_grep 'firebase-admin|firebase/firestore|from "firebase' "$WEB_SRC")"
[[ -z "$hits" ]] || violation "Firebase в v2/web — данные только через /api (functions/)" "$hits"

# 2. fetch — только в v2/web/src/api/.
hits="$(src_grep '\bfetch\(' "$WEB_SRC" --exclude-dir=api)"
[[ -z "$hits" ]] || violation "fetch вне v2/web/src/api/ — вызывай функции api/client.ts" "$hits"

# 3. Домен — без Firebase и Express.
hits="$(src_grep "from ['\"](firebase|firebase-admin|firebase-functions|express)" functions/src/domain.ts)"
[[ -z "$hits" ]] || violation "functions/src/domain.ts импортирует Firebase/Express — домен должен быть чистым" "$hits"

if [[ "$fail" -ne 0 ]]; then
  echo "См. docs/ARCHITECTURE.md («Правила слоёв»)." >&2
  exit 1
fi

echo "OK"
