#!/usr/bin/env bash
# Локальный v2: Functions emulator + Vite + браузер на http://localhost:5173
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

DEV_URL="http://localhost:5173"
HEALTH_URL="http://127.0.0.1:5001/fin-brdg/europe-west1/api/api/health"
ENV_FILE="$ROOT/functions/.env"
LOG_DIR="$ROOT/.local/dev-v2"
EMU_LOG="$LOG_DIR/emulator.log"

EMU_PID=""
VITE_PID=""
STARTED_EMULATOR=0

cleanup() {
  if [[ -n "$VITE_PID" ]]; then
    kill "$VITE_PID" 2>/dev/null || true
  fi
  if [[ "$STARTED_EMULATOR" -eq 1 && -n "$EMU_PID" ]]; then
    kill "$EMU_PID" 2>/dev/null || true
    pkill -P "$EMU_PID" 2>/dev/null || true
  fi
}
trap cleanup EXIT INT TERM

echo "== Fin Bridge v2 — локальный dev =="
echo "   Репо: $ROOT"
echo ""

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Нет functions/.env — скопируй functions/.env.example и добавь AUTH_SKIP=1"
  exit 1
fi
if ! grep -q '^AUTH_SKIP=1' "$ENV_FILE" 2>/dev/null; then
  echo "В functions/.env нужен AUTH_SKIP=1 (браузер без Telegram)."
  echo "См. functions/.env.example"
  exit 1
fi

if [[ ! -x "$ROOT/node_modules/.bin/firebase" ]]; then
  echo "== npm install (корень, firebase-tools) =="
  npm install
fi
FIREBASE="$ROOT/node_modules/.bin/firebase"

if [[ ! -d "$ROOT/v2/web/node_modules" ]]; then
  echo "== npm install v2/web =="
  npm --prefix v2/web install
fi
if [[ ! -d "$ROOT/functions/node_modules" ]]; then
  echo "== npm install functions =="
  npm --prefix functions install
fi

echo "== build functions =="
npm --prefix functions run build

EMU_ONLY="functions"
if java -version &>/dev/null; then
  EMU_ONLY="functions,firestore"
else
  echo "Java не найден — эмулятор только functions (Firestore может идти в прод)."
fi

wait_for_url() {
  local url="$1"
  local label="$2"
  local tries="${3:-60}"
  local i
  for ((i = 1; i <= tries; i++)); do
    if curl -sf "$url" &>/dev/null; then
      echo "   $label готов."
      return 0
    fi
    sleep 1
  done
  echo "   Не дождались: $label ($url)"
  return 1
}

port_listen() {
  lsof -i ":$1" -sTCP:LISTEN -t &>/dev/null
}

mkdir -p "$LOG_DIR"

if port_listen 5001; then
  echo "== Functions emulator уже слушает :5001 =="
else
  echo "== firebase emulators:start --only $EMU_ONLY =="
  "$FIREBASE" emulators:start --only "$EMU_ONLY" >>"$EMU_LOG" 2>&1 &
  EMU_PID=$!
  STARTED_EMULATOR=1
  wait_for_url "$HEALTH_URL" "API (эмулятор)" 90 || {
    echo "Лог: $EMU_LOG"
    tail -20 "$EMU_LOG" || true
    exit 1
  }
fi

if port_listen 5173; then
  echo "== Vite уже слушает :5173 =="
else
  echo "== vite dev =="
  npm --prefix v2/web run dev >>"$LOG_DIR/vite.log" 2>&1 &
  VITE_PID=$!
  wait_for_url "$DEV_URL" "Vite" 40 || {
    echo "Лог: $LOG_DIR/vite.log"
    tail -20 "$LOG_DIR/vite.log" || true
    exit 1
  }
fi

echo ""
echo "== открываю $DEV_URL =="
if [[ "$(uname -s)" == "Darwin" ]]; then
  open "$DEV_URL"
else
  xdg-open "$DEV_URL" 2>/dev/null || sensible-browser "$DEV_URL" 2>/dev/null || true
fi

echo ""
echo "Работает. Логи: $LOG_DIR/"
echo "Остановка: Ctrl+C в этом окне (эмулятор, если мы его подняли, тоже остановится)."
echo ""

if [[ -n "$VITE_PID" ]]; then
  wait "$VITE_PID"
elif port_listen 5173; then
  read -r -p "Vite уже был запущен. Enter — закрыть окно…" _
fi
