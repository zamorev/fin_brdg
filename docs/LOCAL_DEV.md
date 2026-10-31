# Локальный запуск v2 (эмуляторы Firebase)

Mini App (`v2/web`) и API (`functions/`) на localhost: **без Telegram, без доступа к проекту `fin-brdg`, без деплоя**.
Prod не задевается: эмуляторы запускаются **только** с `--project demo-fin-brdg` — для `demo-*` Firebase физически не ходит в настоящие сервисы.

## Один раз: окружение

| Что | Зачем | Команда (macOS) |
|-----|-------|-----------------|
| Node 20+ | functions, Vite | уже есть (`node -v`); с Node 22 эмулятор только предупреждает |
| Java 21 | эмулятор Firestore (**обязателен**) | `brew install openjdk@21` |
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

`AUTH_SKIP=1` работает **только** в эмуляторе (`functions/src/telegram.ts`, `authMiddleware`): подпись `initData` не проверяется, а запрос без `initData` становится пользователем `100001 / Dev Teen`.

## Запуск — одна команда

```bash
npm run dev:v2
```

Или двойной клик по `scripts/Launch v2 Dev.command` (macOS) — тот же скрипт `scripts/launch-v2-dev.sh`. Он:

1. проверяет `functions/.env` с `AUTH_SKIP=1`;
2. собирает `functions`;
3. поднимает `firebase emulators:start --only functions,firestore --project demo-fin-brdg` (Java из `/opt/homebrew/opt/openjdk@21` подхватывает сам; **без Java — останавливается**);
4. поднимает Vite (`npm run dev` в `v2/web`) и открывает http://localhost:5173.

Остановка — Ctrl+C. Логи — `.local/dev-v2/`. Emulator UI (данные Firestore, логи функций): http://localhost:4000.

Vite проксирует `/api` → `http://127.0.0.1:5001/demo-fin-brdg/europe-west1/api/api` (`v2/web/vite.config.ts`), поэтому `VITE_API_BASE` не нужен.

То же вручную, в двух терминалах:

```bash
(cd functions && npm run build)
PATH=/opt/homebrew/opt/openjdk@21/bin:$PATH npx firebase emulators:start --only functions,firestore --project demo-fin-brdg
```

```bash
cd v2/web && npm run dev
```

- Функции **не** пересобираются сами: после правок в `functions/src` — `npm run build` в `functions/` (или `npm run watch` в отдельном терминале).
- Данные живут, пока запущен эмулятор; после перезапуска база пустая.
- Первые секунды после старта эмулятора ответ `Function europe-west1-api does not exist` — функции ещё грузятся.

Проверка API без браузера:

```bash
curl http://127.0.0.1:5001/demo-fin-brdg/europe-west1/api/api/health   # {"ok":true}
```

## Вход за роль

В браузере нет `initData`. В dev-сборке `v2/web/src/api/client.ts` подставляет пользователя из `VITE_DEV_TG_USER` (формат `id:Имя`) и шлёт `Authorization: tma user=…`; эмулятор с `AUTH_SKIP=1` принимает его без подписи.

| Роль | Как запустить |
|------|---------------|
| Подросток `100001` | `npm run dev:v2` (переменная не задана) |
| Родитель `200002` | `VITE_DEV_TG_USER="200002:Dev Parent" npm run dev:v2` |
| Любой другой | `VITE_DEV_TG_USER="300003:Dev Teen 2" npm run dev:v2` → онбординг |

Переменная читается при старте Vite: чтобы сменить роль, перезапусти Vite (эмулятор можно не трогать — скрипт его переиспользует). Вместо env можно положить строку в `v2/web/.env.local` (в git не попадает).

Подмена есть **только** под `import.meta.env.DEV`: в prod-сборке этого кода нет.

Вне Telegram главная кнопка экрана — обычная кнопка внизу страницы (`MainAction`, `.btn-primary-fallback`): квесты проходятся мышкой.

## Демо-семья

При запущенном эмуляторе:

```bash
node scripts/seed-demo-family.mjs
```

Создаёт `families/demo-family`: подросток `100001 / Dev Teen` (квест «Неделя на 1 500 ₽» пройден), родитель `200002 / Dev Parent`, ожидающий запрос «развлечения 300 → 400 ₽». Повторный запуск сбрасывает демо. Пишет только в локальный эмулятор (иначе отказывается).

## Превью для агента (Claude Code)

`.claude/launch.json` в `.gitignore` — создать у себя:

```json
{
  "version": "0.0.1",
  "configurations": [
    {
      "name": "emulators",
      "runtimeExecutable": "bash",
      "runtimeArgs": ["-c", "(cd functions && npm run build) && PATH=/opt/homebrew/opt/openjdk@21/bin:$PATH npx firebase emulators:start --only functions,firestore --project demo-fin-brdg"],
      "port": 4000
    },
    {
      "name": "web",
      "runtimeExecutable": "bash",
      "runtimeArgs": ["-c", "cd v2/web && npm run dev"],
      "port": 5173
    },
    {
      "name": "web-parent",
      "runtimeExecutable": "bash",
      "runtimeArgs": ["-c", "cd v2/web && VITE_DEV_TG_USER='200002:Dev Parent' npm run dev"],
      "port": 5173
    }
  ]
}
```

Сначала `emulators`, затем `node scripts/seed-demo-family.mjs`, потом `web` или `web-parent` (порт один — по очереди).

## Smoke

Без демо-данных:

1. http://localhost:5173 → «Я подросток» → «Создать семью».
2. Главная: уровень, «Бюджет на эту неделю 1 500 ₽», задания «Неделя на 1 500 ₽», «Семья», «Мои договорённости».
3. «Неделя на 1 500 ₽» → распределить → кнопка внизу экрана → квест пройден.
4. В Emulator UI → Firestore появились `users/100001` и `families/…`.

С демо-семьёй (`seed-demo-family.mjs`):

1. За подростка (по умолчанию): главная с пройденным квестом и запросом «Ждём ответа» → «Неделя на 1 500 ₽» («Снова») → «Проверить мой бюджет» → следующий шаг квеста.
2. Перезапусти seed, затем за родителя (`VITE_DEV_TG_USER="200002:Dev Parent"`): главная → «Предложение подростка» → «Договориться на одну неделю» → «Ответить» → запрос исчез, в Firestore `requests/demo-request.status` = `approved`.

## Ловушки

- ⚠️ `scripts/seed-v2-firestore.mjs` по умолчанию пишет в эмулятор; prod — только `--prod` с вводом имени проекта. Без нужды не используй `--prod`.
- Эмулятор, запущенный **без** `--project demo-fin-brdg`, берёт `fin-brdg` из `.firebaserc` — API будет на другом пути, а Firestore без эмулятора уйдёт в prod. Скрипт запуска отказывается работать с таким эмулятором на `:5001`.
- Telegram-функции (MainButton, BackButton, тема, share-ссылка, invite через бота) в браузере не работают — это нормально. Invite между двумя аккаунтами проверяй в Telegram.
