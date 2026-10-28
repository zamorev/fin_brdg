import { useState } from "react";
import {
  UNPLANNED_OPTIONS,
  UNPLANNED_TICKET,
  type UnplannedChoice,
} from "../domain/budget";
import { submitUnplanned } from "../api/client";
import { MainAction } from "../components/MainAction";
import { useBackAction } from "../components/useBackAction";
import { useTwa } from "../twa/TwaProvider";
import type { SessionUser } from "../domain/types";

type Props = {
  user: SessionUser;
  onBack: () => void;
  onContinue: (
    choice: UnplannedChoice,
    user: SessionUser,
    before: SessionUser["family"]["allocation"],
  ) => void;
};

export function UnplannedPurchase({ user, onBack, onContinue }: Props) {
  const { haptic } = useTwa();
  const [choice, setChoice] = useState<UnplannedChoice>("entertainment");
  const [loading, setLoading] = useState(false);

  useBackAction(onBack);

  const onSubmit = async () => {
    setLoading(true);
    try {
      const before = { ...user.family.allocation };
      const res = await submitUnplanned(choice);
      haptic("success");
      onContinue(choice, res.user, before);
    } catch {
      haptic("error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-shell">
      <h1 className="screen-title">Незапланированная покупка</h1>
      <div className="card">
        <p className="screen-sub" style={{ marginBottom: 8 }}>
          Друг зовёт тебя в кино сегодня вечером.
        </p>
        <p style={{ fontSize: "1.25rem", fontWeight: 700, margin: "0 0 8px" }}>
          Билет: {UNPLANNED_TICKET} ₽
        </p>
        <p style={{ color: "var(--fb-hint)", margin: "0 0 4px" }}>
          Откуда возьмёшь деньги?
        </p>

        <div className="radio-list">
          {UNPLANNED_OPTIONS.map((opt) => (
            <label className="radio-item" key={opt.id}>
              <input
                type="radio"
                name="unplanned"
                checked={choice === opt.id}
                onChange={() => setChoice(opt.id)}
              />
              <span>{opt.label}</span>
            </label>
          ))}
        </div>

        <MainAction
          text="Посмотреть последствия"
          enabled={!loading}
          onClick={() => void onSubmit()}
        />
      </div>
      <p className="hint-footer">
        Здесь нет оценки «хорошо» или «плохо» — только то, что произойдёт с
        твоим бюджетом дальше.
      </p>
    </div>
  );
}
