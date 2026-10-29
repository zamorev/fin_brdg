---
id: T15
title: Удалить v1 (Streamlit) и legacy-заглушку web/
status: in-progress
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
  - .env.example
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

- [ ] Сценарии из `tests/test_domain.py` и `tests/test_quest_week_budget.py` сохранены в `docs/design-docs/domain-test-cases.md`
- [ ] Удалены `app/`, `src/`, `tests/`, `data/`, `requirements.txt`, `web/`, `.cursor/rules/python-streamlit.mdc`
- [ ] T05–T10 перенесены в `tasks/archive/`
- [ ] `./scripts/verify.sh` — typecheck `v2/web` и `functions`, без записи файлов; проходит
- [ ] В рабочих инструкциях нет команд/путей v1 (`git grep` чистый, кроме истории)
- [ ] Smoke на эмуляторах: онбординг → главная подростка

## Notes
