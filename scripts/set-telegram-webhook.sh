#!/usr/bin/env bash
# Регистрирует webhook @fin_brdg_bot на Cloud Functions (через Hosting /api).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [[ -f functions/.env ]]; then
  set -a
  # shellcheck disable=SC1091
  source functions/.env
  set +a
fi

TOKEN="${TELEGRAM_BOT_TOKEN:-}"
if [[ -z "$TOKEN" ]]; then
  echo "Задай TELEGRAM_BOT_TOKEN в functions/.env" >&2
  exit 1
fi

WEBHOOK_URL="${1:-https://fin-brdg.web.app/api/telegram/webhook}"
echo "Webhook → $WEBHOOK_URL"

curl -sS "https://api.telegram.org/bot${TOKEN}/setWebhook" \
  -d "url=${WEBHOOK_URL}" \
  -d "allowed_updates=[\"message\"]" | python3 -m json.tool

echo ""
curl -sS "https://api.telegram.org/bot${TOKEN}/getWebhookInfo" | python3 -m json.tool
