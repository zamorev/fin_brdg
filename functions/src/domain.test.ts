// Кейсы — docs/design-docs/domain-test-cases.md (разделы 1, 2, 4).
// Каждый кейс прогоняется и через фронтовую копию (v2/web/src/domain/budget.ts):
// пока копий две (X7), тест ловит расхождение.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  Allocation,
  CATEGORY_LABELS,
  CATEGORY_MINIMUMS,
  CATEGORY_ORDER,
  DEFAULT_ALLOCATION,
  SpendEffect,
  UNPLANNED_TICKET,
  UnplannedChoice,
  WEEKLY_BUDGET,
  applyScenarioEffects,
  applyUnplanned,
  formatRub,
  validateAllocation,
  validateRuleChange,
} from "./domain";
import * as web from "../../v2/web/src/domain/budget";

const D = DEFAULT_ALLOCATION;
const plan = (patch: Partial<Allocation>): Allocation => ({ ...D, ...patch });

// Серверная проверка + сверка с фронтом: те же тексты, у фронта ещё категория.
function check(a: Allocation, weeklyBudget?: number): string[] {
  const server = validateAllocation(a, weeklyBudget);
  const front = web.validateAllocation(a, weeklyBudget);
  assert.deepEqual(
    front.map((e) => e.message),
    server,
    "фронтовая копия validateAllocation расходится с сервером",
  );
  return server;
}

function checkRule(current: number, proposed: number, explanation: string): string[] {
  const server = validateRuleChange(current, proposed, explanation);
  assert.deepEqual(
    web.validateRuleChange(current, proposed, explanation),
    server,
    "фронтовая копия validateRuleChange расходится с сервером",
  );
  return server;
}

describe("domain: константы", () => {
  it("C1: недельный бюджет 1 500", () => {
    assert.equal(WEEKLY_BUDGET, 1500);
  });

  it("C2: ровно пять категорий в порядке экрана", () => {
    assert.deepEqual(CATEGORY_ORDER, ["transport", "food", "entertainment", "savings", "reserve"]);
  });

  it("C3: подписи категорий", () => {
    assert.deepEqual(CATEGORY_LABELS, {
      transport: "Транспорт",
      food: "Обеды и перекусы",
      entertainment: "Развлечения",
      savings: "Накопления на цель",
      reserve: "Резерв",
    });
  });

  it("C4: план по умолчанию D, в сумме бюджет", () => {
    assert.deepEqual(D, { transport: 300, food: 500, entertainment: 400, savings: 200, reserve: 100 });
    assert.equal(CATEGORY_ORDER.reduce((s, k) => s + D[k], 0), WEEKLY_BUDGET);
  });

  it("C5: минимумы, у развлечений минимума нет", () => {
    assert.ok(!("entertainment" in CATEGORY_MINIMUMS));
    assert.deepEqual(CATEGORY_MINIMUMS, { transport: 300, food: 500, savings: 200, reserve: 100 });
  });

  it("C7: формат суммы с разделителем разрядов", () => {
    assert.match(formatRub(1500), /^1\s500 ₽$/);
    assert.equal(formatRub(250), "250 ₽");
  });

  it("фронтовая копия: те же константы", () => {
    assert.equal(web.WEEKLY_BUDGET, WEEKLY_BUDGET);
    assert.deepEqual(web.CATEGORY_ORDER, CATEGORY_ORDER);
    assert.deepEqual(web.CATEGORY_LABELS, CATEGORY_LABELS);
    assert.deepEqual(web.DEFAULT_ALLOCATION, D);
    assert.deepEqual(web.CATEGORY_MINIMUMS, CATEGORY_MINIMUMS);
    assert.equal(web.UNPLANNED_TICKET, UNPLANNED_TICKET);
    assert.equal(web.formatRub(1500), formatRub(1500));
  });
});

describe("domain: validateAllocation", () => {
  it("A1: план D валиден", () => {
    assert.deepEqual(check(D), []);
  });

  it("A2: перераспределение выше минимумов валидно", () => {
    assert.deepEqual(check(plan({ entertainment: 0, savings: 400, reserve: 300 })), []);
  });

  it("A3: минимум включительно", () => {
    assert.deepEqual(
      check({ transport: 300, food: 500, entertainment: 400, savings: 200, reserve: 100 }),
      [],
    );
  });

  it("A4: не хватает 1 ₽ — одна ошибка суммы", () => {
    const errors = check(plan({ entertainment: 399 }));
    assert.equal(errors.length, 1);
    assert.equal(errors[0], `Сумма должна быть ${formatRub(1500)}: сейчас на 1 ₽ меньше`);
  });

  it("A5: перебор на 100 ₽ — одна ошибка суммы", () => {
    const errors = check(plan({ entertainment: 500 }));
    assert.equal(errors.length, 1);
    assert.equal(errors[0], `Сумма должна быть ${formatRub(1500)}: сейчас на 100 ₽ больше`);
  });

  it("A6: развлечения 0 — одна ошибка суммы на 400 ₽", () => {
    const errors = check(plan({ entertainment: 0 }));
    assert.equal(errors.length, 1);
    assert.match(errors[0], /на 400 ₽ меньше/);
  });

  const belowMinimum: [string, Partial<Allocation>, string][] = [
    ["A7", { transport: 299, entertainment: 401 }, "Транспорт: нужно не меньше 300 ₽"],
    ["A8", { food: 499, entertainment: 401 }, "Обеды и перекусы: нужно не меньше 500 ₽"],
    ["A9", { savings: 199, entertainment: 401 }, "Накопления на цель: нужно не меньше 200 ₽"],
    ["A10", { reserve: 99, entertainment: 401 }, "Резерв: нужно не меньше 100 ₽"],
  ];
  for (const [id, patch, message] of belowMinimum) {
    it(`${id}: ниже минимума — одна ошибка с подписью категории (X1)`, () => {
      assert.deepEqual(check(plan(patch)), [message]);
    });
  }

  it("A11: отрицательная сумма — только ошибка «отрицательная» (X2)", () => {
    const errors = check(plan({ entertainment: -100, savings: 700 }));
    assert.deepEqual(errors, ["Развлечения: сумма не может быть отрицательной"]);
  });

  it("A11: отрицательная сумма в категории с минимумом — без ошибки минимума (X2)", () => {
    const errors = check(plan({ reserve: -100, entertainment: 600 }));
    assert.deepEqual(errors, ["Резерв: сумма не может быть отрицательной"]);
  });

  it("A12: всё по нулям — ошибка суммы и 4 ошибки минимумов вместе", () => {
    const errors = check({ transport: 0, food: 0, entertainment: 0, savings: 0, reserve: 0 });
    assert.equal(errors.length, 5);
    assert.match(errors[0], /^Сумма должна быть/);
    assert.deepEqual(errors.slice(1), [
      "Транспорт: нужно не меньше 300 ₽",
      "Обеды и перекусы: нужно не меньше 500 ₽",
      "Накопления на цель: нужно не меньше 200 ₽",
      "Резерв: нужно не меньше 100 ₽",
    ]);
  });

  it("A13: проверка по переданному бюджету, а не по константе", () => {
    assert.deepEqual(check(plan({ entertainment: 900 }), 2000), []);
    const errors = check(D, 2000);
    assert.deepEqual(errors, [`Сумма должна быть ${formatRub(2000)}: сейчас на 500 ₽ меньше`]);
  });

  it("ошибки без ключей категорий в тексте (X1)", () => {
    const errors = check({ transport: 0, food: 0, entertainment: -1, savings: 0, reserve: 0 });
    for (const key of CATEGORY_ORDER) {
      assert.ok(!errors.some((e) => e.startsWith(`${key}:`)), `ключ ${key} в тексте ошибки`);
    }
  });
});

describe("domain: validateRuleChange", () => {
  it("R1: базовый запрос 400 → 500 без ошибок", () => {
    assert.deepEqual(checkRule(400, 500, "Хочу ходить в кино"), []);
  });

  it("R3: пустое объяснение или одни пробелы", () => {
    for (const explanation of ["", "   "]) {
      assert.deepEqual(checkRule(400, 500, explanation), ["Расскажи, зачем тебе это важно"]);
    }
  });

  it("R4: сумма 0 или отрицательная", () => {
    for (const proposed of [0, -50]) {
      assert.deepEqual(checkRule(400, proposed, "Хочу ходить в кино"), ["Укажи сумму больше нуля"]);
    }
  });

  it("R5: сумма как сейчас", () => {
    assert.deepEqual(checkRule(400, 400, "Хочу ходить в кино"), ["Нужна другая сумма, не как сейчас"]);
  });

  it("R6: больше недельного бюджета", () => {
    assert.deepEqual(checkRule(400, 1501, "Хочу ходить в кино"), [
      `На неделю не больше ${formatRub(1500)} — это учебный бюджет`,
    ]);
    assert.deepEqual(checkRule(400, 1500, "Хочу ходить в кино"), []);
  });

  it("несколько ошибок сразу", () => {
    assert.equal(checkRule(400, 0, " ").length, 2);
  });
});

describe("domain: applyUnplanned", () => {
  const cases: [UnplannedChoice, Partial<Allocation>][] = [
    ["entertainment", { entertainment: 150 }],
    ["savings", { savings: 0 }],
    ["reserve", { reserve: 0 }],
    ["decline", {}],
  ];
  for (const [choice, patch] of cases) {
    it(`${choice}: билет ${UNPLANNED_TICKET} ₽ списывается, не ниже 0`, () => {
      const base = { ...D };
      const next = applyUnplanned(base, choice);
      assert.deepEqual(next, plan(patch));
      assert.deepEqual(base, D, "вход не меняется");
      assert.deepEqual(web.applyUnplannedChoice(base, choice), next, "фронт расходится с сервером");
    });
  }

  it("при достаточном остатке списывается ровно билет", () => {
    assert.equal(applyUnplanned(plan({ savings: 600 }), "savings").savings, 600 - UNPLANNED_TICKET);
  });
});

describe("domain: applyScenarioEffects", () => {
  it("списывает траты по категориям", () => {
    const effects: SpendEffect[] = [
      { type: "spend", category: "entertainment", amount: 250 },
      { type: "spend", category: "food", amount: 100 },
    ];
    assert.deepEqual(applyScenarioEffects(D, effects), plan({ entertainment: 150, food: 400 }));
  });

  it("несколько трат по одной категории суммируются, не ниже 0", () => {
    const effects: SpendEffect[] = [
      { type: "spend", category: "reserve", amount: 60 },
      { type: "spend", category: "reserve", amount: 60 },
    ];
    assert.equal(applyScenarioEffects(D, effects).reserve, 0);
  });

  it("без эффектов и с неизвестным типом — план без изменений", () => {
    assert.deepEqual(applyScenarioEffects(D, []), D);
    const unknown = [{ type: "earn", category: "savings", amount: 100 }] as unknown as SpendEffect[];
    assert.deepEqual(applyScenarioEffects(D, unknown), D);
  });

  it("вход не меняется", () => {
    const base = { ...D };
    applyScenarioEffects(base, [{ type: "spend", category: "transport", amount: 300 }]);
    assert.deepEqual(base, D);
  });
});
