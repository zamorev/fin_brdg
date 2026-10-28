import { useState } from "react";
import { formatRub, REQUEST_STATUS_LABELS } from "../domain/budget";
import { decideRequest } from "../api/client";
import type { DecideAction, SessionUser } from "../domain/types";
import { MainAction } from "../components/MainAction";
import { useBackAction } from "../components/useBackAction";
import { useTwa } from "../twa/TwaProvider";

type Props = {
  user: SessionUser;
  onBack: () => void;
  onDecided: (user: SessionUser) => void;
};

const DECISIONS: { id: DecideAction; label: string }[] = [
  { id: "approve_week", label: "Договориться на одну неделю" },
  { id: "reject", label: "Не сейчас" },
  { id: "needs_clarification", label: "Попросить рассказать подробнее" },
];

export function ParentRequest({ user, onBack, onDecided }: Props) {
  const req = user.activeRequest;
  const [action, setAction] = useState<DecideAction>("approve_week");
  const [comment, setComment] = useState(
    "Давай попробуем на одну неделю. После обсудим, как получилось.",
  );
  const [loading, setLoading] = useState(false);
  const { haptic } = useTwa();

  useBackAction(onBack);

  if (!req) {
    return (
      <div className="app-shell">
        <p className="screen-sub">Пока ничего нового — когда предложат правило, увидишь здесь.</p>
        <MainAction text="Закрыть" onClick={onBack} />
      </div>
    );
  }

  const submit = async () => {
    setLoading(true);
    try {
      const res = await decideRequest(req.id, action, comment);
      haptic("success");
      onDecided(res.user);
    } catch {
      haptic("error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-shell">
      <div className="row-between" style={{ marginBottom: 8 }}>
        <h1 className="screen-title" style={{ margin: 0 }}>
          Предложение подростка
        </h1>
        <span style={{ color: "var(--fb-link)", fontSize: "0.8125rem" }}>
          • Родитель
        </span>
      </div>

      <div className="card">
        <h2 style={{ margin: "0 0 8px", fontSize: "1rem" }}>
          Развлечения — бюджет в неделю
        </h2>
        <span className="badge">{REQUEST_STATUS_LABELS[req.status]}</span>

        <div className="row-between" style={{ margin: "16px 0" }}>
          <span>Сейчас {formatRub(req.currentAmount)}</span>
          <span>→</span>
          <strong style={{ color: "var(--fb-success)" }}>
            Предложение {formatRub(req.proposedAmount)}
          </strong>
        </div>

        <p style={{ fontWeight: 600, marginBottom: 4 }}>Из квестов</p>
        <ul className="checklist">
          <li>Бюджет на неделю распланирован</li>
          <li>Обязательные расходы учтены</li>
          <li>Накопления и резерв сохранены в учебном сценарии</li>
          <li>Есть объяснение, зачем менять лимит</li>
        </ul>
        <div className="chips">
          <span className="chip">Планирование бюджета</span>
          <span className="chip">Приоритизация расходов</span>
        </div>

        <p style={{ fontWeight: 600, margin: "16px 0 8px" }}>Твоё слово</p>
        <div className="radio-list">
          {DECISIONS.map((d) => (
            <label className="radio-item" key={d.id}>
              <input
                type="radio"
                name="decision"
                checked={action === d.id}
                onChange={() => setAction(d.id)}
              />
              <span>{d.label}</span>
            </label>
          ))}
        </div>

        <label style={{ display: "block", marginBottom: 8, fontSize: "0.875rem" }}>
          Слово семье
        </label>
        <textarea
          className="textarea"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
        />

        <MainAction
          text="Ответить"
          enabled={!loading}
          onClick={() => void submit()}
        />
      </div>
    </div>
  );
}
