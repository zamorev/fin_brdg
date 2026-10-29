import { Router } from "express";
import {
  clearAdminSessionCookie,
  issueAdminSession,
  requireAdmin,
  verifyAdminCredentials,
} from "./adminAuth";
import {
  getAllContentStrings,
  listAdminMessages,
  seedCmsMessagesIfEmpty,
  setAdminMessage,
} from "./cms/messages";
import {
  getScenarioForAdmin,
  listScenariosForAdmin,
  saveScenarioForAdmin,
  seedCmsScenariosIfEmpty,
} from "./cms/scenarios";
import type { ScenarioDefinition } from "./scenarios/types";

export function createAdminRouter(): Router {
  const router = Router();

  router.get("/api/content/strings", async (_req, res) => {
    try {
      const strings = await getAllContentStrings();
      res.setHeader("Cache-Control", "public, max-age=60");
      res.json({ strings });
    } catch (e) {
      res.status(500).json({ error: e instanceof Error ? e.message : "Ошибка" });
    }
  });

  router.post("/api/admin/login", (req, res) => {
    const login = String(req.body.login ?? "");
    const password = String(req.body.password ?? "");
    if (!verifyAdminCredentials(login, password)) {
      res.status(401).json({ error: "Неверный логин или пароль" });
      return;
    }
    try {
      const token = issueAdminSession(res, login);
      res.json({ ok: true, login, token });
    } catch (e) {
      res.status(503).json({ error: e instanceof Error ? e.message : "Ошибка" });
    }
  });

  router.post("/api/admin/logout", (_req, res) => {
    clearAdminSessionCookie(res);
    res.json({ ok: true });
  });

  router.get("/api/admin/me", requireAdmin, (req, res) => {
    res.json({ login: req.adminLogin });
  });

  router.get("/api/admin/messages", requireAdmin, async (_req, res) => {
    try {
      res.json({ messages: await listAdminMessages() });
    } catch (e) {
      res.status(500).json({ error: e instanceof Error ? e.message : "Ошибка" });
    }
  });

  router.put("/api/admin/messages/:key", requireAdmin, async (req, res) => {
    try {
      await setAdminMessage(
        String(req.params.key),
        String(req.body.text ?? ""),
        req.adminLogin!,
      );
      res.json({ ok: true });
    } catch (e) {
      res.status(400).json({ error: e instanceof Error ? e.message : "Ошибка" });
    }
  });

  router.post("/api/admin/seed", requireAdmin, async (req, res) => {
    try {
      const messages = await seedCmsMessagesIfEmpty(req.adminLogin!);
      const scenarios = await seedCmsScenariosIfEmpty(req.adminLogin!);
      res.json({ ok: true, messages, scenarios });
    } catch (e) {
      res.status(500).json({ error: e instanceof Error ? e.message : "Ошибка" });
    }
  });

  router.get("/api/admin/scenarios", requireAdmin, async (_req, res) => {
    try {
      res.json({ scenarios: await listScenariosForAdmin() });
    } catch (e) {
      res.status(500).json({ error: e instanceof Error ? e.message : "Ошибка" });
    }
  });

  router.get("/api/admin/scenarios/:id", requireAdmin, async (req, res) => {
    try {
      const scenario = await getScenarioForAdmin(String(req.params.id));
      res.json({ scenario });
    } catch (e) {
      res.status(404).json({ error: e instanceof Error ? e.message : "Ошибка" });
    }
  });

  router.put("/api/admin/scenarios/:id", requireAdmin, async (req, res) => {
    try {
      const id = String(req.params.id);
      const body = req.body as ScenarioDefinition;
      if (body.id !== id) {
        res.status(400).json({ error: "id в теле не совпадает с URL" });
        return;
      }
      const { warnings } = await saveScenarioForAdmin(body, req.adminLogin!);
      res.json({ ok: true, warnings });
    } catch (e) {
      res.status(400).json({ error: e instanceof Error ? e.message : "Ошибка" });
    }
  });

  return router;
}
