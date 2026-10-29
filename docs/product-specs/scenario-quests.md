# Сценарные квесты (v2)

Движок для цепочек решений: текст → варианты ответа → (опционально) списание с учебного бюджета → отложенный следующий шаг.

Источник правды по MVP-границам: [PRODUCT.md](../PRODUCT.md), [core-beliefs.md](../design-docs/core-beliefs.md).

## Слои

| Слой | Где | Смысл |
|------|-----|--------|
| **Определение** | `functions/src/scenarios/*.ts` в git | Граф узлов, тексты, суммы, переходы, задержки |
| **Прохождение** | Firestore `scenarioRuns/{runId}` | Кто проходит, текущий узел, таймер, история ответов |
| **Бюджет** | `families.allocation` | Списания через `applyScenarioEffects` в [domain](../../functions/src/domain.ts) |

Один активный run на пару `(teenTelegramId, scenarioId)`.

## Схема узла

```text
ScenarioNode {
  id: string
  prompt: string
  options: ScenarioOption[]
}

ScenarioOption {
  id: string
  label: string
  effects?: SpendEffect[]      // списание при выборе
  nextNodeId?: string          // следующий узел
  delayMs?: number             // пауза до показа next (0 = сразу ready)
  terminal?: boolean           // завершить run после effects
}

SpendEffect {
  type: "spend"
  category: CategoryKey        // transport | food | entertainment | savings | reserve
  amount: number
}
```

Переход: `(nodeId, optionId) → nextNodeId + delayMs`. Если `terminal: true` или нет `nextNodeId`, run → `completed`.

## Runtime (`scenarioRuns`)

| Поле | Тип | Описание |
|------|-----|----------|
| `scenarioId` | string | Ключ сценария, напр. `cinema_chain_v1` |
| `scenarioVersion` | number | Версия определения |
| `familyId` | string | Семья (allocation общий на семью в MVP) |
| `teenTelegramId` | number | Подросток-участник |
| `status` | `active` \| `completed` \| `cancelled` | |
| `currentNodeId` | string | Узел, на котором ждём ответ или таймер |
| `stepStatus` | `ready` \| `pending` | `ready` — можно отвечать в UI |
| `readyAt` | Timestamp | Когда шаг стал/станет доступен |
| `notifiedAt` | Timestamp? | Бот уже слал напоминание (идемпотентность) |
| `history` | array | `{ nodeId, optionId, at, effects? }` |

## Доставка шага

1. **In-app:** `GET /api/me` → `activeScenarioStep` (если `stepStatus === ready`) или `pendingScenarioStep` (если `pending`).
2. **Telegram:** при переходе `pending → ready` scheduled job шлёт `sendMessage` с кнопкой Web App (`?run={runId}`).

Mini App **не** шлёт OS-push при закрытом приложении — сообщение бота обязательно для «увидел вне приложения».

## Пример `cinema_chain_v1`

| Узел | Смысл |
|------|--------|
| `invite` | «Друзья зовут в кино, билет 300 ₽» → Пойду / Не пойду |
| `box_office` | Билет 250 ₽ + попкорн 350 ₽ → Да / Нет |
| `friends_pay` | «Друзья заплатят сами» → Пойду / Не пойду |

| Ответ | Переход | Задержка | Эффекты |
|-------|---------|----------|---------|
| invite → go | box_office | 2 ч | — |
| invite → no_go | friends_pay | 30 мин | — |
| box_office → yes | terminal | — | entertainment −250, −350 |
| box_office → no | terminal | — | entertainment −250 |
| friends_pay → go | box_office | 2 ч | — |
| friends_pay → no_go | terminal | — | — |

Суммы в `effects`, не только в тексте prompt.

## API

| Метод | Путь | Кто |
|-------|------|-----|
| POST | `/api/scenarios/:scenarioId/start` | teen |
| POST | `/api/scenarios/runs/:runId/answer` | teen, body `{ optionId }` |

`GET /api/me` дополняется полями сценария для подростка.

## Ограничения MVP

- По умолчанию контент в git; **тестовая CMS (T25)** — переопределения в Firestore `cmsMessages` / `cmsScenarios`, админка `/admin/`.
- Scheduler `scenarioStepScheduler` (every 5 min) — `pending → ready` + сообщение бота.
- Нет авто-лимитов по ответам.
- Несколько подростков — отдельные run, общий `allocation` семьи (зафиксировано).
