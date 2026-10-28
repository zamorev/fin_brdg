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

/** Прямая ссылка в Main Mini App — роль в startapp (t_/p_), чтобы не спрашивать «кто ты». */
export function botInviteLink(inviteCode: string, target: InviteTarget): string {
  const code = inviteCode.trim().toUpperCase();
  const param = `${target === "teen" ? "t" : "p"}_${code}`;
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
    "Открой ссылку — сразу попадёшь в семью.",
  ].join("\n");
}

export function parseInvitePayload(raw: string | undefined): InvitePayload | null {
  const param = raw?.trim();
  if (!param) return null;

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
  if (!tg) return undefined;
  const fromUnsafe = tg.initDataUnsafe?.start_param?.trim();
  if (fromUnsafe) return fromUnsafe;
  const fromProp = tg.startParam?.trim();
  if (fromProp) return fromProp;
  if (tg.initData) {
    const fromInit = new URLSearchParams(tg.initData).get("start_param")?.trim();
    if (fromInit) return fromInit;
  }
  return undefined;
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
