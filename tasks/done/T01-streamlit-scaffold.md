---
id: T01
title: Каркас Streamlit и переключение ролей
status: done
owns: [A, B, C]  # B, C: только заглушки app/pages/teen_home.py, parent_home.py
depends-on: []
claimed-by: sw3artog0d
branch: agent/sw3artog0d/T01
started: 2026-10-28
---

# T01 — Каркас Streamlit и переключение ролей

## Description

Минимальное приложение: точка входа, выбор роли «Подросток» / «Родитель», заглушки страниц для каждой роли. Навигация через `st.session_state`, без БД.

## Acceptance Criteria

- [x] `streamlit run app/main.py` запускается без ошибок
- [x] На старте можно выбрать роль; выбор сохраняется в сессии
- [x] Для каждой роли отображается отдельная заглушка-страница
- [x] `requirements.txt` содержит streamlit и совместимые версии
- [x] Структура каталогов соответствует `docs/ARCHITECTURE.md`

## Notes

Не реализовывать квесты и БД — только каркас. Следующие задачи добавляют страницы в `app/pages/`.

## Result

- `app/main.py` — выбор роли в `st.session_state["role"]`, роутинг через `PAGES` → `render()` страниц.
- `app/pages/teen_home.py` (→ T03), `app/pages/parent_home.py` (→ T07) — заглушки с `render()`.
- `st.navigation(..., position="hidden")` отключает автоподхват `app/pages/` как multipage: подросток не видит экраны родителя в sidebar, прямой URL `/teen_home` уводит на главную.
- `main.py` добавляет корень репо в `sys.path`, чтобы страницы импортировали `app.*` и `src.*` при `streamlit run app/main.py`.
- `requirements.txt`: `streamlit>=1.36` (нужны `st.navigation` / `st.Page`).
