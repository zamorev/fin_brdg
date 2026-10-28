---
id: T11
title: v2 — экран «Семья», приглашения по ссылке, TWA-фиксы
status: done
owns:
  - v2/web/**
  - functions/**
  - firebase.json
  - scripts/deploy-firebase-hosting.sh
  - scripts/deploy-v2.sh
  - scripts/app-build-id.sh
depends-on: []
started: 2026-10-28
---

# T11 — v2: семья, invite-ссылки, прод-деплой

## Description

Telegram Mini App (**`v2/web`**, не `web/`): экран «Семья» для родителя и подростка, приглашение **только ссылкой** (коды в UI не показываем). Бэкенд: отдельные invite-токены на роль, автovступление по ссылке. Исправления TWA (MainButton/BackButton, кэш Hosting).

**Источник правды для агентов:** [docs/V2.md](../../docs/V2.md) (раздел «Приглашения»).

## Acceptance Criteria

- [x] Hosting отдаёт **`v2/web/dist`** (`firebase.json`), не `web/`
- [x] Экран «Семья»: «Кого пригласить» → **Отправить ссылку** (роль-специфичная)
- [x] В UI **нет** полей/копирования кодов; онбординг без «ввести код»
- [x] Firestore `families`: `inviteCodeParent`, `inviteCodeTeen` (+ lazy migration в `getFamily`)
- [x] `POST /api/onboarding/join-invite` — роль из кода на сервере
- [x] По `start_param` из invite-ссылки — экран «Подключаем к семье…» и join без выбора роли
- [x] Деплой: `./scripts/deploy-v2.sh` (фронт + functions); только UI — `./scripts/deploy-firebase-hosting.sh`
- [x] `index.html` — `Cache-Control: no-cache`; id сборки в UI (`scripts/app-build-id.sh`)

## Ключевые файлы (не дублировать логику)

| Область | Путь |
|---------|------|
| Маршруты, родительский home | `v2/web/src/App.tsx` |
| Семья, шаринг | `v2/web/src/screens/FamilyScreen.tsx` |
| Онбординг / auto-join | `v2/web/src/screens/OnboardingScreen.tsx` |
| Текст ссылки, Direct Link | `v2/web/src/telegram/bot.ts` |
| Share + TWA кнопки | `v2/web/src/twa/TwaProvider.tsx` |
| API клиент | `v2/web/src/api/client.ts` |
| Invite + onboarding API | `functions/src/store.ts`, `functions/src/app.ts` |

## Notes для следующих задач

- **T12 (done):** anonymous users, invite `t_`/`p_`, sessionStorage, аватарки — см. [T12](../tasks/done/T12-v2-onboarding-users-avatars.md); **не дублировать**.
- **`web/`** — legacy-заглушка, **не** править для прод Mini App.
- Direct Link: см. [V2.md](../../docs/V2.md) — primary `?startapp=t_|p_<TOKEN>` на `@fin_brdg_bot`.
- Изменения API invite/onboarding/users → **обязательно** `deploy-v2.sh`, не только hosting.
- Родитель: пустой блок подростков — «ребёнку»; для teen UI — наоборот.
- TWA: «Семья» — **`MainAction` «Готово»** (T12); Back с debounce через `useBackAction`.
- Не возвращать в UI «код приглашения» без явного продуктового запроса.

## Result

Реализовано в ветке/рабочей копии (коммиты — по [harness/COORDINATION.md](../../harness/COORDINATION.md), когда оформят PR). Прод: `https://fin-brdg.web.app`.
