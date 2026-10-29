---
id: T18
title: Hotfix — экраны закрываются сразу после открытия (BackButton)
status: backlog
owns:
  - J2: v2/web/src/twa/**, v2/web/src/components/useBackAction.ts
  - docs/QUALITY.md
depends-on: []
priority: блокер
---

# T18 — Экраны Mini App закрываются сразу после открытия

## Description

В проде и локально из интерфейса доступны только главная и «Семья». Нажатие «Начать» на квесте, карточка сценария, статус запроса, экран решения родителя — экран открывается и тут же возвращается на главную.

**Причина** (с первого коммита Mini App `42aeac3`): обработчик «Назад» хранится в `useState` (`TwaProvider.tsx`), а `useBackAction` передаёт в сеттер саму функцию — `setBackHandler(handler)`. React считает функцию «updater» и **вызывает её сразу**: срабатывает `onBack` → `goHome`. В консоли: `Cannot update a component (App) while rendering a different component (TwaProvider)`.

«Семья» работает случайно: задержка 650 мс в `useBackAction` + guard 800 мс в `App.tsx` (`backFromFamily`) гасят ложный вызов.

Проверено временной правкой `setBackHandler(() => handler)`: вся цепочка подростка и сценарий «Ой, кино» открываются.

## Acceptance Criteria

- [ ] Сеттер в `TwaProvider` всегда кладёт функцию через обёртку (`setBackHandler(() => h)`), один раз в провайдере — не в каждом вызове
- [ ] В консоли нет `Cannot update a component … while rendering`
- [ ] Кликами в браузере (эмуляторы, [LOCAL_DEV.md](../../docs/LOCAL_DEV.md)) открываются и не закрываются сами: `QuestBudget` → `UnplannedPurchase` → `Consequences` → `NewConditions` → `RequestSent` → `RequestStatusTeen`; `ScenarioStep`; «Семья»
- [ ] «Назад» (кнопка экрана) возвращает на главную
- [ ] В [docs/QUALITY.md](../../docs/QUALITY.md) smoke дополнен: **«пройти экраны задачи кликами»** — «главная отрисовалась» и «API отвечает» не считаются проверкой UI
- [ ] `./scripts/verify.sh` OK
- [ ] После merge — деплой фронта владельцем проекта (`./scripts/deploy-firebase-hosting.sh`) и проверка в Telegram: квест открывается, родитель открывает запрос

## Notes

- Guard'ы «Семьи» (650/800 мс) **не трогать** в этой задаче — они защищают от «хвоста» тапа в Telegram; пересмотреть отдельно, если мешают.
- `ParentRequest` локально не проверить без входа за родителя (появится в T19) — проверить в Telegram после деплоя.
- Маленькая задача: делать первой, не совмещать с T19 (обе в `twa/**`).
