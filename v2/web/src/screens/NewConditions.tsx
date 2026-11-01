import { useState } from "react";
import {
  BUDGET_INCREASE_MAX,
  BUDGET_INCREASE_STEP,
  formatRub,
  validateBudgetIncrease,
} from "../domain/budget";
import { selfWeeklyBudget } from "../domain/memberBudget";
import { createBudgetRequest } from "../api/client";
import { MainAction } from "../components/MainAction";
import { useBackAction } from "../components/useBackAction";
import { useTwa } from "../twa/TwaProvider";
import type { SessionUser } from "../domain/types";

type Props = {
  user: SessionUser;
  onBack: () => void;
  onSent: (user: SessionUser) => void;
};

export function NewConditions({ user, onBack, onSent }: Props) {
  const current = selfWeeklyBudget(user);
  const [increase, setIncrease] = useState(100);
  const [explanation, setExplanation] = useState(
    "Развлечения: хочу сходить с друзьями ещё раз на этой неделе — планирую заранее.",
  );
  const [errors, setErrors] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const { haptic } = useTwa();

  useBackAction(onBack);

  const submit = async () => {
    const local = validateBudgetIncrease(increase, explanation);
    if (local.length) {
      setErrors(local);
      haptic("error");
      return;
    }
    setLoading(true);
    try {
      const res = await createBudgetRequest(increase, explanation);
      haptic("success");
      onSent(res.user);
    } catch (e) {
      setErrors([e instanceof Error ? e.message : "Не получилось — попробуй ещё"]);
      haptic("error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-shell">
      <h1 className="screen-title">Попросить больше</h1>
      <div className="card">
        <h2 style={{ margin: "0 0 12px", fontSize: "1rem" }}>
          Предложение семье
        </h2>
        <p style={{ color: "var(--fb-hint)", fontSize: "0.875rem" }}>
          Бюджет недели сейчас {formatRub(current)}, станет{" "}
          <strong style={{ color: "var(--fb-text)" }}>{formatRub(current + increase)}</strong>
        </p>

        <div className="slider-row" style={{ marginTop: 16 }}>
          <label>
            <span>Сколько добавить в неделю</span>
            <strong>+{formatRub(increase)}</strong>
          </label>
          <input
            type="range"
            min={BUDGET_INCREASE_STEP}
            max={BUDGET_INCREASE_MAX}
            step={BUDGET_INCREASE_STEP}
            value={increase}
            onChange={(e) => setIncrease(Number(e.target.value))}
          />
        </div>

        <label style={{ display: "block", marginBottom: 8, fontSize: "0.875rem" }}>
          На что нужны деньги — напиши категорию и зачем
        </label>
        <textarea
          className="textarea"
          value={explanation}
          onChange={(e) => setExplanation(e.target.value)}
        />

        {errors.map((msg) => (
          <div className="error-banner" key={msg}>
            {msg}
          </div>
        ))}

        <MainAction
          text="Показать родителю"
          enabled={!loading}
          onClick={() => void submit()}
        />
      </div>
      <p className="hint-footer">
        Родитель увидит запрос у себя в приложении.
      </p>
    </div>
  );
}
