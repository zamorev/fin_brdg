import { CATEGORY_LABELS, type CategoryKey } from "../domain/budget";

const MINUTE_MS = 60 * 1000;

export type ScenarioSpendEffect = { type: "spend"; category: CategoryKey; amount: number };

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

export const NODE_ID_HINT: Record<string, string> = {
  invite: "Приглашение в кино",
  box_office: "Касса / попкорн",
  friends_pay: "Друзья платят сами",
};

/** Короткая подпись узла для списков (техническая) */
export function nodeSummary(
  nodeId: string,
  prompt: string | undefined,
): string {
  const line = prompt?.split("\n")[0]?.trim();
  if (line && line.length > 48) return `${nodeId} — ${line.slice(0, 45)}…`;
  if (line) return `${nodeId} — ${line}`;
  return nodeId;
}

/** Имя экрана для чипов и заголовков */
export function nodeDisplayName(
  nodeId: string,
  prompt: string | undefined,
  stepIndex: number,
): string {
  if (NODE_ID_HINT[nodeId]) return NODE_ID_HINT[nodeId];
  const line = prompt?.split("\n")[0]?.trim();
  if (line) {
    const short = line.length > 32 ? `${line.slice(0, 29)}…` : line;
    return `${stepIndex + 1}. ${short}`;
  }
  return `Шаг ${stepIndex + 1} (${nodeId})`;
}

/** Подпись в выпадающем списке «куда ведёт ответ» */
export function nodeSelectLabel(nodeId: string, prompt: string | undefined): string {
  if (NODE_ID_HINT[nodeId]) return NODE_ID_HINT[nodeId];
  const line = prompt?.split("\n")[0]?.trim();
  if (line) return line.length > 56 ? `${line.slice(0, 53)}…` : line;
  return nodeId;
}

export function spendEffectsSummary(effects?: ScenarioSpendEffect[]): string | null {
  if (!effects?.length) return null;
  return effects
    .map((e) => `${CATEGORY_LABELS[e.category]} −${e.amount.toLocaleString("ru-RU")} ₽`)
    .join(", ");
}

export function defaultSpendEffect(): ScenarioSpendEffect {
  return { type: "spend", category: "entertainment", amount: 100 };
}

export function normalizeSpendEffects(
  raw?: Array<{ type: string; category: string; amount: number }>,
): ScenarioSpendEffect[] {
  if (!raw?.length) return [];
  return raw
    .filter((e) => e.type === "spend" && e.amount > 0)
    .map((e) => ({
      type: "spend" as const,
      category: e.category as CategoryKey,
      amount: Math.round(e.amount),
    }));
}

export function optionOutcomeHint(
  endsHere: boolean,
  delayMs: number | undefined,
  nextNodeId: string | undefined,
  scenario: { nodes: Record<string, { prompt?: string }> },
  effects?: ScenarioSpendEffect[],
): string {
  const budget = spendEffectsSummary(effects);
  const budgetLine = budget
    ? `Списание с бюджета: ${budget}. `
    : "Бюджет на неделю не меняется. ";

  if (endsHere) {
    return `${budgetLine}Подросток закончит квест — следующих экранов не будет.`;
  }
  const delay = formatDelayHuman(delayMs);
  const next = nextNodeId ? scenario.nodes[nextNodeId] : undefined;
  const where = nextNodeId
    ? nodeSelectLabel(nextNodeId, next?.prompt)
    : "— не выбран экран —";
  if (delay === "сразу") {
    return `${budgetLine}Сразу откроется экран: «${where}».`;
  }
  return `${budgetLine}Через ${delay} откроется экран: «${where}» (напоминание в Telegram).`;
}
