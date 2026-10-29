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
| `priority` | нет | `блокер` \| `высокий` \| `средний` \| `низкий` |
| `claimed-by` | при claim | Ник участника |
| `branch` | при claim | Имя ветки |

## Секции в теле

- **Description**
- **Acceptance Criteria** (чеклист)
- **Notes** (опционально)

Текущая очередь и порядок задач: [docs/exec-plans/active/epic-dod.md](../docs/exec-plans/active/epic-dod.md).

## Перемещение

- `backlog/` → `in-progress/` при старте
- `in-progress/` → `done/` после merge в `main`

**Сразу после claim:** обновить frontmatter, закоммитить перенос и **запушить** ветку на remote — иначе другой участник может взять тот же id. Подробно: [harness/COORDINATION.md](../harness/COORDINATION.md) («Claim»).

Не редактируй чужую задачу в `in-progress/` без согласования.
