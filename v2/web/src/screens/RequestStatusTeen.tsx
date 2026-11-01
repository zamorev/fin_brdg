import { CATEGORY_LABELS, CATEGORY_ORDER, formatRub, type CategoryKey } from "../domain/budget";
import { selfWeeklyBudget } from "../domain/memberBudget";
import { requestSubject } from "../domain/parentView";
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
  const weekly = req.category === "weekly_budget";
  const categoryChange = req.category === "category_change";
  // Что показать в «Твои правила теперь»: по категории — все пять, иначе как раньше.
  const ruleKeys: CategoryKey[] = categoryChange ? CATEGORY_ORDER : ["entertainment", "savings", "reserve"];
  const finalAmount = approved ? req.finalAmount ?? req.proposedAmount : req.proposedAmount;
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
    ? weekly
      ? "Прибавка легла в резерв — можешь переложить её в квесте «Неделя»"
      : categoryChange
        ? "Договорённость обновилась — смотри ниже"
        : "Правило обновилось — смотри ниже"
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

        <div style={{ textAlign: "center", color: "var(--fb-hint)", fontSize: "0.8125rem" }}>
          {requestSubject(req)}
        </div>
        <div className="compare">
          <div>
            <div style={{ color: "var(--fb-hint)", fontSize: "0.75rem" }}>Было</div>
            <div className="compare-old">{formatRub(req.currentAmount)}</div>
          </div>
          <span style={{ color: "var(--fb-hint)" }}>→</span>
          <div>
            <div style={{ color: "var(--fb-hint)", fontSize: "0.75rem" }}>Стало</div>
            <div className="compare-new">{formatRub(finalAmount)}</div>
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
            {weekly || categoryChange ? (
              <div className="row-between" style={{ marginBottom: 12 }}>
                <span>Бюджет недели</span>
                <strong>{formatRub(selfWeeklyBudget(user))}</strong>
              </div>
            ) : null}
            {ruleKeys.map((k, i) => (
              <div key={k} className="row-between" style={i ? { marginTop: 12 } : undefined}>
                <span>{CATEGORY_LABELS[k]}</span>
                <strong>{formatRub(user.family.allocation[k])} в неделю</strong>
              </div>
            ))}
          </div>
        </>
      )}

      <p className="hint-footer">
        Вы в одной истории — ответ виден и тебе, и родителю в приложении.
      </p>

      <MainAction text="Вернуться на главную" onClick={onBack} />
    </div>
  );
}
