# Firestore — схема данных

**Источник правды — типы в коде** (`functions/src/store.ts`: `UserDoc`, `FamilyDoc`, `RequestDoc`; `functions/src/pendingInvite.ts`). Меняешь тип или коллекцию — обнови этот файл в том же коммите.
Сверено с кодом: 2026-10-29 (T16).

Доступ только из `functions/` (Admin SDK). `firestore.rules` запрещают клиентам любое чтение и запись.

## `users/{telegramId}`

Один документ на Telegram-аккаунт. Создаётся при первом `GET /api/me`.

| Поле | Тип | Смысл |
|------|-----|-------|
| `userType` | `"anonymous"` \| `"teen"` \| `"parent"` | `anonymous` до онбординга |
| `familyId` | string? | id в `families`; нет у `anonymous` |
| `displayName` | string | имя из Telegram |
| `createdAt` | Timestamp | |
| `photoUrl` | string? | публичный URL аватарки (без токена бота) |
| `photoFilePath` | string? | путь файла Bot API; отдаётся только через `/api/avatar/:id` |

Онбординг завершён, если `userType` ≠ `anonymous` и есть `familyId` (`isOnboardedUser`).

## `families/{auto-id}`

Общие правила и прогресс квестов на всю семью.

| Поле | Тип | Смысл |
|------|-----|-------|
| `inviteCodeParent` | string? | токен ссылки-приглашения родителя |
| `inviteCodeTeen` | string? | токен ссылки-приглашения подростка |
| `inviteCode` | string | устаревший общий код (старые семьи) |
| `allocation` | `{ transport, food, entertainment, savings, reserve }` (числа, ₽) | действующая договорённость |
| `questWeekBudgetCompleted` | boolean | квест «Неделя на 1 500 ₽» пройден |
| `questUnplannedCompleted` | boolean | квест «Незапланированная покупка» пройден |
| `unplannedChoice` | `"entertainment"` \| `"savings"` \| `"reserve"` \| `"decline"`? | выбор во втором квесте |
| `level`, `xpToNext` | number | прогресс (демо: 3 и 140) |
| `skills` | string[] | |

## `requests/{auto-id}`

Запрос подростка на изменение правил и решение родителя.

| Поле | Тип | Смысл |
|------|-----|-------|
| `familyId` | string | |
| `category` | `"entertainment"` | пока только развлечения |
| `currentAmount`, `proposedAmount` | number | ₽ |
| `explanation` | string | зачем подростку |
| `status` | `"pending"` \| `"approved"` \| `"rejected"` \| `"needs_clarification"` | решение финальное: менять можно только `pending` |
| `parentComment` | string | |
| `createdAt` | Timestamp | |

Индекс: `familyId ASC, createdAt DESC` (`firestore.indexes.json`).
При `approved` — `families/{familyId}.allocation.entertainment = proposedAmount`.

## `pendingInvites/{telegramId}`

Приглашение, пришедшее через чат бота (`/start inv_…`), до открытия Mini App.

| Поле | Тип | Смысл |
|------|-----|-------|
| `inviteParam` | string | `t_<token>` / `p_<token>` |
| `createdAt` | Timestamp | |
| `expiresAt` | Timestamp | +48 часов |

Читается и удаляется при `GET /api/me` (`consumePendingInvite`).

## `members/{telegramId}` (устаревшая)

Только чтение для совместимости со старыми аккаунтами (`resolveUser`): `role`, `familyId`, `displayName`. Новые записи не создаются.

## `cmsMessages/{key}` (T25, тестовая CMS)

| Поле | Тип | Смысл |
|------|-----|-------|
| `text` | string | Текст по ключу из `functions/src/cms/catalog.ts` |
| `updatedAt` | Timestamp | |
| `updatedBy` | string | логин админки |

## `cmsScenarios/{scenarioId}` (T25)

Переопределение сценарного квеста (граф узлов). Поля совпадают с `ScenarioDefinition` в коде + `updatedAt`, `updatedBy`. Если документа нет — fallback на git (`functions/src/scenarios/`).

## `scenarioRuns/{id}`

См. [product-specs/scenario-quests.md](../product-specs/scenario-quests.md).
