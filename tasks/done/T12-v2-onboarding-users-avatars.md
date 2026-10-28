---
id: T12
title: v2 — anonymous users, invite deep-link, аватарки семьи
status: done
owns:
  - v2/web/**
  - functions/**
depends-on: [T11]
started: 2026-10-28
---

# T12 — v2: учёт пользователей, invite без «создать семью», аватарки

## Description

Доработки поверх [T11](T11-v2-family-invites-twa.md): каждый заход в Mini App создаёт документ в Firestore; invite-ссылка не теряется и не ведёт в «кто ты / новая семья»; на экране «Семья» — фото профиля Telegram.

**Источник правды для агентов:** [docs/V2.md](../../docs/V2.md) (разделы «Пользователи», «Приглашения», «Аватарки», «TWA»).

## Acceptance Criteria

- [x] `GET /api/me` (и join/onboarding) вызывают **`ensureUserRecord`**: `users/{telegramId}` с `userType: anonymous` до завершения онбординга
- [x] После onboarding/join — `userType` `teen` \| `parent`, `familyId`; anonymous **не** в списке участников семьи
- [x] Invite: `start_param` читается из нескольких полей TWA + **sessionStorage**; экран «Приглашение в семью», auto-join, без выбора роли
- [x] Ссылки: `?startapp=t_TOKEN` / `p_TOKEN`; сервер понимает префикс роли
- [x] Экран «Семья»: **`MainAction` «Готово»** (не скрытый fallback); выход с debounce на Back
- [x] `GET /api/avatar/:telegramId` — прокси фото (токен бота не в клиенте); `MemberAvatar` на `FamilyScreen`
- [x] Деплой API/UI: `./scripts/deploy-v2.sh` при изменениях `functions/` или invite/онбординга

## Ключевые файлы (не дублировать)

| Область | Путь |
|---------|------|
| Anonymous + onboarding API | `functions/src/store.ts` (`ensureUserRecord`, `isOnboardedUser`, `joinByInviteCode`) |
| Фото профиля, avatar stream | `functions/src/profilePhoto.ts`, `functions/src/app.ts` (`/api/avatar/:id`) |
| Invite param, sessionStorage | `v2/web/src/telegram/bot.ts` |
| Онбординг по ссылке | `v2/web/src/screens/OnboardingScreen.tsx` |
| Аватар в списке | `v2/web/src/components/MemberAvatar.tsx`, `FamilyScreen.tsx` |
| «Готово» на «Семья» | `FamilyScreen.tsx`, `App.tsx` (`backFromFamily` / `onDone`) |

## Notes для следующих задач

- **Не делать снова:** ручной ввод кодов, выбор роли при валидном `start_param`, создание `users` только в `completeOnboarding`.
- **Не дублировать:** логику invite в `web/` или Streamlit — только v2.
- Новые поля `users/*` — согласовать с [docs/V2.md](../../docs/V2.md); миграции lazy в `getFamily`-стиле.
- Тесты v2 API — отдельная задача (pytest не покрывает functions); smoke — Telegram + Firestore console.
- Если invite не срабатывает: проверить открытие **именно ссылки** (не Menu «Поехали»), `TELEGRAM_BOT_TOKEN` на Functions, документ `anonymous` появился ли после `/api/me`.

## Result

Реализовано в рабочей копии (коммиты `T12: …` по [harness/COORDINATION.md](../../harness/COORDINATION.md)). Прод обновлялся через `./scripts/deploy-v2.sh` / functions-only deploy.

## Verify (перед merge)

```bash
cd functions && npm run build
cd ../v2/web && npm run build
./scripts/verify.sh   # v1 + architecture; v2 — smoke в Telegram
```
