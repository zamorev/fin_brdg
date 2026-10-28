import { formatRub, REQUEST_STATUS_LABELS } from "../domain/budget";
import type { SessionUser } from "../domain/types";
import { MainAction } from "../components/MainAction";

type Props = {
  user: SessionUser;
  onDone: () => void;
  onViewStatus: () => void;
};

export function RequestSent({ user, onDone, onViewStatus }: Props) {
  const req = user.activeRequest;
  if (!req) return null;

  return (
    <div className="app-shell" style={{ textAlign: "center" }}>
      <div
        style={{
          width: 56,
          height: 56,
          borderRadius: "50%",
          background: "rgb(86 186 138 / 0.15)",
          color: "var(--fb-success)",
          display: "grid",
          placeItems: "center",
          margin: "24px auto 16px",
          fontSize: "1.5rem",
        }}
      >
        ✓
      </div>
      <h1 className="screen-title">Показали родителю</h1>
      <p className="screen-sub">
        Родитель увидит это у себя в боте, когда зайдёт.
      </p>

      <div className="card" style={{ textAlign: "left" }}>
        <div style={{ color: "var(--fb-hint)", fontSize: "0.8125rem" }}>
          Развлечения в неделю
        </div>
        <div className="compare" style={{ margin: "12px 0" }}>
          <span className="compare-old">{formatRub(req.currentAmount)}</span>
          <strong>{formatRub(req.proposedAmount)}</strong>
        </div>
        <div style={{ textAlign: "center" }}>
          <span className="badge">{REQUEST_STATUS_LABELS[req.status]}</span>
        </div>
      </div>

      <MainAction text="Готово" onClick={onDone} />
      <button type="button" className="text-link" onClick={onViewStatus}>
        Посмотреть ответ
      </button>
    </div>
  );
}
