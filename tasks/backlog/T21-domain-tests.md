---
id: T21
title: Тесты домена и расхождения X1–X2
status: backlog
owns:
  - L: functions/src/domain.ts, functions/src/domain.test.ts (новый), v2/web/src/domain/budget.ts, docs/design-docs/domain-test-cases.md
  - K3 (минимально): functions/package.json — скрипт test
  - scripts/verify.sh
depends-on: []
priority: средний
---

# T21 — Домен под тестами

## Description

Правила бюджета (1 500 ₽, минимумы, проверка запроса, списания) — две копии: `functions/src/domain.ts` (источник правды) и `v2/web/src/domain/budget.ts`. Тестов на них нет, кроме 5 тестов движка сценариев (T17). Кейсы уже готовы — перенесены из v1: [domain-test-cases.md](../../docs/design-docs/domain-test-cases.md) (разделы 1, 2, 4).

Тесты на **встроенном `node:test`** — как у T17 (`functions/src/scenarioEngine.test.ts`), без новых зависимостей. Тесты — страховочная сетка перед T22 (модель бюджета).

Аналог из v1: [done/T02](../done/T02-domain-contracts.md) (контракты), [archive/T10](../archive/T10-e2e-smoke.md) (smoke-тесты).

## Acceptance Criteria

- [ ] `functions/src/domain.test.ts`: константы (C1–C5), `validateAllocation` (A1–A13), `validateRuleChange` (R3–R6), `applyUnplanned`, `applyScenarioEffects`
- [ ] **X1:** серверные ошибки `validateAllocation` с подписями категорий («Транспорт: …»), не ключами (`transport: …`) — как во фронте
- [ ] **X2:** отрицательная сумма → только ошибка «отрицательная», без лишней ошибки минимума (A11)
- [ ] Фронтовая копия `budget.ts` ведёт себя так же на тех же кейсах (сверка вручную или общий тест-хелпер — на выбор исполнителя)
- [ ] `npm test` в `functions/` запускает **все** `*.test.js` (сейчас — только `scenarioEngine.test.js`)
- [ ] `./scripts/verify.sh` запускает `npm test` в `functions/`; без записи файлов в git (сборка `lib/` в `npm test` — учесть: `git status` после verify чистый)
- [ ] В `domain-test-cases.md` таблица X1–X7: X1, X2 — «исправлено (T21)»; X3–X7 — ссылка на задачу или решение
- [ ] `./scripts/verify.sh` OK

## Notes

- **Не делать в этой задаче:** X3 (решение после «уточнить»), X4 (категория запроса), разделение правил и остатка — это T22, нужны продуктовые решения.
- X6 (обязательные расходы ≥ 800) и X7 (одна копия домена для фронта и бэкенда) — записать решение/вопрос в Notes, реализация — после DoD.
- Параллельно с T19/T20: разные файлы. Конфликт возможен только с T22 — T22 после T21.
