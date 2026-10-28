export const BOT_USERNAME = "fin_brdg_bot";

export type InviteTarget = "parent" | "teen";

/** Payload для ?start=… — роль подсказываем буквой p/t. */
export function inviteStartPayload(target: InviteTarget, inviteCode: string): string {
  const prefix = target === "parent" ? "p" : "t";
  return `${prefix}_${inviteCode.trim().toUpperCase()}`;
}

export function botStartLink(startPayload: string): string {
  return `https://t.me/${BOT_USERNAME}?start=${encodeURIComponent(startPayload)}`;
}

export function inviteShareText(target: InviteTarget, inviteCode: string): string {
  const link = botStartLink(inviteStartPayload(target, inviteCode));
  if (target === "parent") {
    return [
      "Подключись к нашей семье в Fin Bridge — как второй родитель.",
      "Открой ссылку, жми «Поехали» и войди в семью (код уже в ссылке).",
      link,
    ].join("\n");
  }
  return [
    "Квесты про деньги в Fin Bridge — для подростка.",
    "Открой ссылку, жми «Поехали» и войди в семью (код уже в ссылке).",
    link,
  ].join("\n");
}

export function parseInviteStartParam(
  raw: string | undefined,
): { userType: InviteTarget; inviteCode: string } | { inviteCode: string } | null {
  const param = raw?.trim();
  if (!param) return null;
  const prefixed = param.match(/^(p|t)_([A-Z0-9]+)$/i);
  if (prefixed) {
    return {
      userType: prefixed[1].toLowerCase() === "p" ? "parent" : "teen",
      inviteCode: prefixed[2].toUpperCase(),
    };
  }
  if (/^[A-Z0-9]{4,12}$/i.test(param)) {
    return { inviteCode: param.toUpperCase() };
  }
  return null;
}
