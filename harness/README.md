# Harness — координация агентов и людей

Этот каталог описывает **как** работать с репозиторием `fin_brdg`, когда несколько участников подключаются через Cursor (или других coding-агентов) параллельно.

Код приложения лежит в корне репозитория (отдельный nested `project/` не используем — хакатонный монорепо).

## Слои

| Слой | Где | Назначение |
|------|-----|------------|
| Продукт | `docs/PRODUCT.md` | Что строим; не менять без согласования |
| Инструкции агента | `AGENTS.md`, `templates/AGENT_PROMPT.md` | Единые правила для любого агента |
| Правила Cursor | `.cursor/rules/*.mdc` | Автоподхват в IDE |
| Очередь работ | `tasks/backlog/`, `in-progress/`, `done/` | Одна задача — один исполнитель |
| Владение файлами | `harness/OWNERSHIP.md` | Снижение merge-конфликтов |
| Процесс | `harness/COORDINATION.md` | Ветки, коммиты, слияние |
| Теория | `harness/FRAMEWORK.md` | Databricks + OpenAI harness engineering |
| База знаний | `docs/index.md` | Оглавление (не монолитный AGENTS) |
| Проверка | `scripts/verify.sh`, `docs/QUALITY.md` | Контур observe/verify |

## Быстрый старт для участника

1. Прочитать `AGENTS.md` и `docs/PRODUCT.md` (описание идеи, DoD).
2. Выбрать задачу из `tasks/backlog/` (без чужого `claimed-by` в frontmatter).
3. Заявить задачу: перенести файл в `tasks/in-progress/` и добавить в frontmatter `claimed-by` и `branch`.
4. Создать ветку `agent/<ник>/<id-задачи>` от актуального `main`.
5. Работать **только** в зоне владения из `OWNERSHIP.md`; общие файлы — минимальные диффы.
6. По готовности: критерии в задаче, `./scripts/verify.sh` и smoke на эмуляторах ([docs/LOCAL_DEV.md](../docs/LOCAL_DEV.md)), коммит, PR в `main`.
7. Перенести задачу в `tasks/done/`, обновить чеклист в файле.

## Что harness не делает

- Не запускает параллельных CLI-агентов (нет Docker/tmux из [parallel-agent-harness](https://github.com/pearls-lab/parallel-agent-harness)).
- Не подменяет code review: перед merge в `main` — человек или ответственный за интеграцию.

При необходимости позже можно подключить worktree-скрипты; структура задач и владения уже совместима с таким расширением.
