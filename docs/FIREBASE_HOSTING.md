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
| `web/` | Legacy-заглушка, **не** деплоится |
| `functions/` | API v2 (onboarding, family, квесты) |
| `scripts/deploy-firebase-hosting.sh` | Сборка v2 + deploy hosting |
| `scripts/deploy-v2.sh` | Сборка v2 + functions + rules |

Подробно: [V2.md](V2.md). Streamlit (`app/main.py`) на Hosting **не** крутится.

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

## Firebase Web SDK (опционально)

Сниппет из консоли (`initializeApp`, Analytics) нужен только если фронт использует Firestore/Auth. Для одного Hosting он не обязателен. Шаблон полей — `web/js/firebase.config.example.js`; значения держите локально, не коммитьте лишнее.

## Локальная проверка статики

```bash
npx firebase emulators:start --only hosting
```

Откройте URL эмулятора; без Telegram клиента увидите заглушку и подсказку открыть бота.
