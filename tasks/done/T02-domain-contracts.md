---
id: T02
title: Доменные константы и контракты бюджета
status: done
owns: [E, G]  # G: только tests/test_domain.py
depends-on: []
claimed-by: sw3artog0d
branch: agent/sw3artog0d/T02
started: 2026-10-28
---

# T02 — Доменные константы и контракты

## Description

Вынести в `src/domain/` недельный бюджет 1 500 ₽, категории, минимальные лимиты (транспорт 300, еда 500, накопления 200, резерв 100, развлечения 400 по умолчанию), правила родителя из `docs/PRODUCT.md`. Dataclass или TypedDict для распределения бюджета и статусов запросов.

## Acceptance Criteria

- [x] Константы совпадают с `docs/PRODUCT.md`
- [x] Функция проверки суммы = 1500 и минимумов по категориям (для квеста 1)
- [x] Типы/модели для запроса на изменение правил (сумма, текст, статус)
- [x] Нет зависимостей от Streamlit в `src/domain/`
- [x] Краткий docstring или комментарий к публичным функциям

## Notes

Единственный источник чисел для UI и квестов. UI только импортирует.

## Контракт (для T04/T06/T08/T09)

Импорт: `from src.domain import ...`.

- `validate_allocation(BudgetAllocation, rules) -> list[BudgetError]` — квест 1, все ошибки сразу.
- `create_rule_change_request(...)` → `RuleChangeRequest` со статусом `PENDING` («На рассмотрении»).
- `decide_request(request, status, comment)` — одобрить / отклонить / уточнить; комментарий необязателен; после «уточнить» решение можно принять снова.
- `apply_approved_request(rules, request)` — новые `FamilyRules`, меняется только сумма категории в `agreed_allocation` (недельный бюджет остаётся 1 500 ₽; сумма плана может стать 1 600 ₽ — в PRODUCT.md не уточнено).
- Ключи `Category` / `RequestStatus` — строки (`"entertainment"`, `"pending"`) для SQLite.
