import crypto from "node:crypto";
import type { Request, Response, NextFunction } from "express";

export type TelegramUser = {
  id: number;
  first_name?: string;
  last_name?: string;
  username?: string;
  /** Публичный URL из initData Mini App (если Telegram отдал). */
  photo_url?: string;
};

export function parseInitData(initData: string): TelegramUser | null {
  if (!initData) return null;
  const params = new URLSearchParams(initData);
  const raw = params.get("user");
  if (!raw) return null;
  try {
    return JSON.parse(raw) as TelegramUser;
  } catch {
    return null;
  }
}

export function validateInitData(initData: string, botToken: string): boolean {
  const params = new URLSearchParams(initData);
  const hash = params.get("hash");
  if (!hash) return false;
  params.delete("hash");
  const entries = [...params.entries()].sort(([a], [b]) => a.localeCompare(b));
  const dataCheckString = entries.map(([k, v]) => `${k}=${v}`).join("\n");
  const secret = crypto.createHmac("sha256", "WebAppData").update(botToken).digest();
  const calculated = crypto
    .createHmac("sha256", secret)
    .update(dataCheckString)
    .digest("hex");
  return calculated === hash;
}

export function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const header = req.header("authorization") ?? "";
  const initData = header.startsWith("tma ") ? header.slice(4) : "";
  const botToken = req.botToken ?? process.env.TELEGRAM_BOT_TOKEN ?? "";
  const skip =
    process.env.FUNCTIONS_EMULATOR === "true" && process.env.AUTH_SKIP === "1";

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

declare global {
  namespace Express {
    interface Request {
      telegramUser?: TelegramUser;
      botToken?: string;
    }
  }
}

export function displayName(user: TelegramUser): string {
  const parts = [user.first_name, user.last_name].filter(Boolean);
  if (parts.length) return parts.join(" ");
  return user.username ? `@${user.username}` : "Участник";
}
