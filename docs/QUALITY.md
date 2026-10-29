# Quality — контур обратной связи

Соответствует блоку **feedback / verification** в [harness/FRAMEWORK.md](../harness/FRAMEWORK.md).

## Перед PR (обязательно)

```bash
./scripts/verify.sh
```

Скрипт должен завершиться с кодом 0.

## Ручной smoke (UI)

**Локально:** эмуляторы + браузер — [LOCAL_DEV.md](LOCAL_DEV.md) (раздел «Smoke»).

**В Telegram** (кнопки, инвайты, вторая роль): prod `https://fin-brdg.web.app` через @fin_brdg_bot. Онбординг/invite — [V2.md](V2.md), задачи T11–T13.

Пройти acceptance criteria **своей** задачи из `tasks/in-progress/`.

## Ретро по последним коммитам

Дополнение к verify: разбор **1–2 последних коммитов** и список улучшений (без автоматического рефакторинга). Процедура и формат — [harness/COORDINATION.md](../harness/COORDINATION.md) («Ретро по последним коммитам»).

## Структурные тесты

Пока нет: `verify.sh` проверяет только типы TS. Тесты домена (Vitest) — отдельная задача; кейсы — [design-docs/domain-test-cases.md](design-docs/domain-test-cases.md).

## Домены (оценка на хакатоне)

| Домен | Слой | Цель к демо |
|-------|------|-------------|
| Mini App (экраны, TWA) | `v2/web/src` | T11–T13 |
| API, онбординг, инвайты | `functions/src` | T11–T13 |
| Домен (бюджет, запросы) | `functions/src/domain.ts`, `v2/web/src/domain/` | — |
| Данные | Firestore через `functions/` | T11–T12 |

Обновляйте чеклисты в файлах задач, не в этом документе.
