# fin_brdg — Fin Bridge

Прототип для хакатона: финансовые квесты для подростка и панель родителя.  
Концепция и MVP: [`docs/PRODUCT.md`](docs/PRODUCT.md).

## Быстрый старт

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # опционально: локальные секреты (см. TELEGRAM_BOT_TOKEN)
streamlit run app/main.py
```

## Команда и агенты

Репозиторий настроен как **agent harness**:

| Документ | Для кого |
|----------|----------|
| [`AGENTS.md`](AGENTS.md) | Любой coding-агент |
| [`harness/README.md`](harness/README.md) | Люди: как координироваться |
| [`tasks/backlog/`](tasks/backlog/) | Очередь задач T01–T10 |

Заявить задачу: `./scripts/claim-task.sh T01 your-nick` (см. `harness/COORDINATION.md`).

## Структура

`docs/ARCHITECTURE.md` — слои `app/` + `src/` + SQLite.
