# Firebase Hosting и Telegram Mini App

Проект Firebase: **fin-brdg**  
Публичные URL после деплоя:

- https://fin-brdg.web.app  
- https://fin-brdg.firebaseapp.com  

(`authDomain` в конфиге Web App — `fin-brdg.firebaseapp.com`.)

## Что лежит в репозитории

| Путь | Назначение |
|------|------------|
| `firebase.json`, `.firebaserc` | Hosting, каталог `web/` |
| `web/` | Статическая оболочка Mini App (Telegram Web App SDK) |
| `scripts/deploy-firebase-hosting.sh` | Деплой одной командой |

**Streamlit** (`app/main.py`) на Hosting не крутится. Сейчас на Hosting — заглушка; когда появится HTTPS URL Streamlit (Cloud Run, Render и т.д.), его прописывают в `web/js/config.js` → `backendUrl` (открывается в iframe).

Полноценная интеграция `initData` и роли по `telegram_id` — отдельная задача поверх бэкенда.

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
