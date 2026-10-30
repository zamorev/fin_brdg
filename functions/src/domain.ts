export const CURRENCY = "₽";
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

export const CATEGORY_LABELS: Record<CategoryKey, string> = {
  transport: "Транспорт",
  food: "Обеды и перекусы",
  entertainment: "Развлечения",
  savings: "Накопления на цель",
  reserve: "Резерв",
};

export function formatRub(amount: number): string {
  return `${amount.toLocaleString("ru-RU")} ${CURRENCY}`;
}

export function total(a: Allocation): number {
  return CATEGORY_ORDER.reduce((s, k) => s + a[k], 0);
}

// Тексты совпадают с v2/web/src/domain/budget.ts (проверяет domain.test.ts).
export function validateAllocation(a: Allocation, weeklyBudget = WEEKLY_BUDGET): string[] {
  const errors: string[] = [];
  const sum = total(a);
  if (sum !== weeklyBudget) {
    const diff = sum - weeklyBudget;
    const direction = diff > 0 ? "больше" : "меньше";
    errors.push(
      `Сумма должна быть ${formatRub(weeklyBudget)}: сейчас на ${formatRub(Math.abs(diff))} ${direction}`,
    );
  }
  for (const key of CATEGORY_ORDER) {
    if (a[key] < 0) {
      errors.push(`${CATEGORY_LABELS[key]}: сумма не может быть отрицательной`);
      continue;
    }
    const min = CATEGORY_MINIMUMS[key];
    if (min !== undefined && a[key] < min) {
      errors.push(`${CATEGORY_LABELS[key]}: нужно не меньше ${formatRub(min)}`);
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

export type SpendEffect = { type: "spend"; category: CategoryKey; amount: number };

export function applyScenarioEffects(base: Allocation, effects: SpendEffect[]): Allocation {
  const next = { ...base };
  for (const effect of effects) {
    if (effect.type !== "spend") continue;
    next[effect.category] = Math.max(0, next[effect.category] - effect.amount);
  }
  return next;
}

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
    errors.push(`На неделю не больше ${formatRub(WEEKLY_BUDGET)} — это учебный бюджет`);
  else if (proposed === current) errors.push("Нужна другая сумма, не как сейчас");
  return errors;
}
