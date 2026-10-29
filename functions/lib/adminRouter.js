"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createAdminRouter = createAdminRouter;
const express_1 = require("express");
const adminAuth_1 = require("./adminAuth");
const messages_1 = require("./cms/messages");
const scenarios_1 = require("./cms/scenarios");
function createAdminRouter() {
    const router = (0, express_1.Router)();
    router.get("/api/content/strings", async (_req, res) => {
        try {
            const strings = await (0, messages_1.getAllContentStrings)();
            res.setHeader("Cache-Control", "public, max-age=60");
            res.json({ strings });
        }
        catch (e) {
            res.status(500).json({ error: e instanceof Error ? e.message : "Ошибка" });
        }
    });
    router.post("/api/admin/login", (req, res) => {
        const login = String(req.body.login ?? "");
        const password = String(req.body.password ?? "");
        if (!(0, adminAuth_1.verifyAdminCredentials)(login, password)) {
            res.status(401).json({ error: "Неверный логин или пароль" });
            return;
        }
        try {
            const token = (0, adminAuth_1.issueAdminSession)(res, login);
            res.json({ ok: true, login, token });
        }
        catch (e) {
            res.status(503).json({ error: e instanceof Error ? e.message : "Ошибка" });
        }
    });
    router.post("/api/admin/logout", (_req, res) => {
        (0, adminAuth_1.clearAdminSessionCookie)(res);
        res.json({ ok: true });
    });
    router.get("/api/admin/me", adminAuth_1.requireAdmin, (req, res) => {
        res.json({ login: req.adminLogin });
    });
    router.get("/api/admin/messages", adminAuth_1.requireAdmin, async (_req, res) => {
        try {
            res.json({ messages: await (0, messages_1.listAdminMessages)() });
        }
        catch (e) {
            res.status(500).json({ error: e instanceof Error ? e.message : "Ошибка" });
        }
    });
    router.put("/api/admin/messages/:key", adminAuth_1.requireAdmin, async (req, res) => {
        try {
            await (0, messages_1.setAdminMessage)(String(req.params.key), String(req.body.text ?? ""), req.adminLogin);
            res.json({ ok: true });
        }
        catch (e) {
            res.status(400).json({ error: e instanceof Error ? e.message : "Ошибка" });
        }
    });
    router.post("/api/admin/seed", adminAuth_1.requireAdmin, async (req, res) => {
        try {
            const messages = await (0, messages_1.seedCmsMessagesIfEmpty)(req.adminLogin);
            const scenarios = await (0, scenarios_1.seedCmsScenariosIfEmpty)(req.adminLogin);
            res.json({ ok: true, messages, scenarios });
        }
        catch (e) {
            res.status(500).json({ error: e instanceof Error ? e.message : "Ошибка" });
        }
    });
    router.get("/api/admin/scenarios", adminAuth_1.requireAdmin, async (_req, res) => {
        try {
            res.json({ scenarios: await (0, scenarios_1.listScenariosForAdmin)() });
        }
        catch (e) {
            res.status(500).json({ error: e instanceof Error ? e.message : "Ошибка" });
        }
    });
    router.get("/api/admin/scenarios/:id", adminAuth_1.requireAdmin, async (req, res) => {
        try {
            const scenario = await (0, scenarios_1.getScenarioForAdmin)(String(req.params.id));
            res.json({ scenario });
        }
        catch (e) {
            res.status(404).json({ error: e instanceof Error ? e.message : "Ошибка" });
        }
    });
    router.put("/api/admin/scenarios/:id", adminAuth_1.requireAdmin, async (req, res) => {
        try {
            const id = String(req.params.id);
            const body = req.body;
            if (body.id !== id) {
                res.status(400).json({ error: "id в теле не совпадает с URL" });
                return;
            }
            const { warnings } = await (0, scenarios_1.saveScenarioForAdmin)(body, req.adminLogin);
            res.json({ ok: true, warnings });
        }
        catch (e) {
            res.status(400).json({ error: e instanceof Error ? e.message : "Ошибка" });
        }
    });
    return router;
}
//# sourceMappingURL=adminRouter.js.map