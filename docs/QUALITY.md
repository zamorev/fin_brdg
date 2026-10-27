# Quality — контур обратной связи

Соответствует блоку **feedback / verification** в [harness/FRAMEWORK.md](../harness/FRAMEWORK.md).

## Перед PR (обязательно)

```bash
./scripts/verify.sh
```

Скрипт должен завершиться с кодом 0.

## Ручной smoke (UI)

```bash
streamlit run app/main.py
```

Пройти acceptance criteria **своей** задачи из `tasks/in-progress/`.

## Ретро по последним коммитам

Дополнение к verify: разбор **1–2 последних коммитов** и список улучшений (без автоматического рефакторинга). Процедура и формат — [harness/COORDINATION.md](../harness/COORDINATION.md) («Ретро по последним коммитам»).

## Структурные тесты

`pytest tests/test_architecture.py` — границы слоёв (domain без streamlit и т.д.).

## Домены (оценка на хакатоне)

| Домен | Слой | Цель к демо |
|-------|------|-------------|
| Каркас / роли | app | T01 |
| Домен | src/domain | T02 |
| Квесты | src/quests | T04–T05 |
| Персистентность | src/db | T08 |
| Родитель | app/pages parent | T07, T09 |

Обновляйте чеклисты в файлах задач, не в этом документе.
