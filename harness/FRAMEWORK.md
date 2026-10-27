# Как наш harness соотносится с индустрией

Краткая карта: [Databricks — What is an AI Agent Harness?](https://www.databricks.com/blog/ai-harness) и [OpenAI — Инженерия harness](https://openai.com/ru-RU/index/harness-engineering/).

**Agent = Model + Harness.** Модель (Cursor, Codex, Claude…) рассуждает; harness в репозитории даёт среду, правила, память в git и контуры проверки.

## Восемь блоков (Databricks) → fin_brdg

| Блок | В enterprise | У нас в репозитории |
|------|----------------|---------------------|
| System prompt | Стоящие инструкции | `templates/AGENT_PROMPT.md`, `.cursor/rules/*.mdc` |
| Tools | API, код, БД | Python, Streamlit, SQLite; агент запускает `scripts/verify.sh` |
| Sandbox | Изолированное выполнение | Локальный `.venv`, ветка `agent/…`, зоны `OWNERSHIP.md` |
| Filesystem | Планы, код, артефакты | `app/`, `src/`, `tasks/`, `docs/` |
| Memory / context | Что в контексте | **Оглавление** `AGENTS.md` + точечное чтение `docs/` (не монолит) |
| Feedback / verify | Тесты, self-check | `scripts/verify.sh`, `pytest`, acceptance в задачах |
| Guardrails | Политики, approve | MVP-запреты в `AGENTS.md`, `docs/design-docs/core-beliefs.md`, без merge в чужие зоны |
| Observability | Логи, трейсы | Пока: ручной прогон Streamlit; позже — скриншоты/логи в задаче |

## OpenAI harness engineering → fin_brdg

| Принцип OpenAI | Реализация |
|----------------|------------|
| `AGENTS.md` как **карта**, не энциклопедия | ≤100 строк, ссылки в `docs/index.md` |
| База знаний в `docs/` | `design-docs/`, `product-specs/`, `exec-plans/` |
| Планы как артефакты | `tasks/` (backlog → in-progress → done) |
| Жёсткие границы слоёв | `docs/ARCHITECTURE.md` + `tests/test_architecture.py` |
| Инварианты механически | `verify.sh` в CI (когда подключим) |
| Люди задают намерение | `docs/PRODUCT.md`, критерии в задачах |
| Entropy / garbage collection | Короткие «золотые правила» в `core-beliefs.md`; не плодить дубли в AGENTS |

## Цикл Reason → Act → Observe (ReAct)

```text
Reason  — агент читает AGENTS.md → docs → задачу
Act     — правки в своей зоне, коммит в ветке
Observe — ./scripts/verify.sh; обновить чеклист задачи
Repeat  — до acceptance criteria
```

## Чего мы намеренно не делаем на хакатоне

- Миллион строк, doc-gardening агентом, облачные ревьюеры (масштаб OpenAI).
- Полный observability stack на worktree.
- «Нет ручного кода» — у нас смешанная команда людей и агентов.

Цель та же: **среда и дисциплина важнее выбора модели.**
