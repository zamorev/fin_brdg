# Владение модулями (anti-conflict map)

Цель: параллельная работа без правок одних и тех же файлов разными задачами.

## Зоны

| Зона | Пути | Типичные задачи |
|------|------|-----------------|
| **A. Каркас** | `app/main.py`, `app/components/common.py`, `requirements.txt`, `pyproject.toml` | T01, интеграция |
| **B. Подросток UI** | `app/pages/teen_*.py`, `app/components/teen/` | T03–T06 |
| **C. Родитель UI** | `app/pages/parent_*.py`, `app/components/parent/` | T07–T09 |
| **D. Квесты** | `src/quests/**` | T04–T06 |
| **E. Домен** | `src/domain/**` | T02 (контракты), все читают |
| **F. Данные** | `src/db/**`, `data/*.db` (генерируется) | T08–T09 |
| **G. Тесты** | `tests/**` | T10+ (по зонам) |
| **H. Harness** | `tasks/**`, `harness/**`, `AGENTS.md` | любой — по договорённости |
| **I. Продукт** | `product/**` | только осознанные правки концепции |
| **J. v2 TWA (UI)** | `v2/web/**` | T11+, экраны Mini App, TWA |
| **K. v2 API / Hosting config** | `functions/**`, `firebase.json`, `firestore.rules`, `scripts/deploy-*.sh` | T11+, onboarding, family, deploy |

## v2 vs v1 (не дублировать)

- **Прод Telegram Mini App** — только **`v2/web`** → `v2/web/dist`. Каталог **`web/`** не деплоить и не расширять для MVP.
- Логика v2 — **`functions/`** + Firestore; Streamlit **`app/`** + SQLite **`src/db`** — другой продуктовый контур (v1).
Перед правками invite/онбординга/аватарок читать [docs/V2.md](../docs/V2.md), [T11](../tasks/done/T11-v2-family-invites-twa.md), [T12](../tasks/done/T12-v2-onboarding-users-avatars.md). **Активно: [T13](../tasks/in-progress/T13-v2-invite-bot-webhook.md)** — не дублировать webhook/pendingInvites.

## Правила

1. Задача в backlog **должна** перечислять `owns:` (зоны или пути) в frontmatter.
2. Нельзя менять зону другой **активной** задачи без согласования.
3. **Общие файлы** (зона A, E):
   - изменения — минимальные (импорт, регистрация страницы, константа);
   - предпочтительно одна задача T02 на контракты, остальные импортируют.
4. Новые страницы Streamlit — **новые файлы** в `app/pages/`, не раздувание одного `main.py`.
5. SQLite-схема — только зона F; UI не пишет SQL напрямую.

## Параллельные пары (безопасно)

| Пара | Почему |
|------|--------|
| T04 (квест 1 логика) + T07 (дашборд родителя) | `src/quests` vs `app/pages/parent_*` |
| T05 (квест 2) + T08 (запросы в БД) | разные пути, стыковка через `src/domain` |

## Пары (избегать)

| Пара | Риск |
|------|------|
| T03 + T01 | оба трогают `app/main.py` |
| T08 + T09 | оба `src/db` без очереди |
