# AGENTS.md — карта репозитория (Fin Bridge)

**Не читай всё подряд.** Сначала эта страница, затем только нужные файлы из [docs/index.md](docs/index.md).

Модель рассуждает; **harness** — всё в git, что превращает рассуждения в безопасные действия: [harness/FRAMEWORK.md](harness/FRAMEWORK.md) (Databricks + OpenAI).

## Проект в одном абзаце

Веб-прототип (3 дня): подросток — квесты и бюджет; родитель — правила и решения по запросам. Python, Streamlit, SQLite. Спека: [docs/PRODUCT.md](docs/PRODUCT.md).

## Setup

```bash
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
streamlit run app/main.py
```

## Рабочий цикл (ReAct)

1. **Reason** — задача в `tasks/in-progress/`, зона `owns`, зависимости в `tasks/done/`.
2. **Act** — ветка `agent/<ник>/<id>`, правки только в своей зоне ([harness/OWNERSHIP.md](harness/OWNERSHIP.md)).
3. **Observe** — `./scripts/verify.sh` + smoke из [docs/QUALITY.md](docs/QUALITY.md).
4. **Repeat** — до выполнения acceptance criteria; PR в `main`.

Подробно: [harness/COORDINATION.md](harness/COORDINATION.md), промпт: [templates/AGENT_PROMPT.md](templates/AGENT_PROMPT.md).

## Куда смотреть дальше

| Вопрос | Документ |
|--------|----------|
| Что строим? | [docs/product-specs/index.md](docs/product-specs/index.md) |
| Куда класть код? | [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) |
| Можно ли так? | [docs/design-docs/core-beliefs.md](docs/design-docs/core-beliefs.md) |
| Как не конфликтовать? | [harness/OWNERSHIP.md](harness/OWNERSHIP.md) |
| Схема БД | [docs/generated/db-schema.md](docs/generated/db-schema.md) (после T08) |

## Инварианты (кратко)

- Логика в `src/`, UI в `app/`; domain/quests/db **без** Streamlit.
- SQL только в `src/db/`.
- Константы бюджета — `src/domain/`.
- Не коммитить `.env`, `data/*.db`, `.venv`.
- MVP-запреты: банк, реальные карты, trust-score, авто-лимиты — см. core-beliefs.

## Cursor

Правила: `.cursor/rules/`. Человеческий README: [README.md](README.md).
