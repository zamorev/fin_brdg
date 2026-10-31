---
id: T23
title: Хвосты после T13/T17 — бренд, документы, артефакты сборки
status: done
owns:
  - J2 (одна строка): v2/web/src/copy/defaults.ts — дефолт `ui.teen.levelLabel` (шапка подростка)
  - K2 (одна строка): functions/src/cms/catalog.ts — тот же ключ в каталоге CMS
  - docs/V2.md, v2/README.md, docs/generated/firestore-schema.md, docs/LOCAL_DEV.md, docs/ARCHITECTURE.md (строка про сборку)
  - .gitignore
  - functions/lib/**, v2/web/dist/**, v2/web/tsconfig.tsbuildinfo (убрать из git)
depends-on: []
priority: средний
claimed-by: sw3artog0d
branch: agent/sw3artog0d/T23
started: 2026-10-31
---

# T23 — Хвосты, накопившиеся с T13 и T17

## Description

Мелкие, независимые доработки, которые откладывали «до закрытия T13/T17». Подходит второму разработчику параллельно с T19–T20.

| # | Что | Где |
|---|-----|-----|
| 1 | В шапке главной подростка «Level Up» вместо логотипа **Fin Bridge**. Текст идёт из CMS-ключа `ui.teen.levelLabel` (T25): в prod уже исправлен через админку, в коде остался дефолт «Level Up» | `copy/defaults.ts`, `cms/catalog.ts` |
| 2 | `V2.md` ещё описывает v1 и `web/`: строки «Не путать с `web/`», «Streamlit + SQLite (`app/`, `src/`)», «Не трогаем `app/`, `src/domain`» | `docs/V2.md` |
| 3 | «Не путать с `web/` (legacy shell)» | `v2/README.md` |
| 4 | Нет коллекции `scenarioRuns` (T17) | `docs/generated/firestore-schema.md` |
| 5 | В `.gitignore` вернулся `web/js/config.local.js` (каталога `web/` нет с T15) | `.gitignore` |
| 6 | В git 56 файлов сборки: `functions/lib/**`, `v2/web/dist/**`, `tsconfig.tsbuildinfo` — каждый PR тянет шум и конфликты; деплой (`deploy-*.sh`, `predeploy` в `firebase.json`) собирает заново | git |

## Acceptance Criteria

- [x] Шапка подростка — «Fin Bridge» (как на главной родителя)
- [x] `V2.md`, `v2/README.md` — без упоминаний v1 / `web/`; таблица задач `V2.md` не сломана
- [x] `firestore-schema.md`: `scenarioRuns` — поля по `functions/src/scenarioRuns.ts` (`scenarioId`, `scenarioVersion`, `familyId`, `teenTelegramId`, `status`, `currentNodeId`, `stepStatus`, `readyAt`, `notifiedAt`, `history`), индексы из `firestore.indexes.json`
- [x] `.gitignore` без `web/js/config.local.js`
- [x] **По согласованию с Павлом:** `functions/lib/`, `v2/web/dist/`, `*.tsbuildinfo` — `git rm --cached` + в `.gitignore`; проверено, что `./scripts/deploy-v2.sh` и `deploy-firebase-hosting.sh` собирают с нуля (сухой прогон сборки без `firebase deploy`)
- [x] В [docs/LOCAL_DEV.md](../../docs/LOCAL_DEV.md) убрано предупреждение «`dist/` в git, не запускай build»
- [x] `./scripts/verify.sh` OK; smoke: главная подростка с новой шапкой

## Итоги (2026-10-31)

- Шапка: дефолт `ui.teen.levelLabel` = «Fin Bridge» в `copy/defaults.ts` и `cms/catalog.ts` (подпись в админке — «Подросток: заголовок»). В prod CMS значение уже было исправлено вручную.
- Сборка: 56 файлов сняты с учёта (`git rm --cached`). Сухой прогон шагов `deploy-v2.sh` / `deploy-firebase-hosting.sh` с удалёнными `dist/` и `lib/`: `npm ci` + `build` создают `v2/web/dist` (7 файлов) и `functions/lib` (23 `.js`), `git status` чистый.
- После `git pull` у участников исчезнут локальные `v2/web/dist/` и `functions/lib/` — пересоберутся при деплое / запуске эмулятора. Ветки, где менялась сборка, при merge получат конфликт modify/delete — удалить файлы сборки.
- `./scripts/verify.sh` OK; smoke на эмуляторах (демо-семья, подросток `100001`): главная — «Fin Bridge», консоль без ошибок.

## Notes

- Пункт 6 меняет привычки команды (после `git pull` у всех исчезнут файлы сборки) — merge только после «ок» Павла; если нет согласия — сделать 1–5, пункт 6 вынести в отдельную задачу.
- `TeenHome.tsx` не трогаем: шапка меняется через дефолт CMS-ключа, конфликта с T22 нет.
- 2026-10-31: T25 в done — зоны `copy/**`, `cms/**`, `firestore-schema.md` свободны; пункт 6 согласован с Павлом.
