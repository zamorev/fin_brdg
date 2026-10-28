---
id: T14
title: v2 — локальный запуск на эмуляторах Firebase
status: in-progress
owns:
  - docs/LOCAL_DEV.md
  - docs/index.md
depends-on: [T12]
claimed-by: sw3artog0d
branch: agent/sw3artog0d/T14
started: 2026-10-29
---

# T14 — Локальный запуск v2 без Telegram и без доступа к проекту

## Description

Поднять Mini App (`v2/web`) и API (`functions/`) локально на эмуляторах Firebase, чтобы разрабатывать и проверять экраны в браузере на localhost.
Prod-проект `fin-brdg` не трогаем: эмуляторы запускаются с `--project demo-fin-brdg`.

Код `functions/**` и `v2/web/**` не меняем — зона T13 (pavel). Найденные проблемы фиксируем в Notes.

## Acceptance Criteria

- [ ] `npm install` в корне, `functions/`, `v2/web/` проходит
- [ ] Эмуляторы functions + firestore + hosting стартуют с `demo-fin-brdg`
- [ ] `GET /api/health` отвечает локально
- [ ] Приложение открывается в браузере, онбординг доходит до главной
- [ ] `docs/LOCAL_DEV.md` — пошаговые команды, ловушки; ссылка в `docs/index.md`

## Notes
