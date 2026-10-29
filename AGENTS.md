# AGENTS.md — карта репозитория (Fin Bridge)

**Не читай всё подряд.** Сначала эта страница, затем только нужные файлы из [docs/index.md](docs/index.md).

Модель рассуждает; **harness** — всё в git, что превращает рассуждения в безопасные действия: [harness/FRAMEWORK.md](harness/FRAMEWORK.md) (Databricks + OpenAI).

## Проект в одном абзаце

Telegram Mini App: подросток — квесты и бюджет; родитель — правила и решения по запросам. UI — `v2/web` (React + Vite, TypeScript), API — `functions/` (Firebase Functions, TypeScript), данные — Firestore. Спека: [docs/PRODUCT.md](docs/PRODUCT.md), устройство: [docs/V2.md](docs/V2.md).

## Setup

Локальный запуск на эмуляторах Firebase (без Telegram и prod): [docs/LOCAL_DEV.md](docs/LOCAL_DEV.md).

```bash
npm install && (cd functions && npm install) && (cd v2/web && npm install)
./scripts/verify.sh
```

## Рабочий цикл (ReAct)

1. **Reason** — задача в `tasks/in-progress/`, зона `owns`, зависимости в `tasks/done/`.
2. **Act** — ветка `agent/<ник>/<id>`, правки только в своей зоне ([harness/OWNERSHIP.md](harness/OWNERSHIP.md)).
3. **Observe** — `./scripts/verify.sh` + smoke из [docs/QUALITY.md](docs/QUALITY.md).
4. **Repeat** — до выполнения acceptance criteria; PR в `main`.

Подробно: [harness/COORDINATION.md](harness/COORDINATION.md), промпт: [templates/AGENT_PROMPT.md](templates/AGENT_PROMPT.md).

## Куда смотреть дальше

| Вопрос | Документ |
|--------|----------|
| Что строим? | [docs/product-specs/index.md](docs/product-specs/index.md) |
| Куда класть код? | [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) |
| Как устроено приложение? | [docs/V2.md](docs/V2.md) — `v2/web` + `functions/` |
| Как запустить локально? | [docs/LOCAL_DEV.md](docs/LOCAL_DEV.md) |
| Можно ли так? | [docs/design-docs/core-beliefs.md](docs/design-docs/core-beliefs.md) |
| Как не конфликтовать? | [harness/OWNERSHIP.md](harness/OWNERSHIP.md) |
| Данные (Firestore) | [docs/V2.md](docs/V2.md) — «Модель аккаунтов» |

## Инварианты (кратко)

- UI — `v2/web`, API и Firestore — только `functions/` (фронт ходит в базу через `/api`).
- Константы и проверки бюджета — `functions/src/domain.ts` (копия во фронте: `v2/web/src/domain/budget.ts`).
- Не коммитить `.env`, `functions/.env`, `node_modules/`.
- MVP-запреты: банк, реальные карты, trust-score, авто-лимиты — см. core-beliefs.

## Cursor

Правила: `.cursor/rules/`. Человеческий README: [README.md](README.md).
