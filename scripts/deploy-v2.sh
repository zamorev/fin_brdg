#!/usr/bin/env bash
# Build v2 TWA + deploy Hosting, Functions, Firestore rules.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
# shellcheck source=firebase-cli.sh
source "$ROOT/scripts/firebase-cli.sh"

echo "== build v2 web =="
export APP_BUILD_ID="${APP_BUILD_ID:-$("$ROOT/scripts/app-build-id.sh")}"
npm --prefix v2/web ci
npm --prefix v2/web run build
echo "  APP_BUILD_ID=$APP_BUILD_ID"

echo "== build functions =="
npm --prefix functions ci
npm --prefix functions run build

FIREBASE="$(firebase_cli "$ROOT")"
require_firebase_login "$FIREBASE"

echo "== firebase deploy =="
"$FIREBASE" deploy --project fin-brdg --only hosting,functions,firestore --force

echo ""
echo "Mini App: https://fin-brdg.web.app"
echo "Admin CMS: https://fin-brdg.web.app/admin/"
echo "Настрой members в Firestore — docs/V2.md"
