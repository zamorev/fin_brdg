# Локальный запуск v2 (эмуляторы Firebase)

Mini App (`v2/web`) и API (`functions/`) на localhost: **без Telegram, без доступа к проекту `fin-brdg`, без деплоя**.
Prod не задевается: эмуляторы запускаются с `--project demo-fin-brdg` — для `demo-*` Firebase физически не ходит в настоящие сервисы.

## Один раз: окружение

| Что | Зачем | Команда (macOS) |
|-----|-------|-----------------|
| Node 20+ | functions, Vite | уже есть (`node -v`); с Node 22 эмулятор только предупреждает |
| Java 21 | эмулятор Firestore | `brew install openjdk@21` |
| Firebase CLI | эмуляторы | ставится из корневого `package.json`, глобально не нужен |

```bash
npm install                      # корень: firebase-tools
(cd functions && npm install)
(cd v2/web && npm install)
```

Если `npm install` изменил `package-lock.json` — не коммить, верни: `git checkout -- package-lock.json v2/web/package-lock.json`.

`functions/.env` (в `.gitignore`, не коммитить):

```bash
TELEGRAM_BOT_TOKEN=local-dummy-token
AUTH_SKIP=1
```

`AUTH_SKIP=1` работает **только** в эмуляторе: запрос без `initData` становится пользователем `100001 / Dev Teen` (`functions/src/telegram.ts`, `authMiddleware`).

## Каждый раз: два процесса

**1. API + Firestore** (терминал 1):

```bash
(cd functions && npm run build)
PATH=/opt/homebrew/opt/openjdk@21/bin:$PATH npx firebase emulators:start --only functions,firestore --project demo-fin-brdg
```

- Emulator UI (данные Firestore, логи функций): http://localhost:4000
- Функции **не** пересобираются сами: после правок в `functions/src` — `npm run build` в `functions/` (или `npm run watch` в третьем терминале).
- Данные живут, пока запущен эмулятор; после перезапуска база пустая.

**2. Фронт** (терминал 2):

```bash
cd v2/web
VITE_API_BASE=http://127.0.0.1:5001/demo-fin-brdg/europe-west1/api/api npx vite --port 5173
```

Открыть http://localhost:5173 — онбординг «Кто ты в Fin Bridge?». Правки в `v2/web/src` подхватываются сразу (HMR).

Проверка API без браузера:

```bash
curl http://127.0.0.1:5001/demo-fin-brdg/europe-west1/api/api/health   # {"ok":true}
curl http://127.0.0.1:5001/demo-fin-brdg/europe-west1/api/api/me       # needsOnboarding: true
```

Первые секунды после старта эмулятора ответ `Function europe-west1-api does not exist` — функции ещё грузятся, подожди.

## Превью для агента (Claude Code)

`.claude/launch.json` в `.gitignore` — создать у себя:

```json
{
  "version": "0.0.1",
  "configurations": [
    {
      "name": "emulators",
      "runtimeExecutable": "bash",
      "runtimeArgs": ["-c", "PATH=/opt/homebrew/opt/openjdk@21/bin:$PATH npx firebase emulators:start --only functions,firestore --project demo-fin-brdg"],
      "port": 4000
    },
    {
      "name": "web",
      "runtimeExecutable": "bash",
      "runtimeArgs": ["-c", "cd v2/web && VITE_API_BASE=http://127.0.0.1:5001/demo-fin-brdg/europe-west1/api/api npx vite --port 5173"],
      "port": 5173
    }
  ]
}
```

Сначала `emulators`, потом `web`.

## Smoke

1. http://localhost:5173 → «Я подросток» → «Создать семью».
2. Главная: уровень, «Бюджет на эту неделю 1 500 ₽», задания «Неделя на 1 500 ₽», «Семья», «Мои договорённости».
3. В Emulator UI → Firestore появились `users/100001` и `families/…`.

## Ловушки

- ⚠️ **`scripts/seed-v2-firestore.mjs` по умолчанию пишет в prod `fin-brdg`.** Локально — только с `FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 FIREBASE_PROJECT=demo-fin-brdg`.
- **`npm run dev` в `v2/web` не работает с эмулятором:** прокси в `vite.config.ts` указывает на `fin-brdg/us-central1`, а функция в `europe-west1`. Пока используем `VITE_API_BASE` (см. выше).
- **Не запускай `npm run build` в `v2/web` без нужды** — `v2/web/dist/` в git, сборка меняет файлы.
- Пользователь в эмуляторе один (`100001`, подросток). Роль родителя / invite между двумя аккаунтами локально пока не проверить — только через Telegram.
- Telegram-функции (MainButton, BackButton, тема, share-ссылка) в браузере не работают — это нормально.
