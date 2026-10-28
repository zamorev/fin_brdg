#!/usr/bin/env bash
# Короткий id билда фронта: <git-short>-<4 hex>, уникален на каждый deploy.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SHA="$(git -C "$ROOT" rev-parse --short HEAD 2>/dev/null || echo nogit)"
if command -v openssl >/dev/null 2>&1; then
  SUFFIX="$(openssl rand -hex 2)"
else
  SUFFIX="$(printf '%04x' "$RANDOM")"
fi
echo "${SHA}-${SUFFIX}"
