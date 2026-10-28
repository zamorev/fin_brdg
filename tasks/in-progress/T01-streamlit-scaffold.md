---
id: T01
title: Каркас Streamlit и переключение ролей
status: in-progress
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

- [ ] `streamlit run app/main.py` запускается без ошибок
- [ ] На старте можно выбрать роль; выбор сохраняется в сессии
- [ ] Для каждой роли отображается отдельная заглушка-страница
- [ ] `requirements.txt` содержит streamlit и совместимые версии
- [ ] Структура каталогов соответствует `docs/ARCHITECTURE.md`

## Notes

Не реализовывать квесты и БД — только каркас. Следующие задачи добавляют страницы в `app/pages/`.
