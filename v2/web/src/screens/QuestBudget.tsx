import { useCallback, useMemo, useState } from "react";
import {
  CATEGORY_LABELS,
  CATEGORY_ORDER,
  formatRub,
  totalAllocation,
  validateAllocation,
  type Allocation,
} from "../domain/budget";
import { checkWeekBudget } from "../api/client";
import { MainAction } from "../components/MainAction";
import { useBackAction } from "../components/useBackAction";
import { useTwa } from "../twa/TwaProvider";
import { selfWeeklyBudget } from "../domain/memberBudget";
import type { SessionUser } from "../domain/types";

type Props = {
  user: SessionUser;
  onBack: () => void;
  onSuccess: (user: SessionUser) => void;
  onContinueUnplanned: () => void;
};

export function QuestBudget({
  user,
  onBack,
  onSuccess,
  onContinueUnplanned,
}: Props) {
  const { haptic } = useTwa();
  const weeklyBudget = selfWeeklyBudget(user);
  const [values, setValues] = useState<Allocation>(() => ({
    ...user.family.allocation,
  }));
  const [errors, setErrors] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useBackAction(onBack);

  const total = useMemo(() => totalAllocation(values), [values]);
  const totalOk = total === weeklyBudget;

  const onCheck = useCallback(async () => {
    const local = validateAllocation(values, weeklyBudget);
    if (local.length) {
      setErrors(local.map((e) => e.message));
      haptic("error");
      return;
    }
    setSubmitting(true);
    setErrors([]);
    try {
      const res = await checkWeekBudget(values);
      if (!res.ok) {
        setErrors(res.errors.map((e) => e.message));
        haptic("error");
        return;
      }
      haptic("success");
      onSuccess(res.user);
      if (!res.user.family.questUnplannedCompleted) {
        onContinueUnplanned();
      } else {
        onBack();
      }
    } catch (e) {
      setErrors([e instanceof Error ? e.message : "Не получилось — попробуй ещё"]);
      haptic("error");
    } finally {
      setSubmitting(false);
    }
  }, [values, weeklyBudget, haptic, onSuccess, onContinueUnplanned, onBack]);

  return (
    <div className="app-shell">
      <p style={{ color: "var(--fb-hint)", margin: "0 0 8px", fontSize: "0.8125rem" }}>
        Квест 1 из 1
      </p>
      <h1 className="screen-title">Неделя на {formatRub(weeklyBudget)}</h1>
      <p className="screen-sub">
        У тебя есть {formatRub(weeklyBudget)} на неделю. Распредели сумму так, чтобы
        покрыть обязательные расходы, отложить на цель и оставить резерв на
        непредвиденное.
      </p>

      <div className="card">
        {CATEGORY_ORDER.map((key) => (
          <div className="slider-row" key={key}>
            <label>
              <span>{CATEGORY_LABELS[key]}</span>
              <strong>{formatRub(values[key])}</strong>
            </label>
            <input
              type="range"
              min={0}
              max={weeklyBudget}
              step={50}
              value={values[key]}
              onChange={(e) =>
                setValues((prev) => ({
                  ...prev,
                  [key]: Number(e.target.value),
                }))
              }
            />
          </div>
        ))}

        <div className="row-between" style={{ marginTop: 8 }}>
          <span>Распределено</span>
          <strong style={{ color: totalOk ? "var(--fb-success)" : "var(--fb-warning)" }}>
            {total} из {formatRub(weeklyBudget)}
          </strong>
        </div>

        {errors.map((msg) => (
          <div className="error-banner" key={msg}>
            {msg}
          </div>
        ))}

        <MainAction
          text="Проверить мой бюджет"
          enabled={!submitting}
          onClick={() => void onCheck()}
        />
      </div>
    </div>
  );
}
