import { buildConsequence, formatRub, type UnplannedChoice } from "../domain/budget";
import type { SessionUser } from "../domain/types";
import { MainAction } from "../components/MainAction";
import { useBackAction } from "../components/useBackAction";

type Props = {
  user: SessionUser;
  choice: UnplannedChoice;
  onBack: () => void;
  onNext: () => void;
};

export function Consequences({ user, choice, onBack, onNext }: Props) {
  const view = buildConsequence(choice, user.family.allocation);
  useBackAction(onBack);

  const pct =
    view.entertainmentBefore > 0
      ? (view.entertainmentAfter / view.entertainmentBefore) * 100
      : 0;

  return (
    <div className="app-shell">
      <h1 className="screen-title">Что это значит</h1>
      <div className="card">
        <div style={{ textAlign: "center", marginBottom: 12 }}>
          <span
            style={{
              display: "inline-grid",
              placeItems: "center",
              width: 48,
              height: 48,
              borderRadius: "50%",
              background: "rgb(86 186 138 / 0.15)",
              color: "var(--fb-success)",
              fontSize: "1.25rem",
            }}
          >
            ✓
          </span>
        </div>
        <h2 style={{ textAlign: "center", margin: "0 0 8px", fontSize: "1.125rem" }}>
          {view.title}
        </h2>
        <p className="screen-sub" style={{ textAlign: "center" }}>
          {view.body}
        </p>

        <div style={{ marginTop: 16 }}>
          <div className="row-between">
            <span>Развлечения</span>
            <span>
              <span style={{ textDecoration: "line-through", color: "var(--fb-hint)" }}>
                {formatRub(view.entertainmentBefore)}
              </span>{" "}
              <strong>{formatRub(view.entertainmentAfter)} осталось</strong>
            </span>
          </div>
          <div
            style={{
              height: 8,
              borderRadius: 999,
              background: "rgb(255 255 255 / 0.08)",
              marginTop: 8,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                width: `${pct}%`,
                height: "100%",
                background: "var(--fb-success)",
              }}
            />
          </div>
        </div>

        <ul className="checklist" style={{ marginTop: 16 }}>
          <li>
            Накопления на цель —{" "}
            {view.savingsUntouched ? "без изменений" : "изменились"}
          </li>
          <li>Резерв — {view.reserveUntouched ? "без изменений" : "изменился"}</li>
        </ul>

        {view.reserveWarning && (
          <div
            className="card"
            style={{
              background: "rgb(0 0 0 / 0.2)",
              fontSize: "0.8125rem",
              color: "var(--fb-hint)",
            }}
          >
            {view.reserveWarning}
          </div>
        )}

        <MainAction text="Понятно, идём дальше" onClick={onNext} />
      </div>
    </div>
  );
}
