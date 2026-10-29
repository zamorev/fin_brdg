---
id: T16
title: Harness под TypeScript + Firebase (архитектура, правила, verify)
status: in-progress
owns:
  - docs/ARCHITECTURE.md
  - docs/generated/**
  - docs/index.md
  - docs/design-docs/core-beliefs.md
  - docs/exec-plans/active/README.md
  - docs/PRODUCT.md  # только раздел «Технология», согласовано
  - docs/QUALITY.md
  - harness/FRAMEWORK.md
  - harness/OWNERSHIP.md
  - .cursor/rules/typescript-firebase.mdc
  - scripts/verify.sh
depends-on: [T15]
claimed-by: sw3artog0d
branch: agent/sw3artog0d/T16
started: 2026-10-29
---

# T16 — Harness под TypeScript + Firebase

## Description

После удаления v1 (T15) документы harness описывают пустоту: `ARCHITECTURE.md` — Streamlit, схема БД — SQLite, правила кода — `src/`. Описываем реальные слои v2 (`v2/web` → `/api` → `functions` → Firestore), даём агенту рецепт «куда класть код» и закрепляем слои механической проверкой в `verify.sh` (замена `tests/test_architecture.py`).

Не трогаем код `v2/web/**`, `functions/**` (зона T13), `docs/V2.md`, `v2/README.md`.

## Acceptance Criteria

- [x] `docs/ARCHITECTURE.md` — поток данных, каталоги, правила слоёв, «куда класть новый код», вход через Telegram
- [x] `docs/generated/firestore-schema.md` вместо `db-schema.md`; ссылки обновлены
- [x] `core-beliefs.md` (раздел «Код»), `FRAMEWORK.md`, `exec-plans/active/README.md`, `PRODUCT.md` («Технология») — без Streamlit/SQLite
- [x] `.cursor/rules/typescript-firebase.mdc` для `v2/web/**`, `functions/**`
- [x] `verify.sh`: typecheck + `vite build` во временную папку + проверки слоёв; после запуска `git status` чистый
- [x] Проверки слоёв ловят нарушение (проверено временным файлом)
- [x] Подзоны J/K в `OWNERSHIP.md`; проверки слоёв в `QUALITY.md`

## Notes

- Проверено 2026-10-29: `./scripts/verify.sh` → OK (~4 с), после запуска `git status` чистый (`dist/`, `lib/`, `*.tsbuildinfo` не меняются).
- Негативная проверка: временные нарушения (импорт `firebase-admin` и `fetch` в `screens/`, `import express` в `domain.ts`) → все три пойманы, `verify.sh` выходит с кодом 1. Импорт несуществующего во фронте модуля ловит ещё раньше typecheck.
- `npm run build` в verify не используем: он перезаписывает `v2/web/dist/` и `functions/lib/` (они в git). Вместо него — `tsc --noEmit` + `vite build --outDir <tmp>`.
- `PRODUCT.md`: изменён только раздел «Технология» (стек, локальный запуск, две строки плана по дням без Streamlit/SQLite) — согласовано при утверждении плана.
- После закрытия T13: `docs/V2.md` (строки 4, 6, 140), `v2/README.md` (строка 3) ещё упоминают `web/` и v1.

