# Firebase Hosting и Telegram Mini App

Проект Firebase: **fin-brdg**  
Публичные URL после деплоя:

- https://fin-brdg.web.app  
- https://fin-brdg.firebaseapp.com  

(`authDomain` в конфиге Web App — `fin-brdg.firebaseapp.com`.)

## Что лежит в репозитории

| Путь | Назначение |
|------|------------|
| `firebase.json`, `.firebaserc` | Hosting → **`v2/web/dist`**, rewrites `/api/**` → Functions |
| **`v2/web/`** | **Prod** Telegram Mini App (React) |
| `functions/` | API v2 (onboarding, family, квесты) |
| `scripts/deploy-firebase-hosting.sh` | Сборка v2 + deploy hosting |
| `scripts/deploy-v2.sh` | Сборка v2 + functions + rules |

Подробно: [V2.md](V2.md).

## Первый деплой (локально)

Нужен доступ Google-аккаунта к проекту `fin-brdg` (выдаёт владелец). Глобальный `firebase` не нужен — CLI берётся из `node_modules` корня репо.

```bash
# из корня репо, один раз (или после «credentials are no longer valid»)
npm install
npx firebase login --reauth

# из свежего чистого main
git checkout main && git pull
./scripts/deploy-firebase-hosting.sh   # только v2/web
./scripts/deploy-v2.sh                 # web + functions + Firestore rules/indexes
```

Скрипты сами собирают `v2/web/dist` и `functions/lib` (в git их нет) и проверяют вход в Firebase. Для `deploy-v2.sh` нужен prod-`functions/.env` (`TELEGRAM_BOT_TOKEN`, `ADMIN_USERS`, `ADMIN_SESSION_SECRET`) — см. [V2.md](V2.md#деплой).

Если в консоли Firebase ещё нет **Hosting** default site: Build → Hosting → Get started (или `firebase init hosting` уже привязан к `fin-brdg`).

## BotFather (@fin_brdg_bot)

| Поле | Значение |
|------|----------|
| Menu Button | **Поехали** |
| Web App URL | `https://fin-brdg.web.app` |
| Web App title | **Fin Bridge** |
| Domain | `fin-brdg.web.app` (без `https://`) |

Подробнее тексты: [TELEGRAM_BOT.md](TELEGRAM_BOT.md).

## Firebase Web SDK

Во фронте не используется: `v2/web` ходит к данным только через `/api` (Functions), `./scripts/verify.sh` это проверяет. Сниппет `initializeApp` из консоли Firebase не нужен.

## Локальная проверка статики

```bash
npm --prefix v2/web run build   # dist/ не в git
npx firebase emulators:start --only hosting --project demo-fin-brdg
```

Откройте URL эмулятора; без Telegram клиента увидите заглушку и подсказку открыть бота.
