---
id: T13
title: v2 — invite через чат бота (webhook + pendingInvites)
status: in-progress
owns:
  - v2/web/**
  - functions/**
  - scripts/set-telegram-webhook.sh
depends-on: [T11, T12]
claimed-by: pavel
branch: main
started: 2026-10-28
---

# T13 — Invite не теряется при входе через Menu «Fin Bridge»

## Description

Продолжение [T12](../done/T12-v2-onboarding-users-avatars.md).  
Проблема: ссылка открывает **чат бота**, пользователь жмёт **Menu / «Fin Bridge»** — Mini App без `start_param`, в семью не попадает.

Решение: deep link `?start=inv_t_|p_<token>` → **Telegram webhook** → `pendingInvites/{telegramId}` → **`GET /api/me`** делает join.

**Источник правды:** [docs/V2.md](../../docs/V2.md) (раздел «Приглашения»).

## Acceptance Criteria

- [x] `POST /api/telegram/webhook` — `/start inv_…` сохраняет pending, ответ с кнопкой Web App
- [x] `buildMe` — `consumePendingInvite` если нет `start_param`
- [x] Share-ссылка: `t.me/fin_brdg_bot?start=inv_…` (`v2/web/src/telegram/bot.ts`)
- [x] `./scripts/set-telegram-webhook.sh` → webhook на prod
- [ ] Smoke: новая ссылка → сообщение бота → Menu Fin Bridge → `familyId` в `users/{id}` (проверить на втором аккаунте)
- [ ] Коммиты `T13: …` в git, `./scripts/verify.sh`

## Ключевые файлы

| Область | Путь |
|---------|------|
| Webhook | `functions/src/botWebhook.ts`, `functions/src/app.ts` |
| Pending invite | `functions/src/pendingInvite.ts`, Firestore `pendingInvites/` |
| Парсинг param | `functions/src/inviteParam.ts` |
| Join на /me | `functions/src/store.ts` (`buildMe`) |
| Ссылка в share | `v2/web/src/telegram/bot.ts` (`botInviteLink`) |

## Notes

- **Не параллелить** с другой задачей в `functions/**` / invite без согласования.
- Webhook уже должен быть: `https://fin-brdg.web.app/api/telegram/webhook` (см. `getWebhookInfo`).
- После merge: перенести файл в `tasks/done/`, обновить таблицу задач в `docs/V2.md`.

## WIP (текущее состояние)

Код задеплоен; smoke и git — в процессе. Не начинать заново webhook/pending — только доработки и фиксы в рамках T13.
