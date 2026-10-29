import {
  CATEGORY_LABELS,
  CATEGORY_ORDER,
  type CategoryKey,
} from "../domain/budget";
import type { ScenarioDefinition } from "../api/adminClient";
import {
  defaultSpendEffect,
  normalizeSpendEffects,
  type ScenarioSpendEffect,
} from "./scenarioUiHelpers";

type Option = ScenarioDefinition["nodes"][string]["options"][number];

type Props = {
  option: Option;
  optionIndex: number;
  nodeIds: string[];
  scenario: ScenarioDefinition;
  onChange: (patch: Partial<Option>) => void;
};

export function OptionBudgetEditor({ option, onChange }: Props) {
  const effects = normalizeSpendEffects(option.effects);
  const hasSpend = effects.length > 0;

  const setEffects = (next: ScenarioSpendEffect[]) => {
    if (next.length === 0) {
      onChange({ effects: undefined });
      return;
    }
    onChange({ effects: next });
  };

  const updateRow = (rowIdx: number, patch: Partial<ScenarioSpendEffect>) => {
    const next = [...effects];
    next[rowIdx] = { ...next[rowIdx], ...patch, type: "spend" };
    setEffects(next);
  };

  return (
    <div className="admin-budget-block">
      <div className="admin-editor-section__title" style={{ marginBottom: 6 }}>
        Влияние на бюджет
      </div>
      <p className="admin-toolbar__hint" style={{ margin: "0 0 10px" }}>
        Те же категории, что в квесте «Неделя на 1500 ₽». Например: «Беру» — списание, «Не
        беру» — без списания.
      </p>

      <div className="admin-budget-mode">
        <label className="admin-budget-mode__item">
          <input
            type="radio"
            name={`budget-${option.id}`}
            checked={!hasSpend}
            onChange={() => setEffects([])}
          />
          <span>Не менять баланс</span>
        </label>
        <label className="admin-budget-mode__item">
          <input
            type="radio"
            name={`budget-${option.id}`}
            checked={hasSpend}
            onChange={() => setEffects([defaultSpendEffect()])}
          />
          <span>Списать с бюджета</span>
        </label>
      </div>

      {hasSpend ? (
        <div className="admin-budget-rows">
          {effects.map((eff, rowIdx) => (
            <div key={rowIdx} className="admin-form-row admin-budget-row">
              <label className="admin-field">
                <span>Категория</span>
                <select
                  className="admin-select"
                  value={eff.category}
                  onChange={(e) =>
                    updateRow(rowIdx, { category: e.target.value as CategoryKey })
                  }
                >
                  {CATEGORY_ORDER.map((key) => (
                    <option key={key} value={key}>
                      {CATEGORY_LABELS[key]}
                    </option>
                  ))}
                </select>
              </label>
              <label className="admin-field">
                <span>Сумма, ₽</span>
                <input
                  className="admin-input"
                  type="number"
                  min={1}
                  step={1}
                  value={eff.amount || ""}
                  onChange={(e) =>
                    updateRow(rowIdx, { amount: Math.max(0, Number(e.target.value) || 0) })
                  }
                />
              </label>
              {effects.length > 1 ? (
                <button
                  type="button"
                  className="admin-btn admin-btn--ghost admin-btn--sm admin-budget-row__remove"
                  onClick={() => setEffects(effects.filter((_, i) => i !== rowIdx))}
                >
                  Убрать
                </button>
              ) : null}
            </div>
          ))}
          <button
            type="button"
            className="admin-btn admin-btn--sm"
            onClick={() => setEffects([...effects, defaultSpendEffect()])}
          >
            + ещё одно списание (несколько покупок)
          </button>
        </div>
      ) : null}
    </div>
  );
}
