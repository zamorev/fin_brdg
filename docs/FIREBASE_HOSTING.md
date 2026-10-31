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

```bash
# CLI (один из вариантов)
npm install -g firebase-tools
# или из корня репо:
npm install

firebase login
chmod +x scripts/deploy-firebase-hosting.sh
./scripts/deploy-firebase-hosting.sh
```

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
