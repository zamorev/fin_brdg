# fin_brdg — Fin Bridge

Прототип для хакатона: финансовые квесты для подростка и панель родителя.  
Концепция и MVP: [`docs/PRODUCT.md`](docs/PRODUCT.md).

## Быстрый старт

Telegram Mini App (React + Firebase): устройство — [`docs/V2.md`](docs/V2.md), локальный запуск на эмуляторах — [`docs/LOCAL_DEV.md`](docs/LOCAL_DEV.md).

```bash
npm install && (cd functions && npm install) && (cd v2/web && npm install)
./scripts/verify.sh
```

Деплой в prod (нужен доступ к проекту Firebase `fin-brdg`): [`docs/FIREBASE_HOSTING.md`](docs/FIREBASE_HOSTING.md), `./scripts/deploy-v2.sh`.

## Команда и агенты

Репозиторий настроен как **agent harness**:

| Документ | Для кого |
|----------|----------|
| [`AGENTS.md`](AGENTS.md) | Любой coding-агент |
| [`harness/README.md`](harness/README.md) | Люди: как координироваться |
| [`tasks/backlog/`](tasks/backlog/) | Очередь задач |

Заявить задачу: `./scripts/claim-task.sh T01 your-nick` (см. `harness/COORDINATION.md`).

## Структура

`v2/web/` — Mini App (UI), `functions/` — API и Firestore. Подробно: [`docs/V2.md`](docs/V2.md).
