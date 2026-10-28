#!/usr/bin/env bash
# Build v2 TWA + deploy Hosting, Functions, Firestore rules.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "== build v2 web =="
export APP_BUILD_ID="${APP_BUILD_ID:-$("$ROOT/scripts/app-build-id.sh")}"
npm --prefix v2/web ci
npm --prefix v2/web run build
echo "  APP_BUILD_ID=$APP_BUILD_ID"

echo "== build functions =="
npm --prefix functions ci
npm --prefix functions run build

if ! command -v firebase >/dev/null 2>&1; then
  FIREBASE="$ROOT/node_modules/.bin/firebase"
else
  FIREBASE="firebase"
fi

echo "== firebase deploy =="
"$FIREBASE" deploy --project fin-brdg --only hosting,functions,firestore --force

echo ""
echo "Mini App: https://fin-brdg.web.app"
echo "Настрой members в Firestore — docs/V2.md"
