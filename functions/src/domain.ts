export const WEEKLY_BUDGET = 1500;

export type CategoryKey =
  | "transport"
  | "food"
  | "entertainment"
  | "savings"
  | "reserve";

export type Allocation = Record<CategoryKey, number>;

export const DEFAULT_ALLOCATION: Allocation = {
  transport: 300,
  food: 500,
  entertainment: 400,
  savings: 200,
  reserve: 100,
};

export const CATEGORY_MINIMUMS: Partial<Record<CategoryKey, number>> = {
  transport: 300,
  food: 500,
  savings: 200,
  reserve: 100,
};

export const CATEGORY_ORDER: CategoryKey[] = [
  "transport",
  "food",
  "entertainment",
  "savings",
  "reserve",
];

export function total(a: Allocation): number {
  return CATEGORY_ORDER.reduce((s, k) => s + a[k], 0);
}

export function validateAllocation(a: Allocation): string[] {
  const errors: string[] = [];
  const sum = total(a);
  if (sum !== WEEKLY_BUDGET) {
    const diff = Math.abs(sum - WEEKLY_BUDGET);
    errors.push(
      sum > WEEKLY_BUDGET
        ? `На ${diff} ₽ больше, чем ${WEEKLY_BUDGET} ₽ на неделю — убери лишнее`
        : `Осталось распределить ещё ${diff} ₽`,
    );
  }
  for (const key of CATEGORY_ORDER) {
    if (a[key] < 0) errors.push(`${key}: сумма не может быть отрицательной`);
    const min = CATEGORY_MINIMUMS[key];
    if (min !== undefined && a[key] < min) {
      errors.push(`${key}: нужно не меньше ${min} ₽`);
    }
  }
  return errors;
}

export type UnplannedChoice =
  | "entertainment"
  | "savings"
  | "reserve"
  | "decline";

export const UNPLANNED_TICKET = 250;

export function applyUnplanned(base: Allocation, choice: UnplannedChoice): Allocation {
  const next = { ...base };
  if (choice === "decline") return next;
  const key =
    choice === "entertainment"
      ? "entertainment"
      : choice === "savings"
        ? "savings"
        : "reserve";
  next[key] = Math.max(0, next[key] - UNPLANNED_TICKET);
  return next;
}

export type RequestStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "needs_clarification";

export function validateRuleChange(
  current: number,
  proposed: number,
  explanation: string,
): string[] {
  const errors: string[] = [];
  if (!explanation.trim()) errors.push("Расскажи, зачем тебе это важно");
  if (proposed <= 0) errors.push("Укажи сумму больше нуля");
  else if (proposed > WEEKLY_BUDGET)
    errors.push(`На неделю не больше ${WEEKLY_BUDGET} ₽ — это учебный бюджет`);
  else if (proposed === current) errors.push("Нужна другая сумма, не как сейчас");
  return errors;
}
