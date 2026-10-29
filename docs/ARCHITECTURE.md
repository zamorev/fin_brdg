# Архитектура (Telegram Mini App + Firebase)

Продукт и сценарии — [PRODUCT.md](PRODUCT.md); онбординг, инвайты, API подробно — [V2.md](V2.md); локальный запуск — [LOCAL_DEV.md](LOCAL_DEV.md).

## Поток данных

```text
Telegram (@fin_brdg_bot, кнопка Menu «Fin Bridge»)
  │ WebView
  ▼
Firebase Hosting  https://fin-brdg.web.app      ← раздаёт v2/web/dist
  │ React (v2/web): screens → api/client.ts
  │ каждый запрос: Authorization: tma <initData>
  ▼
/api/**  → rewrite → Cloud Function `api` (europe-west1)
  │ app.ts       маршруты Express, authMiddleware (telegram.ts)
  │ store.ts     сценарии + Firestore (users, families, requests)
  │ domain.ts    числа и проверки бюджета, без I/O
  ▼
Firestore  — схема: generated/firestore-schema.md

Telegram Bot API ──webhook──▶ /api/telegram/webhook → botWebhook.ts → pendingInvites
```

## Каталоги

### Фронт — `v2/web/src`

| Путь | Назначение |
|------|------------|
| `main.tsx` | Точка входа, провайдеры (`TwaProvider`, `SessionProvider`) |
| `App.tsx` | Выбор экрана: `route` в `useState`, без роутера |
| `screens/` | Экраны — один файл на экран (`TeenHome`, `QuestBudget`, `FamilyScreen`…) |
| `components/` | Переиспользуемое: `MainAction` (MainButton), `useBackAction` (BackButton), `MemberAvatar` |
| `api/client.ts` | **Единственное место с `fetch`**: все вызовы `/api`, заголовок `tma <initData>` |
| `session/` | Сессия пользователя (`GET /api/me`) для всего приложения |
| `twa/` | Telegram WebApp SDK: тема, safe area, `ready()`, MainButton/BackButton |
| `telegram/bot.ts` | Ссылки и тексты приглашений, разбор `start_param` |
| `domain/` | Типы и копия правил бюджета для мгновенной проверки в UI (источник правды — `functions/src/domain.ts`) |
| `styles/global.css` | Стили, тёмная/светлая тема Telegram |

### Бэкенд — `functions/src`

| Файл | Назначение |
|------|------------|
| `index.ts` | Экспорт функции `api` (регион `europe-west1`), токен бота из `TELEGRAM_BOT_TOKEN` |
| `app.ts` | Маршруты Express `/api/*`: разбор запроса → вызов `store` → JSON / ошибка 400 |
| `telegram.ts` | Проверка подписи `initData` (HMAC токеном бота), `authMiddleware` |
| `store.ts` | Сценарии (онбординг, семья, квесты, запросы) и чтение/запись Firestore |
| `domain.ts` | Константы и проверки бюджета, квест «непредвиденная покупка», проверка запроса. **Без Firebase и Express** |
| `botWebhook.ts`, `inviteParam.ts`, `pendingInvite.ts` | Бот: `/start inv_…` → `pendingInvites` → join при следующем `/api/me` |
| `profilePhoto.ts` | Аватарки через Bot API, отдача через `/api/avatar/:id` |

`functions/lib/` и `v2/web/dist/` — результат сборки. Руками не править.

## Правила слоёв

Проверяются механически в `./scripts/verify.sh`:

1. **Firestore и `firebase-admin` — только в `functions/`.** Фронт работает с данными через `/api`; `firestore.rules` закрывают прямой доступ клиентам.
2. **`fetch` — только в `v2/web/src/api/`.** Экраны вызывают функции `api/client.ts`.
3. **`functions/src/domain.ts` не импортирует Firebase и Express** — чистые функции, их можно тестировать без эмулятора.

Договорённости (без автоматической проверки):

4. Маршруты в `app.ts` тонкие: разбор `req` → вызов `store` → ответ. Логику — в `store.ts`/`domain.ts`.
5. Числа бюджета (1 500 ₽, минимумы, 250 ₽ билета) — только в домене. В экранах — импорт, не литералы.
6. Права проверяются на сервере (`requireUser(user, "parent")` и т.п.), не только скрытием кнопки.

## Куда класть новый код

| Нужно | Где | Ещё не забыть |
|-------|-----|---------------|
| Новый экран | `v2/web/src/screens/<Name>.tsx` | вариант в `Route` и ветка в `App.tsx`; MainButton — через `MainAction`, «Назад» — `useBackAction` |
| Новый вызов API с фронта | функция в `v2/web/src/api/client.ts` | типы ответа — в `v2/web/src/domain/types.ts` |
| Новый маршрут API | `functions/src/app.ts` + функция в `store.ts` | `authMiddleware` для всего, кроме health/webhook; таблица API в `V2.md` |
| Новая коллекция или поле Firestore | `functions/src/store.ts` (или отдельный модуль рядом) | тип `…Doc`, [generated/firestore-schema.md](generated/firestore-schema.md); индекс — `firestore.indexes.json` |
| Новое правило / число бюджета | `functions/src/domain.ts` | та же правка в `v2/web/src/domain/budget.ts`, пока домен не объединён; кейсы — [design-docs/domain-test-cases.md](design-docs/domain-test-cases.md) |
| Текст для пользователя | там, где показывается | тон — [design-docs/tone-of-voice.md](design-docs/tone-of-voice.md) |
| Новый секрет / переменная | `functions/.env` (не в git) | пример в `functions/.env.example`; сказать тому, кто деплоит |

## Вход и роли

- Пароля и логина нет. Telegram передаёт в Mini App подписанный `initData`; сервер проверяет подпись токеном бота и берёт Telegram ID.
- **1 Telegram = 1 пользователь** (`users/{telegramId}`). Роль `teen` | `parent` выбирается один раз при онбординге, переключателя нет.
- До онбординга пользователь `anonymous`; в семью попадает через «Создать семью» или по ссылке-приглашению.
- Локально (эмулятор + `AUTH_SKIP=1`) запрос без `initData` становится пользователем `100001 / Dev Teen` — см. [LOCAL_DEV.md](LOCAL_DEV.md).

## Сборка и деплой

| Что | Команда | Кто |
|-----|---------|-----|
| Проверка перед PR | `./scripts/verify.sh` | любой |
| Локальный запуск | [LOCAL_DEV.md](LOCAL_DEV.md) | любой |
| Только фронт в prod | `./scripts/deploy-firebase-hosting.sh` | с доступом к проекту `fin-brdg` |
| Фронт + функции + правила | `./scripts/deploy-v2.sh` | с доступом к проекту `fin-brdg` |

Деплой собирает код **с диска** того, кто деплоит (CI нет): перед деплоем — `git pull` и чистый `git status`.

## Согласование с harness

Зоны владения: [harness/OWNERSHIP.md](../harness/OWNERSHIP.md). Задачи: `tasks/`. Проверки: [QUALITY.md](QUALITY.md).
