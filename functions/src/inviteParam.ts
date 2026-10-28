/** Суффикс `_i<telegramId>` — кто отправил ссылку (не участвует в join). */
export function stripInviterSuffix(raw: string): string {
  return raw.trim().replace(/_i\d{5,15}$/i, "");
}

export function parseInviterTelegramId(raw: string): number | undefined {
  const m = raw.trim().match(/_i(\d{5,15})$/i);
  if (!m) return undefined;
  const id = Number(m[1]);
  return Number.isFinite(id) ? id : undefined;
}

export function appendInviterSuffix(inviteParam: string, inviterTelegramId: number): string {
  return `${inviteParam}_i${inviterTelegramId}`;
}

/** Парсинг invite из start_param / ?start= / pendingInvites. */
export function normalizeInviteParam(raw: string): string | null {
  const param = stripInviterSuffix(raw);
  if (!param) return null;
  if (param.startsWith("inv_")) {
    return normalizeInviteParam(param.slice(4));
  }
  const legacy = param.match(/^([pt])_([A-Z0-9]+)$/i);
  if (legacy) {
    return `${legacy[1].toLowerCase()}_${legacy[2].toUpperCase()}`;
  }
  if (/^[A-Z0-9]{4,12}$/i.test(param)) {
    return param.toUpperCase();
  }
  return null;
}

export function roleHintFromParam(param: string): "teen" | "parent" | null {
  const m = param.match(/^([pt])_/i);
  if (!m) return null;
  return m[1].toLowerCase() === "p" ? "parent" : "teen";
}

/** Deep link для BotFather: ?start=inv_<t_|p_>CODE (до 64 символов). */
export function botStartDeepLink(inviteParam: string): string {
  const normalized = normalizeInviteParam(inviteParam);
  if (!normalized) throw new Error("invalid invite param");
  return `inv_${normalized}`;
}
