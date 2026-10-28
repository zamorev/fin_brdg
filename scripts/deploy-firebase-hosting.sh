#!/usr/bin/env bash
# Deploy Telegram Mini App shell to Firebase Hosting (project fin-brdg).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if ! command -v firebase >/dev/null 2>&1; then
  if [[ -x "$ROOT/node_modules/.bin/firebase" ]]; then
    FIREBASE="$ROOT/node_modules/.bin/firebase"
  else
    echo "firebase CLI not found. Run: npm install && npx firebase login"
    exit 1
  fi
else
  FIREBASE="firebase"
fi

echo "== build v2 web =="
export APP_BUILD_ID="${APP_BUILD_ID:-$("$ROOT/scripts/app-build-id.sh")}"
npm --prefix v2/web ci
npm --prefix v2/web run build
echo "  APP_BUILD_ID=$APP_BUILD_ID"

echo "== deploy Firebase Hosting (fin-brdg) =="
"$FIREBASE" deploy --only hosting --project fin-brdg
echo ""
echo "Web App URL for BotFather:"
echo "  https://fin-brdg.web.app"
echo "Domain (BotFather → Domain):"
echo "  fin-brdg.web.app"
