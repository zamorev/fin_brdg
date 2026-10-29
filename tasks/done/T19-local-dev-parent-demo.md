---
id: T19
title: Безопасный локальный запуск, вход за родителя, демо-данные
status: done
owns:
  - K3: scripts/launch-v2-dev.sh, scripts/seed-v2-firestore.mjs, scripts/seed-demo-family.mjs (новый)
  - J2: v2/web/vite.config.ts, v2/web/src/api/client.ts, v2/web/src/twa/**
  - docs/LOCAL_DEV.md
depends-on: [T18]
priority: высокий
---

# T19 — Локальная разработка без риска для prod, за обе роли

## Description

Сейчас два разных способа локального запуска и два риска для prod:

- `scripts/launch-v2-dev.sh` (T17) стартует эмуляторы с реальным проектом `fin-brdg`; **без Java** поднимает только Functions и продолжает — Firestore пишет в **prod**. Прокси в `vite.config.ts` указывает на `/fin-brdg/…`.
- [docs/LOCAL_DEV.md](../../docs/LOCAL_DEV.md) (T14) — `--project demo-fin-brdg` + `VITE_API_BASE`.
- `scripts/seed-v2-firestore.mjs` по умолчанию пишет в prod (`FIREBASE_PROJECT ?? "fin-brdg"`).

Плюс локально нельзя открыть интерфейс **родителя** (без `initData` сервер делает всех `100001 / Dev Teen`) и нельзя нажать главную кнопку экрана: её роль играет нативная MainButton Telegram, а запасная `.btn-primary-fallback` скрыта классом `twa-ready`, который ставится и вне Telegram.

Делаем один безопасный способ, вход за любую роль и демо-семью — без этого не разработать T20 (дашборд родителя).

## Acceptance Criteria

- [x] Один способ запуска: `npm run dev:v2` (скрипт) и `LOCAL_DEV.md` описывают **одно и то же**
- [x] Эмуляторы только с `--project demo-fin-brdg`; без Java скрипт **останавливается** с понятной ошибкой (не продолжает без Firestore-эмулятора)
- [x] Прокси Vite → `/demo-fin-brdg/europe-west1/api/api`; `npm run dev` в `v2/web` работает без `VITE_API_BASE`
- [x] `seed-v2-firestore.mjs`: по умолчанию — только эмулятор; prod — лишь явным флагом (например `--prod`) с подтверждением
- [x] Вход за роль в dev: переменная (например `VITE_DEV_TG_USER=200002:Dev Parent`) → `api/client.ts` шлёт `tma user=…` **только** при `import.meta.env.DEV`; в prod-сборке кода подмены нет (проверить `dist`/бандл)
- [x] Вне Telegram (нет `initData`) показывается запасная главная кнопка экрана — квест можно пройти мышкой
- [x] `scripts/seed-demo-family.mjs` (эмулятор): семья подросток `100001` + родитель `200002`, пройденный квест 1, ожидающий запрос — для разработки и демо
- [x] `LOCAL_DEV.md`: запуск, вход за подростка/родителя, демо-семья, ловушки; ссылки из `AGENTS.md` не ломаются
- [x] Smoke кликами: за подростка — квест 1; за родителя — главная и экран запроса (решение «Одобрить»)
- [x] `./scripts/verify.sh` OK

## Notes

- Обход подписи на сервере уже есть: при `FUNCTIONS_EMULATOR=true` и `AUTH_SKIP=1` `authMiddleware` принимает `initData` без проверки HMAC (`functions/src/telegram.ts`). Сервер не менять.
- `twa/**` пересекается с T18 — начинать после её merge.
- `Launch v2 Dev.command` (двойной клик на macOS) — оставить, но через тот же скрипт.
- Параллельно можно: T21 (домен), T23 (чистка) — разные файлы.

## Result (2026-10-29)

- Скрипт `npm run dev:v2` = `LOCAL_DEV.md`: эмуляторы только `--project demo-fin-brdg`; без Java — выход с ошибкой (проверено подменой `java`); чужой эмулятор на `:5001` — выход.
- Прокси Vite → `/demo-fin-brdg/europe-west1/api/api`; `VITE_API_BASE` не нужен.
- `seed-v2-firestore.mjs`: по умолчанию эмулятор; `--prod` — только после ввода `fin-brdg` (отказ проверен).
- `VITE_DEV_TG_USER` → `tma user=…` под `import.meta.env.DEV`; prod-сборка с заданной переменной — в бандле нет ни имени переменной, ни `Dev Parent`.
- `twa-ready` только при непустом `initData` → вне Telegram видна `.btn-primary-fallback`.
- `seed-demo-family.mjs`: `families/demo-family`, `users/100001` (teen), `users/200002` (parent), `requests/demo-request` (pending).
- Smoke: подросток — квест 1 мышкой (`POST /quests/week-budget` 200); родитель — главная → запрос → «Договориться на одну неделю» → `approved`. В UI одобрение называется так, кнопки «Одобрить» нет.
- `./scripts/verify.sh` OK.
