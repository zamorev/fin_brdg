import express from "express";
import { handleTelegramUpdate } from "./botWebhook";
import { authMiddleware } from "./telegram";
import {
  buildMe,
  completeOnboarding,
  createRequest,
  decideRequest,
  saveUnplanned,
  saveWeekBudget,
  startScenario,
  answerScenario,
  type Allocation,
  type UserType,
  getFamilyView,
  previewInviteCode,
  joinByInviteCode,
  streamMemberAvatar,
} from "./store";

let resolveBotToken: () => string = () => process.env.TELEGRAM_BOT_TOKEN ?? "";

export function setBotTokenProvider(provider: () => string): void {
  resolveBotToken = provider;
}

export function createApp() {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    req.botToken = resolveBotToken();
    next();
  });

  app.get("/api/health", (_req, res) => {
    res.json({ ok: true });
  });

  app.post("/api/telegram/webhook", async (req, res) => {
    const token = req.botToken ?? "";
    if (!token) {
      res.status(503).json({ ok: false, error: "no bot token" });
      return;
    }
    try {
      await handleTelegramUpdate(req.body, token);
      res.json({ ok: true });
    } catch (e) {
      console.error("telegram webhook", e);
      res.status(500).json({ ok: false });
    }
  });

  app.get("/api/me", authMiddleware, async (req, res) => {
    try {
      const session = await buildMe(
        req.telegramUser!,
        req.botToken,
        req.telegramStartParam,
      );
      res.json(session);
    } catch (e) {
      res.status(500).json({
        error: e instanceof Error ? e.message : "Ошибка",
      });
    }
  });

  app.post("/api/onboarding", authMiddleware, async (req, res) => {
    try {
      const userType = req.body.userType as UserType;
      if (userType !== "teen" && userType !== "parent") {
        res.status(400).json({ error: "Выберите: teen или parent" });
        return;
      }
      const session = await completeOnboarding(
        req.telegramUser!,
        userType,
        req.body.mode === "join" ? "join" : "create",
        req.body.inviteCode,
        req.botToken,
      );
      res.json(session);
    } catch (e) {
      res.status(400).json({ error: e instanceof Error ? e.message : "Ошибка" });
    }
  });

  app.post("/api/onboarding/join-invite", authMiddleware, async (req, res) => {
    try {
      const code = String(req.body.code ?? "");
      const session = await joinByInviteCode(req.telegramUser!, code, req.botToken);
      res.json(session);
    } catch (e) {
      res.status(400).json({ error: e instanceof Error ? e.message : "Ошибка" });
    }
  });

  app.get("/api/invite-preview", authMiddleware, async (req, res) => {
    try {
      const code = String(req.query.code ?? "");
      const preview = await previewInviteCode(code);
      if (!preview) {
        res.status(404).json({ error: "Код не найден или устарел" });
        return;
      }
      res.json(preview);
    } catch (e) {
      res.status(400).json({ error: e instanceof Error ? e.message : "Ошибка" });
    }
  });

  app.get("/api/family", authMiddleware, async (req, res) => {
    try {
      const view = await getFamilyView(req.telegramUser!, req.botToken);
      res.json(view);
    } catch (e) {
      res.status(400).json({ error: e instanceof Error ? e.message : "Ошибка" });
    }
  });

  app.get("/api/avatar/:telegramId", authMiddleware, async (req, res) => {
    try {
      const targetId = Number(req.params.telegramId);
      if (!Number.isFinite(targetId)) {
        res.status(400).json({ error: "Некорректный id" });
        return;
      }
      await streamMemberAvatar(
        req.telegramUser!,
        targetId,
        req.botToken ?? "",
        res,
      );
    } catch (e) {
      res.status(400).json({ error: e instanceof Error ? e.message : "Ошибка" });
    }
  });

  app.post("/api/quests/week-budget", authMiddleware, async (req, res) => {
    try {
      const allocation = req.body.allocation as Allocation;
      const result = await saveWeekBudget(req.telegramUser!, allocation);
      res.json(result);
    } catch (e) {
      res.status(400).json({ error: e instanceof Error ? e.message : "Ошибка" });
    }
  });

  app.post("/api/quests/unplanned", authMiddleware, async (req, res) => {
    try {
      const choice = req.body.choice;
      const user = await saveUnplanned(req.telegramUser!, choice);
      res.json({ user });
    } catch (e) {
      res.status(400).json({ error: e instanceof Error ? e.message : "Ошибка" });
    }
  });

  app.post("/api/scenarios/:scenarioId/start", authMiddleware, async (req, res) => {
    try {
      const result = await startScenario(req.telegramUser!, String(req.params.scenarioId));
      res.json(result);
    } catch (e) {
      res.status(400).json({ error: e instanceof Error ? e.message : "Ошибка" });
    }
  });

  app.post("/api/scenarios/runs/:runId/answer", authMiddleware, async (req, res) => {
    try {
      const result = await answerScenario(
        req.telegramUser!,
        String(req.params.runId),
        String(req.body.optionId ?? ""),
      );
      res.json(result);
    } catch (e) {
      res.status(400).json({ error: e instanceof Error ? e.message : "Ошибка" });
    }
  });

  app.post("/api/requests", authMiddleware, async (req, res) => {
    try {
      const user = await createRequest(
        req.telegramUser!,
        Number(req.body.proposedAmount),
        String(req.body.explanation ?? ""),
      );
      res.json({ user });
    } catch (e) {
      res.status(400).json({ error: e instanceof Error ? e.message : "Ошибка" });
    }
  });

  app.post("/api/requests/:id/decide", authMiddleware, async (req, res) => {
    try {
      const user = await decideRequest(
        req.telegramUser!,
        String(req.params.id),
        String(req.body.action),
        String(req.body.comment ?? ""),
      );
      res.json({ user });
    } catch (e) {
      res.status(400).json({ error: e instanceof Error ? e.message : "Ошибка" });
    }
  });

  return app;
}
