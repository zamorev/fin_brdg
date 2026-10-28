import type { UserType } from "../domain/types";

export const BOT_USERNAME = "fin_brdg_bot";

/** @deprecated Direct Link path; основной формат — ?startapp= на бота. */
export const WEBAPP_SHORT_NAME =
  import.meta.env.VITE_TG_WEBAPP_SHORT_NAME ?? "FinBridge";

export type InviteTarget = "parent" | "teen";

const INVITE_SESSION_KEY = "fin_bridge_invite_raw";

export type InvitePayload = {
  code: string;
  roleHint: UserType | null;
};

function stripInviterSuffix(raw: string): string {
  return raw.trim().replace(/_i\d{5,15}$/i, "");
}

/** Deep link в чат бота → /start inv_t_CODE → pendingInvites → Mini App. */
export function botInviteLink(
  inviteCode: string,
  target: InviteTarget,
  inviterTelegramId?: number,
): string {
  const code = inviteCode.trim().toUpperCase();
  let param = `inv_${target === "teen" ? "t" : "p"}_${code}`;
  if (inviterTelegramId) {
    param = `${param}_i${inviterTelegramId}`;
  }
  return `https://t.me/${BOT_USERNAME}?start=${encodeURIComponent(param)}`;
}

/** Прямой запуск Mini App (если клиент поддерживает startapp без чата). */
export function botInviteDirectAppLink(inviteCode: string, target: InviteTarget): string {
  const code = inviteCode.trim().toUpperCase();
  const param = `${target === "teen" ? "t" : "p"}_${code}`;
  const short = WEBAPP_SHORT_NAME.trim();
  if (short) {
    return `https://t.me/${BOT_USERNAME}/${short}?startapp=${encodeURIComponent(param)}`;
  }
  return `https://t.me/${BOT_USERNAME}?startapp=${encodeURIComponent(param)}`;
}

export function inviteShareText(target: InviteTarget): string {
  const roleLine =
    target === "parent"
      ? "Тебя ждут как второго родителя."
      : "Тебя ждут как подростка.";
  return [
    "Квесты про деньги в Fin Bridge — для семьи и друзей.",
    roleLine,
    "Откроется чат бота — нажми «Войти в семью» или кнопку Fin Bridge внизу.",
  ].join("\n");
}

export function parseInvitePayload(raw: string | undefined): InvitePayload | null {
  const param = stripInviterSuffix(raw ?? "");
  if (!param) return null;

  if (param.toLowerCase().startsWith("inv_")) {
    return parseInvitePayload(param.slice(4));
  }

  const legacy = param.match(/^([pt])_([A-Z0-9]+)$/i);
  if (legacy) {
    return {
      code: legacy[2].toUpperCase(),
      roleHint: legacy[1].toLowerCase() === "p" ? "parent" : "teen",
    };
  }

  if (/^[A-Z0-9]{4,12}$/i.test(param)) {
    return { code: param.toUpperCase(), roleHint: null };
  }

  return null;
}

/** @deprecated use parseInvitePayload */
export function parseInviteStartParam(raw: string | undefined): string | null {
  return parseInvitePayload(raw)?.code ?? null;
}

type TwaLike = {
  initData?: string;
  initDataUnsafe?: { start_param?: string };
  startParam?: string;
};

function readRawStartParam(tg: TwaLike | null | undefined): string | undefined {
  if (!tg) return readStartParamFromUrl();
  const fromUnsafe = tg.initDataUnsafe?.start_param?.trim();
  if (fromUnsafe) return fromUnsafe;
  const fromProp = tg.startParam?.trim();
  if (fromProp) return fromProp;
  if (tg.initData) {
    const fromInit = new URLSearchParams(tg.initData).get("start_param")?.trim();
    if (fromInit) return fromInit;
  }
  return readStartParamFromUrl();
}

function readStartParamFromUrl(): string | undefined {
  if (typeof window === "undefined") return undefined;
  try {
    const url = new URL(window.location.href);
    const fromQuery =
      url.searchParams.get("tgWebAppStartParam")?.trim() ??
      url.searchParams.get("startapp")?.trim();
    if (fromQuery) return decodeURIComponent(fromQuery);
    const hash = url.hash.replace(/^#/, "");
    if (hash.includes("tgWebAppData=")) {
      const encoded = hash.split("tgWebAppData=")[1]?.split("&")[0];
      if (encoded) {
        const decoded = decodeURIComponent(encoded);
        const param = new URLSearchParams(decoded).get("start_param")?.trim();
        if (param) return param;
      }
    }
  } catch {
    /* ignore */
  }
  return undefined;
}

export function persistInviteRaw(raw: string): InvitePayload | null {
  const parsed = parseInvitePayload(raw);
  if (!parsed) return null;
  try {
    sessionStorage.setItem(INVITE_SESSION_KEY, raw.trim());
  } catch {
    /* private mode */
  }
  return parsed;
}

/** Сохраняем start_param в sessionStorage — Menu Button без кода не затирает invite. */
export function captureInviteFromTwa(tg: TwaLike | null | undefined): InvitePayload | null {
  const raw = readRawStartParam(tg);
  if (raw) {
    const parsed = parseInvitePayload(raw);
    if (parsed) {
      try {
        sessionStorage.setItem(INVITE_SESSION_KEY, raw);
      } catch {
        /* private mode */
      }
      return parsed;
    }
  }

  try {
    const stored = sessionStorage.getItem(INVITE_SESSION_KEY);
    if (stored) return parseInvitePayload(stored);
  } catch {
    /* ignore */
  }

  return null;
}

export function clearStoredInvite(): void {
  try {
    sessionStorage.removeItem(INVITE_SESSION_KEY);
  } catch {
    /* ignore */
  }
}

/** Параметр для POST join-invite (с префиксом роли, если есть). */
export function inviteParamForApi(payload: InvitePayload): string {
  try {
    const raw = sessionStorage.getItem(INVITE_SESSION_KEY);
    const parsed = raw ? parseInvitePayload(raw) : null;
    if (parsed && parsed.code === payload.code) return raw!;
  } catch {
    /* ignore */
  }
  if (payload.roleHint) {
    return `${payload.roleHint === "teen" ? "t" : "p"}_${payload.code}`;
  }
  return payload.code;
}

export function roleHintLabel(role: UserType): string {
  return role === "teen" ? "подросток" : "родитель";
}
