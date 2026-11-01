// Производные числа и подписи экранов родителя (T20). Без React и fetch.
import {
  CATEGORY_LABELS,
  changeCategory,
  formatRub,
  totalAllocation,
  type Allocation,
  type CategoryKey,
  type FundingSource,
} from "./budget";
import type { FamilyMember, FamilyState, RuleChangeRequest, SessionUser } from "./types";
import { memberWeeklyBudget } from "./memberBudget";

/** 1 подросток, 2 подростка, 5 подростков. */
export function plural(n: number, one: string, few: string, many: string): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return few;
  return many;
}

export function teens(user: SessionUser): FamilyMember[] {
  return user.members.filter((m) => m.userType === "teen");
}

/** Запрос ждёт решения родителя. */
export function pendingRequest(user: SessionUser): RuleChangeRequest | null {
  return user.activeRequest?.status === "pending" ? user.activeRequest : null;
}

/** Чей запрос: у старых запросов нет teenTelegramId — тогда единственный подросток семьи. */
export function requestTeen(user: SessionUser, req: RuleChangeRequest): FamilyMember | null {
  const list = teens(user);
  if (req.teenTelegramId !== undefined) {
    return list.find((t) => t.telegramId === req.teenTelegramId) ?? null;
  }
  return list.length === 1 ? list[0] : null;
}

export function teenName(member: FamilyMember | null): string {
  return member?.displayName.trim() || "Подросток";
}

export function requestSubject(req: RuleChangeRequest): string {
  if (req.category === "weekly_budget") return "Бюджет недели";
  if (req.category === "category_change" && req.categoryKey) return CATEGORY_LABELS[req.categoryKey];
  return CATEGORY_LABELS.entertainment;
}

/**
 * Что изменится, если применить запрос по категории к договорённости (T28):
 * «Развлечения 400 → 500 ₽, резерв 200 → 100 ₽» или «…, бюджет 1 500 → 1 600 ₽».
 */
export function categoryChangeEffect(
  allocation: Allocation,
  weeklyBudget: number,
  key: CategoryKey,
  amount: number,
  source: FundingSource,
): string {
  const next = changeCategory(allocation, weeklyBudget, key, amount, source);
  const parts = [`${CATEGORY_LABELS[key]} ${allocation[key].toLocaleString("ru-RU")} → ${formatRub(amount)}`];
  if (key !== "reserve" && next.allocation.reserve !== allocation.reserve) {
    parts.push(`резерв ${allocation.reserve.toLocaleString("ru-RU")} → ${formatRub(next.allocation.reserve)}`);
  }
  if (next.weeklyBudget !== weeklyBudget) {
    parts.push(`бюджет ${weeklyBudget.toLocaleString("ru-RU")} → ${formatRub(next.weeklyBudget)}`);
  }
  return parts.join(", ");
}

export function signedRub(delta: number): string {
  return `${delta >= 0 ? "+" : "−"}${formatRub(Math.abs(delta))}`;
}

/** «сегодня, 09:40», «вчера, 21:15», «28 окт, 14:02». */
export function formatRequestTime(iso: string | undefined, now = new Date()): string {
  if (!iso) return "";
  const at = new Date(iso);
  const time = at.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
  const day = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const diffDays = Math.round((day(now) - day(at)) / 86_400_000);
  if (diffDays === 0) return `сегодня, ${time}`;
  if (diffDays === 1) return `вчера, ${time}`;
  const date = at.toLocaleDateString("ru-RU", { day: "numeric", month: "short" }).replace(".", "");
  return `${date}, ${time}`;
}

/** Сколько квестов пройдено — из флагов семьи (D10). */
export function questsDone(family: FamilyState): number {
  return Number(family.questWeekBudgetCompleted) + Number(family.questUnplannedCompleted);
}

export type BudgetBalance = { allocated: number; unallocated: number };

export function budgetBalance(allocation: Allocation, weeklyBudget: number): BudgetBalance {
  const allocated = totalAllocation(allocation);
  return { allocated, unallocated: weeklyBudget - allocated };
}

export type StatusLine = { text: string; tone: "warn" | "danger" | "hint" };

/** Подпись подростка в списке на главной родителя, по приоритету. */
export function teenStatusLine(user: SessionUser, teen: FamilyMember): StatusLine {
  const req = pendingRequest(user);
  if (req && requestTeen(user, req)?.telegramId === teen.telegramId) {
    return {
      text: req.category === "weekly_budget"
        ? `Запрос · ${signedRub(req.proposedAmount - req.currentAmount)} в неделю`
        : req.category === "category_change"
          ? `Запрос · ${requestSubject(req)} ${signedRub(req.proposedAmount - req.currentAmount)}`
          : `Запрос · ${requestSubject(req)}`,
      tone: "warn",
    };
  }
  const { unallocated } = budgetBalance(user.family.allocation, memberWeeklyBudget(teen));
  if (unallocated > 0) return { text: `Не распределено ${formatRub(unallocated)}`, tone: "warn" };
  if (unallocated < 0) return { text: `Перебор ${formatRub(-unallocated)}`, tone: "danger" };
  return { text: "5 категорий", tone: "hint" };
}

/** «Матвей ждёт ответа». */
export function waitingCaption(user: SessionUser, req: RuleChangeRequest): string {
  return `${teenName(requestTeen(user, req))} ждёт ответа`;
}
