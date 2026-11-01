export const CURRENCY = "₽";
export const WEEKLY_BUDGET = 1500;

export type CategoryKey =
  | "transport"
  | "food"
  | "entertainment"
  | "savings"
  | "reserve";

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

export const DEFAULT_ALLOCATION: Record<CategoryKey, number> = {
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

export function formatRub(amount: number): string {
  return `${amount.toLocaleString("ru-RU")} ${CURRENCY}`;
}

export type Allocation = Record<CategoryKey, number>;

export function totalAllocation(a: Allocation): number {
  return CATEGORY_ORDER.reduce((sum, k) => sum + a[k], 0);
}

export type BudgetError = { message: string; category?: CategoryKey };

export function validateAllocation(a: Allocation, weeklyBudget = WEEKLY_BUDGET): BudgetError[] {
  const errors: BudgetError[] = [];
  const total = totalAllocation(a);
  if (total !== weeklyBudget) {
    const diff = total - weeklyBudget;
    const direction = diff > 0 ? "больше" : "меньше";
    errors.push({
      message: `Сумма должна быть ${formatRub(weeklyBudget)}: сейчас на ${formatRub(Math.abs(diff))} ${direction}`,
    });
  }
  for (const key of CATEGORY_ORDER) {
    if (a[key] < 0) {
      errors.push({
        message: `${CATEGORY_LABELS[key]}: сумма не может быть отрицательной`,
        category: key,
      });
      continue;
    }
    const min = CATEGORY_MINIMUMS[key];
    if (min !== undefined && a[key] < min) {
      errors.push({
        message: `${CATEGORY_LABELS[key]}: нужно не меньше ${formatRub(min)}`,
        category: key,
      });
    }
  }
  return errors;
}

export function startingAllocation(): Allocation {
  const a = { ...DEFAULT_ALLOCATION };
  for (const key of CATEGORY_ORDER) {
    a[key] = CATEGORY_MINIMUMS[key] ?? 0;
  }
  return a;
}

export type RequestStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "needs_clarification";

export const REQUEST_STATUS_LABELS: Record<RequestStatus, string> = {
  pending: "Ждём ответа",
  approved: "Договорились",
  rejected: "Не сейчас",
  needs_clarification: "Расскажи ещё",
};

// Запрос подростка «+N ₽ к недельному бюджету» (T20, D11). Тексты совпадают с functions/src/domain.ts.
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

export type FundingSource = "reserve" | "budget";

/**
 * Правка одной категории родителем (шторка, T20). Прибавка берётся из резерва
 * (до его минимума, остаток — из бюджета) или целиком из бюджета; уменьшение уходит в резерв.
 */
export function changeCategory(
  a: Allocation,
  weeklyBudget: number,
  key: CategoryKey,
  amount: number,
  source: FundingSource,
): { allocation: Allocation; weeklyBudget: number } {
  const delta = amount - a[key];
  const next = { ...a, [key]: amount };
  if (key === "reserve") {
    return { allocation: next, weeklyBudget: weeklyBudget + delta };
  }
  if (delta <= 0) {
    next.reserve += -delta;
    return { allocation: next, weeklyBudget };
  }
  const fromReserve = source === "reserve" ? Math.min(delta, reserveSpare(a)) : 0;
  next.reserve -= fromReserve;
  return { allocation: next, weeklyBudget: weeklyBudget + delta - fromReserve };
}

/** Сколько можно взять из резерва, не опускаясь ниже минимума. */
export function reserveSpare(a: Allocation): number {
  return Math.max(0, a.reserve - (CATEGORY_MINIMUMS.reserve ?? 0));
}

export const UNPLANNED_TICKET = 250;

export type UnplannedChoice =
  | "entertainment"
  | "savings"
  | "reserve"
  | "decline";

export const UNPLANNED_OPTIONS: {
  id: UnplannedChoice;
  label: string;
}[] = [
  { id: "entertainment", label: "Сокращу бюджет на развлечения" },
  { id: "savings", label: "Возьму из накоплений на цель" },
  { id: "reserve", label: "Возьму из резерва" },
  { id: "decline", label: "Откажусь от покупки" },
];

export function applyUnplannedChoice(
  base: Allocation,
  choice: UnplannedChoice,
): Allocation {
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

export type ConsequenceView = {
  title: string;
  body: string;
  entertainmentBefore: number;
  entertainmentAfter: number;
  savingsUntouched: boolean;
  reserveUntouched: boolean;
  reserveWarning?: string;
};

export function buildConsequence(
  choice: UnplannedChoice,
  before: Allocation,
): ConsequenceView {
  const after = applyUnplannedChoice(before, choice);
  const base = {
    entertainmentBefore: before.entertainment,
    entertainmentAfter: after.entertainment,
    savingsUntouched: after.savings === before.savings,
    reserveUntouched: after.reserve === before.reserve,
  };
  switch (choice) {
    case "entertainment":
      return {
        ...base,
        title: "Ты сократила развлечения",
        body: "Билет за 250 ₽ оплачен из этой категории. Резерв и накопления на цель остались нетронутыми.",
      };
    case "savings":
      return {
        ...base,
        title: "Ты взяла из накоплений",
        body: "250 ₽ ушли с цели. Развлечения и резерв не менялись.",
        savingsUntouched: false,
      };
    case "reserve":
      return {
        ...base,
        title: "Ты использовала резерв",
        body: "250 ₽ взяты из подушки на непредвиденное. Развлечения и накопления не трогали.",
        reserveUntouched: false,
        reserveWarning:
          "Если бы ты взяла деньги из резерва, на следующий непредвиденный случай его бы уже не хватило. Это условный дефицит внутри квеста, а не реальная потеря денег.",
      };
    case "decline":
      return {
        ...base,
        title: "Ты отказалась от покупки",
        body: "Бюджет на неделю остался как был — зато ты сознательно выбрала приоритет.",
      };
  }
}
