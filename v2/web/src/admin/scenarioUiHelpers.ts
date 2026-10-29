const MINUTE_MS = 60 * 1000;

export function delayMsToHoursMinutes(delayMs?: number): { hours: number; minutes: number } {
  const totalMinutes = Math.round((delayMs ?? 0) / MINUTE_MS);
  return {
    hours: Math.floor(totalMinutes / 60),
    minutes: totalMinutes % 60,
  };
}

export function hoursMinutesToDelayMs(hours: number, minutes: number): number | undefined {
  const h = Number.isFinite(hours) ? Math.max(0, Math.floor(hours)) : 0;
  const m = Number.isFinite(minutes) ? Math.max(0, Math.floor(minutes)) : 0;
  const total = h * 60 + m;
  return total > 0 ? total * MINUTE_MS : undefined;
}

export function formatDelayHuman(delayMs?: number): string {
  if (!delayMs || delayMs <= 0) return "сразу";
  const { hours, minutes } = delayMsToHoursMinutes(delayMs);
  const parts: string[] = [];
  if (hours) parts.push(`${hours} ч`);
  if (minutes) parts.push(`${minutes} мин`);
  return parts.join(" ") || "сразу";
}

/** Короткая подпись узла для списков */
export function nodeSummary(
  nodeId: string,
  prompt: string | undefined,
): string {
  const line = prompt?.split("\n")[0]?.trim();
  if (line && line.length > 48) return `${nodeId} — ${line.slice(0, 45)}…`;
  if (line) return `${nodeId} — ${line}`;
  return nodeId;
}

export const NODE_ID_HINT: Record<string, string> = {
  invite: "Приглашение в кино",
  box_office: "Касса / попкорн",
  friends_pay: "Друзья платят сами",
};
