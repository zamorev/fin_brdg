---
id: T14
title: v2 — локальный запуск на эмуляторах Firebase
status: done
owns:
  - docs/LOCAL_DEV.md
  - docs/index.md
  - .gitignore
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

- [x] `npm install` в корне, `functions/`, `v2/web/` проходит
- [x] Эмуляторы functions + firestore + hosting стартуют с `demo-fin-brdg`
- [x] `GET /api/health` отвечает локально
- [x] Приложение открывается в браузере, онбординг доходит до главной
- [x] `docs/LOCAL_DEV.md` — пошаговые команды, ловушки; ссылка в `docs/index.md`

## Notes

- Проверено 2026-10-29: health → `{"ok":true}`, онбординг «Я подросток» → «Создать семью» → главная; в эмуляторе `users/100001` с `userType: teen` и `familyId`. Ошибок в консоли нет.
- Для Павла (зона T13, код не менял):
  - прокси в `v2/web/vite.config.ts` указывает на `fin-brdg/us-central1`, а функция в `europe-west1`, поэтому `npm run dev` не достучится до эмулятора. Обходим через `VITE_API_BASE`;
  - `scripts/seed-v2-firestore.mjs` по умолчанию пишет в prod;
  - в шапке главной написано «Level Up», а нужен логотип Fin Bridge.
- Не проверено локально: роль родителя и invite между двумя аккаунтами.

