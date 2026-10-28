"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.setBotTokenProvider = setBotTokenProvider;
exports.createApp = createApp;
const express_1 = __importDefault(require("express"));
const botWebhook_1 = require("./botWebhook");
const telegram_1 = require("./telegram");
const store_1 = require("./store");
let resolveBotToken = () => process.env.TELEGRAM_BOT_TOKEN ?? "";
function setBotTokenProvider(provider) {
    resolveBotToken = provider;
}
function createApp() {
    const app = (0, express_1.default)();
    app.use(express_1.default.json());
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
            await (0, botWebhook_1.handleTelegramUpdate)(req.body, token);
            res.json({ ok: true });
        }
        catch (e) {
            console.error("telegram webhook", e);
            res.status(500).json({ ok: false });
        }
    });
    app.get("/api/me", telegram_1.authMiddleware, async (req, res) => {
        try {
            const session = await (0, store_1.buildMe)(req.telegramUser, req.botToken, req.telegramStartParam);
            res.json(session);
        }
        catch (e) {
            res.status(500).json({
                error: e instanceof Error ? e.message : "Ошибка",
            });
        }
    });
    app.post("/api/onboarding", telegram_1.authMiddleware, async (req, res) => {
        try {
            const userType = req.body.userType;
            if (userType !== "teen" && userType !== "parent") {
                res.status(400).json({ error: "Выберите: teen или parent" });
                return;
            }
            const session = await (0, store_1.completeOnboarding)(req.telegramUser, userType, req.body.mode === "join" ? "join" : "create", req.body.inviteCode, req.botToken);
            res.json(session);
        }
        catch (e) {
            res.status(400).json({ error: e instanceof Error ? e.message : "Ошибка" });
        }
    });
    app.post("/api/onboarding/join-invite", telegram_1.authMiddleware, async (req, res) => {
        try {
            const code = String(req.body.code ?? "");
            const session = await (0, store_1.joinByInviteCode)(req.telegramUser, code, req.botToken);
            res.json(session);
        }
        catch (e) {
            res.status(400).json({ error: e instanceof Error ? e.message : "Ошибка" });
        }
    });
    app.get("/api/invite-preview", telegram_1.authMiddleware, async (req, res) => {
        try {
            const code = String(req.query.code ?? "");
            const preview = await (0, store_1.previewInviteCode)(code);
            if (!preview) {
                res.status(404).json({ error: "Код не найден или устарел" });
                return;
            }
            res.json(preview);
        }
        catch (e) {
            res.status(400).json({ error: e instanceof Error ? e.message : "Ошибка" });
        }
    });
    app.get("/api/family", telegram_1.authMiddleware, async (req, res) => {
        try {
            const view = await (0, store_1.getFamilyView)(req.telegramUser, req.botToken);
            res.json(view);
        }
        catch (e) {
            res.status(400).json({ error: e instanceof Error ? e.message : "Ошибка" });
        }
    });
    app.get("/api/avatar/:telegramId", telegram_1.authMiddleware, async (req, res) => {
        try {
            const targetId = Number(req.params.telegramId);
            if (!Number.isFinite(targetId)) {
                res.status(400).json({ error: "Некорректный id" });
                return;
            }
            await (0, store_1.streamMemberAvatar)(req.telegramUser, targetId, req.botToken ?? "", res);
        }
        catch (e) {
            res.status(400).json({ error: e instanceof Error ? e.message : "Ошибка" });
        }
    });
    app.post("/api/quests/week-budget", telegram_1.authMiddleware, async (req, res) => {
        try {
            const allocation = req.body.allocation;
            const result = await (0, store_1.saveWeekBudget)(req.telegramUser, allocation);
            res.json(result);
        }
        catch (e) {
            res.status(400).json({ error: e instanceof Error ? e.message : "Ошибка" });
        }
    });
    app.post("/api/quests/unplanned", telegram_1.authMiddleware, async (req, res) => {
        try {
            const choice = req.body.choice;
            const user = await (0, store_1.saveUnplanned)(req.telegramUser, choice);
            res.json({ user });
        }
        catch (e) {
            res.status(400).json({ error: e instanceof Error ? e.message : "Ошибка" });
        }
    });
    app.post("/api/requests", telegram_1.authMiddleware, async (req, res) => {
        try {
            const user = await (0, store_1.createRequest)(req.telegramUser, Number(req.body.proposedAmount), String(req.body.explanation ?? ""));
            res.json({ user });
        }
        catch (e) {
            res.status(400).json({ error: e instanceof Error ? e.message : "Ошибка" });
        }
    });
    app.post("/api/requests/:id/decide", telegram_1.authMiddleware, async (req, res) => {
        try {
            const user = await (0, store_1.decideRequest)(req.telegramUser, String(req.params.id), String(req.body.action), String(req.body.comment ?? ""));
            res.json({ user });
        }
        catch (e) {
            res.status(400).json({ error: e instanceof Error ? e.message : "Ошибка" });
        }
    });
    return app;
}
//# sourceMappingURL=app.js.map