import crypto from "node:crypto";
import type { Request, Response, NextFunction } from "express";

const COOKIE_NAME = "admin_session";
const SESSION_MS = 24 * 60 * 60 * 1000;

type AdminUser = { login: string; password: string };

export function parseAdminUsers(): AdminUser[] {
  const raw = process.env.ADMIN_USERS ?? "[]";
  try {
    const parsed = JSON.parse(raw) as AdminUser[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function verifyAdminCredentials(login: string, password: string): boolean {
  return parseAdminUsers().some((u) => u.login === login && u.password === password);
}

function sessionSecret(): string {
  return process.env.ADMIN_SESSION_SECRET ?? "";
}

export function createAdminSessionToken(login: string): string {
  const secret = sessionSecret();
  if (!secret) throw new Error("ADMIN_SESSION_SECRET не задан");
  const exp = Date.now() + SESSION_MS;
  const payload = `${login}:${exp}`;
  const sig = crypto.createHmac("sha256", secret).update(payload).digest("hex");
  return `${Buffer.from(payload, "utf8").toString("base64url")}.${sig}`;
}

export function parseAdminSessionToken(token: string): string | null {
  const secret = sessionSecret();
  if (!secret || !token) return null;
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  const payload = Buffer.from(body, "base64url").toString("utf8");
  const expected = crypto.createHmac("sha256", secret).update(payload).digest("hex");
  if (expected !== sig) return null;
  const [login, expRaw] = payload.split(":");
  const exp = Number(expRaw);
  if (!login || !Number.isFinite(exp) || Date.now() > exp) return null;
  return login;
}

function readCookie(req: Request, name: string): string | undefined {
  const header = req.header("cookie");
  if (!header) return undefined;
  for (const part of header.split(";")) {
    const [k, ...rest] = part.trim().split("=");
    if (k === name) return decodeURIComponent(rest.join("="));
  }
  return undefined;
}

export function setAdminSessionCookie(res: Response, token: string): void {
  const secure = process.env.FUNCTIONS_EMULATOR !== "true";
  res.setHeader(
    "Set-Cookie",
    `${COOKIE_NAME}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${Math.floor(SESSION_MS / 1000)}${secure ? "; Secure" : ""}`,
  );
}

export function issueAdminSession(res: Response, login: string): string {
  const token = createAdminSessionToken(login);
  setAdminSessionCookie(res, token);
  return token;
}

export function clearAdminSessionCookie(res: Response): void {
  const secure = process.env.FUNCTIONS_EMULATOR !== "true";
  res.setHeader(
    "Set-Cookie",
    `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure ? "; Secure" : ""}`,
  );
}

export function readAdminSessionToken(req: Request): string | undefined {
  const auth = req.header("authorization") ?? "";
  if (auth.startsWith("Admin ")) {
    const t = auth.slice(6).trim();
    if (t) return t;
  }
  return readCookie(req, COOKIE_NAME);
}

export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  const token = readAdminSessionToken(req);
  const login = token ? parseAdminSessionToken(token) : null;
  if (!login) {
    res.status(401).json({ error: "Нужен вход в админку" });
    return;
  }
  req.adminLogin = login;
  next();
}

declare global {
  namespace Express {
    interface Request {
      adminLogin?: string;
    }
  }
}
