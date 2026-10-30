#!/usr/bin/env bash
# Resolve Firebase CLI from repo root (firebase-tools) and verify login for fin-brdg.
set -euo pipefail

firebase_cli() {
  local root="$1"
  if [[ ! -x "$root/node_modules/.bin/firebase" ]]; then
    echo "== install firebase-tools (repo root) =="
    npm --prefix "$root" ci
  fi
  if [[ ! -x "$root/node_modules/.bin/firebase" ]]; then
    echo "firebase CLI not found. From repo root run: npm install" >&2
    exit 1
  fi
  echo "$root/node_modules/.bin/firebase"
}

require_firebase_login() {
  local fb="$1"
  if "$fb" projects:list --project fin-brdg >/dev/null 2>&1; then
    return 0
  fi
  echo "" >&2
  echo "Firebase: нет доступа к проекту fin-brdg (истёк login или не выполнен вход)." >&2
  echo "" >&2
  echo "В терминале (откроется браузер Google):" >&2
  echo "  cd \"$(pwd)\"" >&2
  echo "  npm install" >&2
  echo "  npx firebase login --reauth" >&2
  echo "" >&2
  echo "Глобальная команда firebase не нужна — используй npx из корня репо." >&2
  echo "После входа снова: ./scripts/deploy-v2.sh" >&2
  echo "" >&2
  exit 1
}
