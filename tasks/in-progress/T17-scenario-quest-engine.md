---
id: T17
title: v2 — движок сценарных квестов
status: in-progress
owns: [J, K, H]
depends-on: [T11, T12, T13]
claimed-by: pavel
branch: agent/pavel/T17-scenario-quest-engine
started: 2026-10-29
---

# T17 — Сценарные квесты (v2)

## Description

Граф шагов с ответами, задержками, списаниями с учебного бюджета и доставкой через Mini App + Telegram. Первый сценарий: `cinema_chain_v1`.

Спека: [docs/product-specs/scenario-quests.md](../../docs/product-specs/scenario-quests.md).

## Acceptance Criteria

### Фаза A — движок

- [x] `functions/src/scenarioEngine.ts` + реестр сценариев
- [x] `cinema_chain_v1` по продуктовому примеру «кино»
- [x] `applyScenarioEffects` в `functions/src/domain.ts`
- [x] Unit-тесты: `npm test` в `functions/`

### Фаза B — API и Firestore

- [x] Коллекция `scenarioRuns`, индексы в `firestore.indexes.json`
- [x] `POST /api/scenarios/:scenarioId/start`, `POST /api/scenarios/runs/:runId/answer`
- [x] `GET /api/me` → `activeScenarioStep` / `pendingScenarioStep` (подросток)

### Фаза C — TWA

- [x] `ScenarioStep.tsx`, маршруты в `App.tsx`, карточки на `TeenHome`
- [x] Deep link `?run={runId}`

### Фаза D — напоминания

- [x] `scenarioStepScheduler` (every 5 min) → pending → ready
- [x] `sendMessage` + Web App кнопка, `notifiedAt`

## Notes

- Линейный квест 2 (`UnplannedPurchase`) пока параллельно; миграция — фаза E.
- T13 закрыта (2026-10-29); PR #1 можно мержить после merge `agent/pavel/T13-close` в `main`.
- `./scripts/verify.sh`; functions: `cd functions && npm test`.
