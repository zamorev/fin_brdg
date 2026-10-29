---
id: T15
title: Удалить v1 (Streamlit) и legacy-заглушку web/
status: done
owns:
  - app/**
  - src/**
  - tests/**
  - data/**
  - requirements.txt
  - web/**
  - tasks/backlog/**
  - tasks/archive/**
  - scripts/verify.sh
  - AGENTS.md
  - README.md
  - docs/QUALITY.md
  - docs/FIREBASE_HOSTING.md
  - docs/design-docs/domain-test-cases.md
  - harness/OWNERSHIP.md
  - harness/README.md
  - harness/COORDINATION.md
  - templates/AGENT_PROMPT.md
  - .cursor/rules/**
  - .env.example (удалён)
  - .gitignore
depends-on: [T14]
claimed-by: sw3artog0d
branch: agent/sw3artog0d/T15
started: 2026-10-29
---

# T15 — Удалить v1 и заглушку web/

## Description

Команда перешла на v2 (TWA `v2/web` + Firebase `functions/`). Streamlit-прототип v1 (`app/`, `src/`, `tests/`) и статическая заглушка `web/` больше не развиваются и сбивают агентов.
Удаляем их, сохранив сценарии тестов v1 в документации, архивируем задачи под Streamlit, переводим `verify.sh` на проверку типов TS и убираем команды v1 из рабочих инструкций.

Не трогаем: `v2/web/**`, `functions/**` (зона T13), `docs/V2.md` (правит T13), историю (`tasks/done/T01–T04`, `product/_raw/`, `docs/pitch/`). Полная переписка архитектуры — отдельная задача.

## Acceptance Criteria

- [x] Сценарии из `tests/test_domain.py` и `tests/test_quest_week_budget.py` сохранены в `docs/design-docs/domain-test-cases.md`
- [x] Удалены `app/`, `src/`, `tests/`, `data/`, `requirements.txt`, `web/`, `.cursor/rules/python-streamlit.mdc`
- [x] T05–T10 перенесены в `tasks/archive/`
- [x] `./scripts/verify.sh` — typecheck `v2/web` и `functions`, без записи файлов; проходит
- [x] В рабочих инструкциях нет команд/путей v1 (`git grep` чистый, кроме истории)
- [x] Smoke на эмуляторах: онбординг → главная подростка

## Notes

- Проверено 2026-10-29: `./scripts/verify.sh` → OK (typecheck `v2/web`, `functions`, без записи файлов); smoke с чистыми эмуляторами — «Я подросток» → «Создать семью» → главная, ошибок в консоли нет.
- Отклонение от плана: корневой `.env.example` удалён целиком — корневой `.env` в v2 никто не читает, секреты в `functions/.env` (`functions/.env.example`).
- В `.gitignore` оставлен блок `.venv/`, `.pycache/`, `.pytest_cache/`, `__pycache__/` — эти папки есть локально у всех, кто запускал v1.
- Расхождения домена v1 ↔ v2 (X1–X7) — в `docs/design-docs/domain-test-cases.md`.
- Осталось на следующую задачу (смысловая переписка): `docs/ARCHITECTURE.md`, `docs/PRODUCT.md` (раздел стека), `docs/design-docs/core-beliefs.md`, `harness/FRAMEWORK.md`.
- После закрытия T13 (зона Павла): `docs/V2.md` (строки 4, 6, 140) и `v2/README.md` (строка 3) ещё упоминают `web/` и v1.

