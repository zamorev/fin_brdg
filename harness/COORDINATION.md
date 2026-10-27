# Координация: ветки, задачи, merge

## Принципы

1. **Один агент — одна активная задача** из `tasks/in-progress/`.
2. **Один модуль — один владелец** на время задачи (см. `OWNERSHIP.md`).
3. **Маленькие коммиты** с префиксом id задачи: `T03: добавить проверку суммы бюджета`.
4. **Не рефакторить** чужие зоны «заодно».
5. **Источник правды по продукту** — `docs/PRODUCT.md`; расхождения — issue/коммент в задаче, не молчаливое изменение MVP.

## Ветки

```
main                          ← интеграция, демо
agent/<ник>/<task-id>         ← работа исполнителя
```

Пример: `agent/pavel/T05-quest-unplanned-purchase`

Правила:

- Не коммитить напрямую в `main`, кроме срочных hotfix по договорённости.
- Перед началом: `git fetch` и rebase/merge от `main`.
- После merge задачи — удалить ветку.

## Жизненный цикл задачи

```mermaid
stateDiagram-v2
  [*] --> backlog: add-task
  backlog --> in_progress: claim
  in_progress --> done: PR merged
  in_progress --> backlog: abandon / unblock
```

### Claim (заявить задачу)

В frontmatter задачи:

```yaml
---
id: T03
status: in-progress
claimed-by: pavel
branch: agent/pavel/T03-teen-budget-quest
started: 2026-10-27
---
```

Переместить файл: `tasks/backlog/T03-....md` → `tasks/in-progress/T03-....md`

Если задача **зависит** от другой (`depends-on: T02`), не брать, пока зависимость не в `tasks/done/`.

## Merge и конфликты

| Ситуация | Действие |
|----------|----------|
| Конфликт в `app/main.py` | Согласовать с интегратором; по возможности разнести точки входа по `app/pages/` |
| Два агента правят одну зону | Стоп: пересмотреть разбиение задач |
| Нужно изменить `src/domain/constants.py` | Одна задача «контракты» (T02), остальные только читают |

**Интегратор** (роль на хакатоне): следит за `main`, порядком merge, демо-данными.

## Проверка перед PR

```bash
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
streamlit run app/main.py
```

Минимум: сценарий из acceptance criteria задачи + переключение ролей, если затронут UI.

## Сообщения коммитов

Формат: `<TASK_ID>: <кратко что и зачем>`

Примеры:

- `T01: каркас Streamlit и переключатель роли`
- `T08: сохранение запроса родителя в SQLite`
