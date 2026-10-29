"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UNPLANNED_TICKET = exports.CATEGORY_ORDER = exports.CATEGORY_MINIMUMS = exports.DEFAULT_ALLOCATION = exports.WEEKLY_BUDGET = void 0;
exports.total = total;
exports.validateAllocation = validateAllocation;
exports.applyScenarioEffects = applyScenarioEffects;
exports.applyUnplanned = applyUnplanned;
exports.validateRuleChange = validateRuleChange;
exports.WEEKLY_BUDGET = 1500;
exports.DEFAULT_ALLOCATION = {
    transport: 300,
    food: 500,
    entertainment: 400,
    savings: 200,
    reserve: 100,
};
exports.CATEGORY_MINIMUMS = {
    transport: 300,
    food: 500,
    savings: 200,
    reserve: 100,
};
exports.CATEGORY_ORDER = [
    "transport",
    "food",
    "entertainment",
    "savings",
    "reserve",
];
function total(a) {
    return exports.CATEGORY_ORDER.reduce((s, k) => s + a[k], 0);
}
function validateAllocation(a, weeklyBudget = exports.WEEKLY_BUDGET) {
    const errors = [];
    const sum = total(a);
    if (sum !== weeklyBudget) {
        const diff = Math.abs(sum - weeklyBudget);
        errors.push(sum > weeklyBudget
            ? `На ${diff} ₽ больше, чем ${weeklyBudget} ₽ на неделю — убери лишнее`
            : `Осталось распределить ещё ${diff} ₽`);
    }
    for (const key of exports.CATEGORY_ORDER) {
        if (a[key] < 0)
            errors.push(`${key}: сумма не может быть отрицательной`);
        const min = exports.CATEGORY_MINIMUMS[key];
        if (min !== undefined && a[key] < min) {
            errors.push(`${key}: нужно не меньше ${min} ₽`);
        }
    }
    return errors;
}
exports.UNPLANNED_TICKET = 250;
function applyScenarioEffects(base, effects) {
    const next = { ...base };
    for (const effect of effects) {
        if (effect.type !== "spend")
            continue;
        next[effect.category] = Math.max(0, next[effect.category] - effect.amount);
    }
    return next;
}
function applyUnplanned(base, choice) {
    const next = { ...base };
    if (choice === "decline")
        return next;
    const key = choice === "entertainment"
        ? "entertainment"
        : choice === "savings"
            ? "savings"
            : "reserve";
    next[key] = Math.max(0, next[key] - exports.UNPLANNED_TICKET);
    return next;
}
function validateRuleChange(current, proposed, explanation) {
    const errors = [];
    if (!explanation.trim())
        errors.push("Расскажи, зачем тебе это важно");
    if (proposed <= 0)
        errors.push("Укажи сумму больше нуля");
    else if (proposed > exports.WEEKLY_BUDGET)
        errors.push(`На неделю не больше ${exports.WEEKLY_BUDGET} ₽ — это учебный бюджет`);
    else if (proposed === current)
        errors.push("Нужна другая сумма, не как сейчас");
    return errors;
}
//# sourceMappingURL=domain.js.map