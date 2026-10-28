"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseInitData = parseInitData;
exports.validateInitData = validateInitData;
exports.authMiddleware = authMiddleware;
exports.displayName = displayName;
const node_crypto_1 = __importDefault(require("node:crypto"));
function parseInitData(initData) {
    if (!initData)
        return null;
    const params = new URLSearchParams(initData);
    const raw = params.get("user");
    if (!raw)
        return null;
    try {
        return JSON.parse(raw);
    }
    catch {
        return null;
    }
}
function validateInitData(initData, botToken) {
    const params = new URLSearchParams(initData);
    const hash = params.get("hash");
    if (!hash)
        return false;
    params.delete("hash");
    const entries = [...params.entries()].sort(([a], [b]) => a.localeCompare(b));
    const dataCheckString = entries.map(([k, v]) => `${k}=${v}`).join("\n");
    const secret = node_crypto_1.default.createHmac("sha256", "WebAppData").update(botToken).digest();
    const calculated = node_crypto_1.default
        .createHmac("sha256", secret)
        .update(dataCheckString)
        .digest("hex");
    return calculated === hash;
}
function authMiddleware(req, res, next) {
    const header = req.header("authorization") ?? "";
    const initData = header.startsWith("tma ") ? header.slice(4) : "";
    const botToken = req.botToken ?? process.env.TELEGRAM_BOT_TOKEN ?? "";
    const skip = process.env.FUNCTIONS_EMULATOR === "true" && process.env.AUTH_SKIP === "1";
    if (!initData && skip) {
        req.telegramUser = { id: 100001, first_name: "Dev Teen" };
        next();
        return;
    }
    if (!initData || !botToken) {
        res.status(401).json({ error: "Нужен вход через Telegram" });
        return;
    }
    if (!skip && !validateInitData(initData, botToken)) {
        res.status(401).json({ error: "Неверная подпись Telegram" });
        return;
    }
    const user = parseInitData(initData);
    if (!user?.id) {
        res.status(401).json({ error: "Не удалось прочитать профиль Telegram" });
        return;
    }
    req.telegramUser = user;
    next();
}
function displayName(user) {
    const parts = [user.first_name, user.last_name].filter(Boolean);
    if (parts.length)
        return parts.join(" ");
    return user.username ? `@${user.username}` : "Участник";
}
//# sourceMappingURL=telegram.js.map