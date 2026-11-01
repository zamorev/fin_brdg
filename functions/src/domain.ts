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

// Запрос подростка «+N ₽ к недельному бюджету» (T20, D11). Тексты совпадают с v2/web/src/domain/budget.ts.
export const BUDGET_INCREASE_STEP = 50;
export const BUDGET_INCREASE_MAX = 500;

export function validateBudgetIncrease(increase: number, explanation: string): string[] {
  const errors: string[] = [];
  if (!explanation.trim()) errors.push("Расскажи, на что нужны деньги");
  if (!Number.isInteger(increase) || increase <= 0) errors.push("Укажи сумму больше нуля");
  else if (increase > BUDGET_INCREASE_MAX)
    errors.push(`За один раз не больше ${formatRub(BUDGET_INCREASE_MAX)}`);
  else if (increase % BUDGET_INCREASE_STEP !== 0)
    errors.push(`Сумма должна быть кратна ${formatRub(BUDGET_INCREASE_STEP)}`);
  return errors;
}

/**
 * Правка договорённости родителем (T20). Перебор запрещён, нераспределённое допустимо
 * (траты квестов уже могли его создать). Минимум проверяется только у изменённых категорий:
 * если квест уже опустил категорию ниже минимума, остальные правки не блокируются.
 */
export function validateAgreementChange(
  before: Allocation,
  after: Allocation,
  weeklyBudget: number,
): string[] {
  const errors: string[] = [];
  const sum = CATEGORY_ORDER.reduce((s, k) => s + after[k], 0);
  if (sum > weeklyBudget) {
    errors.push(`Категории больше бюджета на ${formatRub(sum - weeklyBudget)}`);
  }
  for (const key of CATEGORY_ORDER) {
    if (after[key] < 0) {
      errors.push(`${CATEGORY_LABELS[key]}: сумма не может быть отрицательной`);
      continue;
    }
    const min = CATEGORY_MINIMUMS[key];
    if (min !== undefined && after[key] < min && after[key] !== before[key]) {
      errors.push(`${CATEGORY_LABELS[key]}: нужно не меньше ${formatRub(min)}`);
    }
  }
  return errors;
}

/** Одобренная прибавка ложится в резерв: сумма категорий остаётся равной новому бюджету. */
export function applyBudgetIncrease(a: Allocation, increase: number): Allocation {
  return { ...a, reserve: a.reserve + increase };
}
