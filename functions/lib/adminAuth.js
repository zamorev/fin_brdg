"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseAdminUsers = parseAdminUsers;
exports.verifyAdminCredentials = verifyAdminCredentials;
exports.createAdminSessionToken = createAdminSessionToken;
exports.parseAdminSessionToken = parseAdminSessionToken;
exports.setAdminSessionCookie = setAdminSessionCookie;
exports.issueAdminSession = issueAdminSession;
exports.clearAdminSessionCookie = clearAdminSessionCookie;
exports.readAdminSessionToken = readAdminSessionToken;
exports.requireAdmin = requireAdmin;
const node_crypto_1 = __importDefault(require("node:crypto"));
const COOKIE_NAME = "admin_session";
const SESSION_MS = 24 * 60 * 60 * 1000;
function parseAdminUsers() {
    const raw = process.env.ADMIN_USERS ?? "[]";
    try {
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
    }
    catch {
        return [];
    }
}
function verifyAdminCredentials(login, password) {
    return parseAdminUsers().some((u) => u.login === login && u.password === password);
}
function sessionSecret() {
    return process.env.ADMIN_SESSION_SECRET ?? "";
}
function createAdminSessionToken(login) {
    const secret = sessionSecret();
    if (!secret)
        throw new Error("ADMIN_SESSION_SECRET не задан");
    const exp = Date.now() + SESSION_MS;
    const payload = `${login}:${exp}`;
    const sig = node_crypto_1.default.createHmac("sha256", secret).update(payload).digest("hex");
    return `${Buffer.from(payload, "utf8").toString("base64url")}.${sig}`;
}
function parseAdminSessionToken(token) {
    const secret = sessionSecret();
    if (!secret || !token)
        return null;
    const [body, sig] = token.split(".");
    if (!body || !sig)
        return null;
    const payload = Buffer.from(body, "base64url").toString("utf8");
    const expected = node_crypto_1.default.createHmac("sha256", secret).update(payload).digest("hex");
    if (expected !== sig)
        return null;
    const [login, expRaw] = payload.split(":");
    const exp = Number(expRaw);
    if (!login || !Number.isFinite(exp) || Date.now() > exp)
        return null;
    return login;
}
function readCookie(req, name) {
    const header = req.header("cookie");
    if (!header)
        return undefined;
    for (const part of header.split(";")) {
        const [k, ...rest] = part.trim().split("=");
        if (k === name)
            return decodeURIComponent(rest.join("="));
    }
    return undefined;
}
function setAdminSessionCookie(res, token) {
    const secure = process.env.FUNCTIONS_EMULATOR !== "true";
    res.setHeader("Set-Cookie", `${COOKIE_NAME}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${Math.floor(SESSION_MS / 1000)}${secure ? "; Secure" : ""}`);
}
function issueAdminSession(res, login) {
    const token = createAdminSessionToken(login);
    setAdminSessionCookie(res, token);
    return token;
}
function clearAdminSessionCookie(res) {
    const secure = process.env.FUNCTIONS_EMULATOR !== "true";
    res.setHeader("Set-Cookie", `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure ? "; Secure" : ""}`);
}
function readAdminSessionToken(req) {
    const auth = req.header("authorization") ?? "";
    if (auth.startsWith("Admin ")) {
        const t = auth.slice(6).trim();
        if (t)
            return t;
    }
    return readCookie(req, COOKIE_NAME);
}
function requireAdmin(req, res, next) {
    const token = readAdminSessionToken(req);
    const login = token ? parseAdminSessionToken(token) : null;
    if (!login) {
        res.status(401).json({ error: "Нужен вход в админку" });
        return;
    }
    req.adminLogin = login;
    next();
}
//# sourceMappingURL=adminAuth.js.map