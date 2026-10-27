# Архитектура (хакатон MVP)

## Поток данных

```text
app/pages/*.py  →  src/quests, src/db  →  src/domain
                      ↓
                 data/app.db
```

## Каталоги

| Путь | Назначение |
|------|------------|
| `app/main.py` | Точка входа Streamlit, выбор роли, роутинг |
| `app/pages/` | Экраны по ролям (`teen_*`, `parent_*`) |
| `app/components/` | Переиспользуемые виджеты |
| `src/domain/` | Константы, модели, инварианты бюджета |
| `src/quests/` | Квест 1/2: валидация и симуляции |
| `src/db/` | Схема, подключение, репозитории |
| `tests/` | pytest (domain, quests) |
| `data/` | Локальная SQLite (gitignored) |

## Роли

Одно приложение, режим в `st.session_state["role"]`: `teen` | `parent`.

## Интеграция страниц

`main.py` импортирует и вызывает `render()` из страниц; новые экраны добавляются файлом, а не ветвлением всего UI в одном модуле.

## Согласование с harness

Зоны владения: `harness/OWNERSHIP.md`.  
Задачи: `tasks/backlog/`.  
Инварианты слоёв: `tests/test_architecture.py` (запуск через `./scripts/verify.sh`).
