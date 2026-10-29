---
id: T23
title: Хвосты после T13/T17 — бренд, документы, артефакты сборки
status: backlog
owns:
  - J1 (одна строка): v2/web/src/screens/TeenHome.tsx — шапка
  - docs/V2.md, v2/README.md, docs/generated/firestore-schema.md
  - .gitignore
  - functions/lib/**, v2/web/dist/**, v2/web/tsconfig.tsbuildinfo (убрать из git)
depends-on: []
priority: средний
---

# T23 — Хвосты, накопившиеся с T13 и T17

## Description

Мелкие, независимые доработки, которые откладывали «до закрытия T13/T17». Подходит второму разработчику параллельно с T19–T20.

| # | Что | Где |
|---|-----|-----|
| 1 | В шапке главной подростка «Level Up» вместо логотипа **Fin Bridge** | `TeenHome.tsx` |
| 2 | `V2.md` ещё описывает v1 и `web/`: строки «Не путать с `web/`», «Streamlit + SQLite (`app/`, `src/`)», «Не трогаем `app/`, `src/domain`» | `docs/V2.md` |
| 3 | «Не путать с `web/` (legacy shell)» | `v2/README.md` |
| 4 | Нет коллекции `scenarioRuns` (T17) | `docs/generated/firestore-schema.md` |
| 5 | В `.gitignore` вернулся `web/js/config.local.js` (каталога `web/` нет с T15) | `.gitignore` |
| 6 | В git 40 файлов сборки: `functions/lib/**`, `v2/web/dist/**`, `tsconfig.tsbuildinfo` — каждый PR тянет шум и конфликты; деплой (`deploy-*.sh`, `predeploy` в `firebase.json`) собирает заново | git |

## Acceptance Criteria

- [ ] Шапка подростка — «Fin Bridge» (как на главной родителя)
- [ ] `V2.md`, `v2/README.md` — без упоминаний v1 / `web/`; таблица задач `V2.md` не сломана
- [ ] `firestore-schema.md`: `scenarioRuns` — поля по `functions/src/scenarioRuns.ts` (`scenarioId`, `scenarioVersion`, `familyId`, `teenTelegramId`, `status`, `currentNodeId`, `stepStatus`, `readyAt`, `notifiedAt`, `history`), индексы из `firestore.indexes.json`
- [ ] `.gitignore` без `web/js/config.local.js`
- [ ] **По согласованию с Павлом:** `functions/lib/`, `v2/web/dist/`, `*.tsbuildinfo` — `git rm --cached` + в `.gitignore`; проверено, что `./scripts/deploy-v2.sh` и `deploy-firebase-hosting.sh` собирают с нуля (сухой прогон сборки без `firebase deploy`)
- [ ] В [docs/LOCAL_DEV.md](../../docs/LOCAL_DEV.md) убрано предупреждение «`dist/` в git, не запускай build»
- [ ] `./scripts/verify.sh` OK; smoke: главная подростка с новой шапкой

## Notes

- Пункт 6 меняет привычки команды (после `git pull` у всех исчезнут файлы сборки) — merge только после «ок» Павла; если нет согласия — сделать 1–5, пункт 6 вынести в отдельную задачу.
- `TeenHome.tsx` правят T22 (строка бюджета) и J1b (карточки сценария) — здесь только шапка, конфликт минимальный.
