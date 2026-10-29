#!/bin/bash
# Двойной клик в Finder (macOS) — локальный Mini App.
cd "$(dirname "$0")/.." || exit 1
exec ./scripts/launch-v2-dev.sh
