# v2 — Telegram Mini App (prod)

**Не путать с `web/`** (legacy shell).

| Документ | Зачем |
|----------|--------|
| [docs/V2.md](../docs/V2.md) | Стек, Firestore, invite, деплой, TWA |
| [tasks/done/T11-v2-family-invites-twa.md](../tasks/done/T11-v2-family-invites-twa.md) | Семья, invite-ссылки, базовый TWA |
| [tasks/done/T12-v2-onboarding-users-avatars.md](../tasks/done/T12-v2-onboarding-users-avatars.md) | Anonymous users, deep-link, аватарки |
| **[tasks/in-progress/T13-v2-invite-bot-webhook.md](../tasks/in-progress/T13-v2-invite-bot-webhook.md)** | **Сейчас in-progress:** webhook, `pendingInvites`, ссылка `?start=inv_…` |

```bash
cd v2/web && npm install && npm run dev
```

**Лаунчер:** [`scripts/Launch v2 Dev.command`](../scripts/Launch%20v2%20Dev.command) (двойной клик) или `npm run dev:v2` из корня.

Деплой: [scripts/deploy-v2.sh](../scripts/deploy-v2.sh) из корня репо.
