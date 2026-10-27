# Очередь задач

Формат файлов — Markdown с YAML frontmatter.

## Поля frontmatter

| Поле | Обязательно | Описание |
|------|-------------|----------|
| `id` | да | T01, T02, … |
| `title` | да | Короткое название |
| `status` | да | `backlog` \| `in-progress` \| `done` |
| `owns` | да | Зоны из `harness/OWNERSHIP.md` или пути |
| `depends-on` | нет | Список id, например `[T02]` |
| `claimed-by` | при claim | Ник участника |
| `branch` | при claim | Имя ветки |

## Секции в теле

- **Description**
- **Acceptance Criteria** (чеклист)
- **Notes** (опционально)

## Перемещение

- `backlog/` → `in-progress/` при старте
- `in-progress/` → `done/` после merge в `main`

Не редактируй чужую задачу в `in-progress/` без согласования.
