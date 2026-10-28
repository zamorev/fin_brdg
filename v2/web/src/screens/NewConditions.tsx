import { useState } from "react";
import { formatRub, validateRuleChange } from "../domain/budget";
import { createRuleRequest } from "../api/client";
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
  const current = user.family.allocation.entertainment;
  const [proposed, setProposed] = useState(Math.min(500, current + 100));
  const [explanation, setExplanation] = useState(
    "Хочу сходить с друзьями ещё раз на этой неделе — планирую заранее.",
  );
  const [errors, setErrors] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const { haptic } = useTwa();

  useBackAction(onBack);

  const submit = async () => {
    const local = validateRuleChange(current, proposed, explanation);
    if (local.length) {
      setErrors(local);
      haptic("error");
      return;
    }
    setLoading(true);
    try {
      const res = await createRuleRequest(proposed, explanation);
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
      <h1 className="screen-title">Другое правило</h1>
      <div className="card">
        <h2 style={{ margin: "0 0 12px", fontSize: "1rem" }}>
          Предложение семье
        </h2>
        <p style={{ color: "var(--fb-hint)", fontSize: "0.875rem" }}>
          Сейчас{" "}
          <span style={{ textDecoration: "line-through" }}>
            {formatRub(current)}
          </span>{" "}
          на развлечения в неделю
        </p>

        <div className="slider-row" style={{ marginTop: 16 }}>
          <label>
            <span>Сколько на развлечения</span>
            <strong>{formatRub(proposed)}</strong>
          </label>
          <input
            type="range"
            min={100}
            max={800}
            step={50}
            value={proposed}
            onChange={(e) => setProposed(Number(e.target.value))}
          />
        </div>

        <label style={{ display: "block", marginBottom: 8, fontSize: "0.875rem" }}>
          Зачем тебе это
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
        Родитель увидит у себя, когда зайдёт в бот.
      </p>
    </div>
  );
}
