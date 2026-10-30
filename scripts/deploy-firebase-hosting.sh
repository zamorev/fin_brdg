#!/usr/bin/env bash
# Deploy Telegram Mini App shell to Firebase Hosting (project fin-brdg).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
# shellcheck source=firebase-cli.sh
source "$ROOT/scripts/firebase-cli.sh"

FIREBASE="$(firebase_cli "$ROOT")"
require_firebase_login "$FIREBASE"

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
