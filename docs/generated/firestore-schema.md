# Firestore — схема данных

**Источник правды — типы в коде** (`functions/src/store.ts`: `UserDoc`, `FamilyDoc`, `RequestDoc`; `functions/src/pendingInvite.ts`; `functions/src/scenarioRuns.ts`: `ScenarioRunDoc`). Меняешь тип или коллекцию — обнови этот файл в том же коммите.
Сверено с кодом: 2026-10-29 (T16); `scenarioRuns` — 2026-10-31 (T23).

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

## `scenarioRuns/{auto-id}` (T17)

Одно прохождение сценарного квеста подростком. Тип — `ScenarioRunDoc` в `functions/src/scenarioRuns.ts`. Механика: [product-specs/scenario-quests.md](../product-specs/scenario-quests.md).

| Поле | Тип | Смысл |
|------|-----|-------|
| `scenarioId` | string | id сценария (`cinema_chain_v1`); граф — `cmsScenarios/{scenarioId}` или `functions/src/scenarios/` |
| `scenarioVersion` | number | версия сценария на момент старта |
| `familyId` | string | id в `families`; эффекты ответов меняют `allocation` этой семьи |
| `teenTelegramId` | number | подросток, который проходит квест |
| `status` | `"active"` \| `"completed"` \| `"cancelled"` | `cancelled` в типе есть, код его пока не ставит |
| `currentNodeId` | string | текущий шаг (узел графа) |
| `stepStatus` | `"ready"` \| `"pending"` | `pending` — шаг ещё закрыт таймером, `ready` — можно отвечать |
| `readyAt` | Timestamp | когда шаг откроется; scheduler переводит `pending` → `ready` |
| `notifiedAt` | Timestamp? | бот уже прислал «шаг готов»; сбрасывается при переходе на новый шаг |
| `history` | array | ответы по порядку, см. ниже |

Элемент `history[]`:

| Поле | Тип | Смысл |
|------|-----|-------|
| `nodeId` | string | шаг, на который ответили |
| `optionId` | string | выбранный ответ |
| `at` | Timestamp | время ответа |
| `effects` | `SpendEffect[]`? | `{ type: "spend", category, amount }` — траты, применённые к `allocation` (`functions/src/domain.ts`) |

Индексы (`firestore.indexes.json`):
- `stepStatus ASC, readyAt ASC` — scheduler ищет `pending` с наступившим `readyAt` (`processDueScenarioSteps`);
- `teenTelegramId ASC, status ASC, scenarioId ASC` — активный run подростка (опционально по сценарию).
