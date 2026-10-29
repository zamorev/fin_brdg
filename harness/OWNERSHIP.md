# Владение модулями (anti-conflict map)

Цель: параллельная работа без правок одних и тех же файлов разными задачами.

## Зоны

| Зона | Пути | Типичные задачи |
|------|------|-----------------|
| **H. Harness** | `tasks/**`, `harness/**`, `AGENTS.md` | любой — по договорённости |
| **I. Продукт** | `product/**` | только осознанные правки концепции |
| **J. v2 TWA (UI)** | `v2/web/**` | T11+, экраны Mini App, TWA |
| **K. v2 API / Hosting config** | `functions/**`, `firebase.json`, `firestore.rules`, `scripts/deploy-*.sh` | T11+, onboarding, family, deploy |

Зоны A–G (Streamlit v1) удалены вместе с v1 в T15; буквы не переиспользуем.

## Mini App

- UI — **`v2/web`** → `v2/web/dist`; логика и данные — **`functions/`** + Firestore.
Перед правками invite/онбординга/аватарок читать [docs/V2.md](../docs/V2.md), [T11](../tasks/done/T11-v2-family-invites-twa.md), [T12](../tasks/done/T12-v2-onboarding-users-avatars.md). **Активно: [T13](../tasks/in-progress/T13-v2-invite-bot-webhook.md)** — не дублировать webhook/pendingInvites.

## Правила

1. Задача в backlog **должна** перечислять `owns:` (зоны или пути) в frontmatter.
2. Нельзя менять зону другой **активной** задачи без согласования.
3. **Общие файлы** (`v2/web/src/App.tsx`, `functions/src/app.ts`, домен `functions/src/domain.ts`):
   - изменения — минимальные (маршрут, регистрация экрана, константа).
4. Новые экраны — **новые файлы** в `v2/web/src/screens/`.
5. Firestore — только в `functions/`; фронт работает с данными через `/api`.

## Параллельные пары

Пока T13 держит `v2/web/**` и `functions/**` целиком, параллельные задачи в коде не запускаем. Пары — при нарезке новых задач.
