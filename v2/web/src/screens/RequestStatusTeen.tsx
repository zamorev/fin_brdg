import { formatRub } from "../domain/budget";
import type { SessionUser } from "../domain/types";
import { MainAction } from "../components/MainAction";
import { useBackAction } from "../components/useBackAction";

type Props = {
  user: SessionUser;
  onBack: () => void;
};

export function RequestStatusTeen({ user, onBack }: Props) {
  const req = user.activeRequest;
  useBackAction(onBack);

  if (!req) {
    return (
      <div className="app-shell">
        <p className="screen-sub">Сейчас ничего не обсуждается.</p>
        <MainAction text="На главную" onClick={onBack} />
      </div>
    );
  }

  const approved = req.status === "approved";
  const rejected = req.status === "rejected";
  const clarify = req.status === "needs_clarification";

  const headline = approved
    ? "На неделю договорились"
    : rejected
      ? "Не сейчас"
      : clarify
        ? "Расскажи ещё"
        : "Ждём ответа семьи";

  const subline = approved
    ? "Правило обновилось — смотри ниже"
    : rejected
      ? "Можно обсудить снова после следующего квеста"
      : clarify
        ? "Родитель попросил подробнее — попробуй сформулировать иначе"
        : "Когда родитель ответит, увидишь здесь";

  return (
    <div className="app-shell">
      <h1 className="screen-title">Твоё предложение</h1>
      <div className="card">
        <div style={{ textAlign: "center", marginBottom: 12 }}>
          <span
            style={{
              display: "inline-grid",
              placeItems: "center",
              width: 48,
              height: 48,
              borderRadius: "50%",
              background: approved
                ? "rgb(86 186 138 / 0.15)"
                : rejected
                  ? "rgb(239 68 68 / 0.12)"
                  : "rgb(251 191 36 / 0.15)",
              color: approved
                ? "var(--fb-success)"
                : rejected
                  ? "var(--fb-danger, #f87171)"
                  : "var(--fb-warning)",
            }}
          >
            {approved ? "✓" : rejected ? "×" : "…"}
          </span>
        </div>
        <h2 style={{ textAlign: "center", margin: 0, fontSize: "1.0625rem" }}>
          {headline}
        </h2>
        <p
          style={{
            textAlign: "center",
            color: "var(--fb-hint)",
            fontSize: "0.875rem",
          }}
        >
          {subline}
        </p>

        <div className="compare">
          <div>
            <div style={{ color: "var(--fb-hint)", fontSize: "0.75rem" }}>Было</div>
            <div className="compare-old">{formatRub(req.currentAmount)}</div>
          </div>
          <span style={{ color: "var(--fb-hint)" }}>→</span>
          <div>
            <div style={{ color: "var(--fb-hint)", fontSize: "0.75rem" }}>Стало</div>
            <div className="compare-new">{formatRub(req.proposedAmount)}</div>
          </div>
        </div>

        {req.parentComment && (
          <div className="card" style={{ background: "rgb(0 0 0 / 0.2)" }}>
            <div style={{ color: "var(--fb-hint)", fontSize: "0.75rem" }}>
              Слова родителя
            </div>
            <p style={{ margin: "8px 0 0" }}>«{req.parentComment}»</p>
          </div>
        )}
      </div>

      {approved && (
        <>
          <h3 style={{ margin: "16px 0 8px" }}>Твои правила теперь</h3>
          <div className="card">
            <div className="row-between">
              <span>Развлечения</span>
              <strong>{formatRub(user.family.allocation.entertainment)} в неделю</strong>
            </div>
            <div className="row-between" style={{ marginTop: 12 }}>
              <span>Накопления на цель</span>
              <strong>{formatRub(user.family.allocation.savings)} в неделю</strong>
            </div>
            <div className="row-between" style={{ marginTop: 12 }}>
              <span>Резерв</span>
              <strong>{formatRub(user.family.allocation.reserve)} в неделю</strong>
            </div>
          </div>
        </>
      )}

      <p className="hint-footer">
        Вы в одной истории — ответ виден и тебе, и родителю в боте.
      </p>

      <MainAction text="Вернуться на главную" onClick={onBack} />
    </div>
  );
}
