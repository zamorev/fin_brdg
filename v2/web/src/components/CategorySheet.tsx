import { useState } from "react";
import {
  CATEGORY_LABELS,
  CATEGORY_MINIMUMS,
  changeCategory,
  formatRub,
  reserveSpare,
  type Allocation,
  type CategoryKey,
  type FundingSource,
} from "../domain/budget";
import { useTwa } from "../twa/TwaProvider";

const STEP = 50;
const MAX = 100_000;

type Props = {
  category: CategoryKey;
  allocation: Allocation;
  weeklyBudget: number;
  teenName: string;
  onClose: () => void;
  onSave: (next: { allocation: Allocation; weeklyBudget: number }) => Promise<void>;
};

/** Экран 4 — шторка правки одной категории (режим edit). */
export function CategorySheet({ category, allocation, weeklyBudget, teenName, onClose, onSave }: Props) {
  const initial = allocation[category];
  const min = CATEGORY_MINIMUMS[category] ?? 0;
  const spare = reserveSpare(allocation);
  const [amount, setAmount] = useState(initial);
  const [source, setSource] = useState<FundingSource>(spare > 0 ? "reserve" : "budget");
  const [saving, setSaving] = useState(false);
  const { haptic } = useTwa();

  const delta = amount - initial;
  const isReserve = category === "reserve";
  const next = changeCategory(allocation, weeklyBudget, category, amount, source);

  const set = (value: number) => {
    haptic("light");
    setAmount(Math.min(MAX, Math.max(min, value)));
  };

  const chips = [initial - 100, initial, initial + 50, initial + 100].filter((v) => v >= min);

  const save = async () => {
    setSaving(true);
    try {
      await onSave(next);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="pv-sheet-backdrop">
      <button type="button" className="pv-sheet-dismiss" aria-label="Закрыть" onClick={onClose} />
      <section className="pv-sheet" role="dialog" aria-label={CATEGORY_LABELS[category]}>
        <span className="pv-sheet__handle" />
        <div className="row-between">
          <span style={{ display: "flex", flexDirection: "column", gap: 3 }}>
            <strong style={{ fontSize: "1.375rem" }}>{CATEGORY_LABELS[category]}</strong>
            <span className="pv-row__sub" style={{ fontSize: "0.875rem" }}>
              Договорённость с {teenName}
            </span>
          </span>
          <button type="button" className="screen-back" style={{ margin: 0 }} onClick={onClose}>
            Отмена
          </button>
        </div>

        <div className="pv-stepper">
          <button type="button" className="pv-round" aria-label={`Уменьшить на ${STEP} ₽`} disabled={amount - STEP < min} onClick={() => set(amount - STEP)}>
            −
          </button>
          <span style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
            <span style={{ fontSize: "2.5rem", fontWeight: 700, letterSpacing: "-0.02em" }}>{formatRub(amount)}</span>
            <span className="pv-row__sub">в неделю · было {formatRub(initial)}</span>
          </span>
          <button type="button" className="pv-round" aria-label={`Увеличить на ${STEP} ₽`} disabled={amount + STEP > MAX} onClick={() => set(amount + STEP)}>
            +
          </button>
        </div>
        {min > 0 ? <span className="pv-row__sub" style={{ marginTop: -8, padding: "0 4px" }}>Минимум — {formatRub(min)}</span> : null}

        <div className="pv-chips">
          {chips.map((v) => (
            <button key={v} type="button" className="pv-chip-btn" aria-pressed={v === amount} onClick={() => set(v)}>
              {v}
            </button>
          ))}
        </div>

        {isReserve && delta !== 0 ? (
          <span className="pv-note">Бюджет недели {formatRub(weeklyBudget)} → {formatRub(next.weeklyBudget)}</span>
        ) : null}

        {!isReserve && delta < 0 ? (
          <span className="pv-note">Освободится {formatRub(-delta)} — уйдут в резерв</span>
        ) : null}

        {!isReserve && delta > 0 ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <span className="pv-row__sub" style={{ fontSize: "0.875rem", padding: "0 4px" }}>
              Откуда взять +{formatRub(delta)}
            </span>
            <div className="pv-inset" style={{ padding: 0 }} role="radiogroup">
              <button
                type="button"
                role="radio"
                className="pv-radio"
                aria-checked={source === "reserve"}
                disabled={spare === 0}
                onClick={() => setSource("reserve")}
              >
                <span className="pv-radio__ring" />
                <span className="pv-row__body">
                  <span style={{ fontWeight: 600 }}>Из резерва</span>
                  <span className="pv-row__sub">
                    {spare === 0
                      ? "Резерв уже на минимуме"
                      : spare < delta
                        ? `Резерва хватит на ${formatRub(spare)}, остальное — из бюджета`
                        : `Резерв ${formatRub(allocation.reserve)} → ${formatRub(allocation.reserve - delta)}`}
                  </span>
                </span>
              </button>
              <button
                type="button"
                role="radio"
                className="pv-radio"
                aria-checked={source === "budget"}
                onClick={() => setSource("budget")}
              >
                <span className="pv-radio__ring" />
                <span className="pv-row__body">
                  <span style={{ fontWeight: 600 }}>Увеличить недельный бюджет</span>
                  <span className="pv-row__sub">
                    {formatRub(weeklyBudget)} → {formatRub(weeklyBudget + delta)}
                  </span>
                </span>
              </button>
            </div>
          </div>
        ) : null}

        <button type="button" className="pv-btn pv-btn--primary pv-btn--wide" disabled={delta === 0 || saving} onClick={() => void save()}>
          {saving ? "…" : "Сохранить"}
        </button>
      </section>
    </div>
  );
}
