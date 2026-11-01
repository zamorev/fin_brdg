// Общие блоки договорённости: у родителя (TeenAgreement) и у подростка (MyAgreements), T28.
import type { ReactNode } from "react";
import {
  CATEGORY_LABELS,
  CATEGORY_MINIMUMS,
  CATEGORY_ORDER,
  formatRub,
  type Allocation,
  type CategoryKey,
} from "../domain/budget";
import { budgetBalance } from "../domain/parentView";
import { AlertIcon, CheckIcon, ChevronRight } from "./ParentIcons";

// Цвет категории в полосе и в иконке строки.
export const CATEGORY_COLORS: Record<CategoryKey, string> = {
  transport: "#5b9bff",
  food: "#2fb872",
  entertainment: "#e0a82a",
  savings: "#b866d6",
  reserve: "#9a9aa0",
};

type BudgetCardProps = {
  allocation: Allocation;
  weeklyBudget: number;
  /** Кнопки справа от суммы (у родителя — −/+). */
  actions?: ReactNode;
  hint?: string;
};

/** Карточка «Бюджет на неделю»: сумма, полоса распределения, статус. */
export function BudgetCard({ allocation, weeklyBudget, actions, hint }: BudgetCardProps) {
  const { allocated, unallocated } = budgetBalance(allocation, weeklyBudget);
  const denom = Math.max(weeklyBudget, allocated) || 1;
  return (
    <section className="pv-card pv-card--pad pv-budget">
      <div className="row-between">
        <span style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <span className="pv-role">Бюджет на неделю</span>
          <span className="pv-big">{formatRub(weeklyBudget)}</span>
        </span>
        {actions ? <span style={{ display: "flex", gap: 8 }}>{actions}</span> : null}
      </div>
      <div className={`pv-bar${unallocated < 0 ? " pv-bar--over" : ""}`}>
        {CATEGORY_ORDER.filter((k) => allocation[k] > 0).map((k) => (
          <span key={k} style={{ width: `${(allocation[k] / denom) * 100}%`, background: CATEGORY_COLORS[k] }} />
        ))}
      </div>
      <BalanceLine allocated={allocated} unallocated={unallocated} />
      {hint ? <span className="pv-row__sub">{hint}</span> : null}
    </section>
  );
}

type CategoryListProps = {
  allocation: Allocation;
  onSelect: (key: CategoryKey) => void;
  hint: string;
};

/** Секция «Категории»: 5 строк с суммой и минимумом. */
export function CategoryList({ allocation, onSelect, hint }: CategoryListProps) {
  return (
    <section className="pv-section">
      <div className="pv-section-head">
        <h2>Категории</h2>
        <span className="pv-role" style={{ fontSize: "0.875rem" }}>в неделю</span>
      </div>
      <div className="pv-card">
        {CATEGORY_ORDER.map((k) => {
          const min = CATEGORY_MINIMUMS[k];
          const color = CATEGORY_COLORS[k];
          return (
            <button key={k} type="button" className="pv-row" onClick={() => onSelect(k)}>
              <span className="pv-dot-tile" style={{ background: `color-mix(in srgb, ${color} 18%, transparent)` }}>
                <span className="pv-dot" style={{ background: color }} />
              </span>
              <span className="pv-row__body">
                <span className="pv-row__title" style={{ fontSize: "1rem" }}>{CATEGORY_LABELS[k]}</span>
                <span className="pv-row__sub">
                  {min ? `мин. ${formatRub(min)}` : "без минимума"}
                  {k === "reserve" ? " · на срочные покупки" : ""}
                </span>
              </span>
              <span className="pv-amount" style={{ fontSize: "1.0625rem" }}>{formatRub(allocation[k])}</span>
              <ChevronRight />
            </button>
          );
        })}
      </div>
      <p className="pv-hint">{hint}</p>
    </section>
  );
}

function BalanceLine({ allocated, unallocated }: { allocated: number; unallocated: number }) {
  if (unallocated === 0) {
    return (
      <span className="pv-note pv-tone-ok">
        <CheckIcon /> Распределено всё: {formatRub(allocated)}
      </span>
    );
  }
  if (unallocated > 0) {
    return (
      <span className="pv-note pv-tone-warn">
        <AlertIcon /> Не распределено {formatRub(unallocated)}
      </span>
    );
  }
  return (
    <span className="pv-note pv-tone-danger">
      <AlertIcon /> Категории больше бюджета на {formatRub(-unallocated)}
    </span>
  );
}
