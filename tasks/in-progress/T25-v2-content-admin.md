---
id: T25
title: v2 — тестовая админка CMS (контент + сценарии)
status: in-progress
owns:
  - K1: functions/src/adminRouter.ts, functions/src/adminAuth.ts, functions/src/app.ts
  - K2: functions/src/cms/**, docs/generated/firestore-schema.md
  - K2b: functions/src/scenarioEngine.ts, functions/src/scenarioRuns.ts, functions/src/scenarioNotify.ts, functions/src/botWebhook.ts
  - J2: v2/web/admin.html, v2/web/src/admin/**, v2/web/src/api/adminClient.ts, v2/web/src/copy/**, vite.config.ts
  - J1: v2/web/src/screens/**, v2/web/src/App.tsx
  - K3: firebase.json, functions/.env.example
depends-on: [T17]
claimed-by: pavel
branch: agent/pavel/T25
started: 2026-10-29
---

# T25 — Админка контента v2

## Acceptance Criteria

- [x] `/admin/` — login, сообщения, редактор сценариев (формы)
- [x] 5 логинов из `ADMIN_USERS`, cookie-сессия
- [x] Firestore `cmsMessages`, `cmsScenarios`; runtime + `GET /api/content/strings`
- [x] `./scripts/verify.sh`
