import { formatRub, REQUEST_STATUS_LABELS } from "../domain/budget";
import { selfWeeklyBudget } from "../domain/memberBudget";
import type { SessionUser } from "../domain/types";
import { startScenario } from "../api/client";
import { FamilyWeeklyBudgetSection } from "../components/FamilyWeeklyBudgetSection";
import { MainAction } from "../components/MainAction";
import { useState } from "react";

const CINEMA_SCENARIO_ID = "cinema_chain_v1";

type Props = {
  user: SessionUser;
  onStartQuest: () => void;
  onOpenAgreements: () => void;
  onOpenRequest: () => void;
  onOpenFamily: () => void;
  onOpenScenarioStep: () => void;
  onScenarioStarted: (user: SessionUser) => void;
};

export function TeenHome({
  user,
  onStartQuest,
  onOpenAgreements,
  onOpenRequest,
  onOpenFamily,
  onOpenScenarioStep,
  onScenarioStarted,
}: Props) {
  const req = user.activeRequest;
  const entertainment = user.family.allocation.entertainment;
  const myWeeklyBudget = selfWeeklyBudget(user);
  const activeStep = user.activeScenarioStep ?? null;
  const pendingStep = user.pendingScenarioStep ?? null;
  const [startingScenario, setStartingScenario] = useState(false);

  const startCinemaScenario = async () => {
    setStartingScenario(true);
    try {
      const res = await startScenario(CINEMA_SCENARIO_ID);
      onScenarioStarted(res.user);
    } finally {
      setStartingScenario(false);
    }
  };

  return (
    <div className="app-shell">
      <div className="row-between" style={{ marginBottom: 16 }}>
        <strong style={{ fontSize: "1.125rem" }}>Level Up</strong>
        <span style={{ color: "var(--fb-hint)", fontSize: "0.875rem" }}>
          • {user.displayName}, подросток
        </span>
      </div>

      <div className="card">
        <div className="progress-ring-wrap">
          <svg className="progress-ring" viewBox="0 0 120 120" aria-hidden>
            <circle
              cx="60"
              cy="60"
              r="52"
              fill="none"
              stroke="rgb(255 255 255 / 0.08)"
              strokeWidth="10"
            />
            <circle
              cx="60"
              cy="60"
              r="52"
              fill="none"
              stroke="var(--fb-accent)"
              strokeWidth="10"
              strokeLinecap="round"
              strokeDasharray={`${0.72 * 327} 327`}
              transform="rotate(-90 60 60)"
            />
            <text x="60" y="58" textAnchor="middle" fontSize="28" fontWeight="700">
              {user.family.level}
            </text>
            <text x="60" y="78" textAnchor="middle" fontSize="11" fill="var(--fb-hint)">
              уровень
            </text>
          </svg>
          <span style={{ color: "var(--fb-accent)", fontSize: "0.875rem" }}>
            {user.family.xpToNext} XP до уровня {user.family.level + 1}
          </span>
        </div>
        <div
          style={{
            borderTop: "1px solid rgb(255 255 255 / 0.06)",
            paddingTop: 16,
          }}
        >
          <div style={{ color: "var(--fb-hint)", fontSize: "0.875rem" }}>
            бюджет на эту неделю
          </div>
          <div style={{ fontSize: "2rem", fontWeight: 700, marginTop: 4 }}>
            {formatRub(myWeeklyBudget)}
          </div>
        </div>
      </div>

      <h2 style={{ fontSize: "1.125rem", margin: "20px 0 8px" }}>Задания</h2>

      <div className="card task-list task-list--tap">
        <button type="button" className="task-row" onClick={onStartQuest}>
          <span className="task-icon">💼</span>
          <span>
            <div className="task-title">Неделя на 1 500 ₽</div>
            <div className="task-sub">
              Разложи бюджет по категориям, 5 минут
            </div>
          </span>
          <span className="inline-action">
            {user.family.questWeekBudgetCompleted ? "Снова" : "Начать"}
          </span>
        </button>

        {activeStep ? (
          <button type="button" className="task-row" onClick={onOpenScenarioStep}>
            <span className="task-icon">🎬</span>
            <span>
              <div className="task-title">{activeStep.scenarioTitle}</div>
              <div className="task-sub">Нужен твой ответ</div>
            </span>
            <span className="badge">Новое</span>
          </button>
        ) : pendingStep ? (
          <div className="task-row" style={{ cursor: "default" }}>
            <span className="task-icon">🎬</span>
            <span>
              <div className="task-title">{pendingStep.scenarioTitle}</div>
              <div className="task-sub">
                Следующий шаг около{" "}
                {new Date(pendingStep.readyAt).toLocaleString("ru-RU", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </div>
            </span>
          </div>
        ) : user.family.questWeekBudgetCompleted ? (
          <button
            type="button"
            className="task-row"
            disabled={startingScenario}
            onClick={() => void startCinemaScenario()}
          >
            <span className="task-icon">🎬</span>
            <span>
              <div className="task-title">Ой, кино</div>
              <div className="task-sub">Сюрпризная трата — цепочка решений</div>
            </span>
            <span className="inline-action">{startingScenario ? "…" : "Начать"}</span>
          </button>
        ) : null}

        {req && (
          <button type="button" className="task-row" onClick={onOpenRequest}>
            <span className="task-icon">⏳</span>
            <span>
              <div className="task-title">
                Развлечения: {req.currentAmount} → {req.proposedAmount} ₽
              </div>
              <div className="task-sub">Ждём ответа семьи</div>
            </span>
            <span className="badge">{REQUEST_STATUS_LABELS[req.status]}</span>
          </button>
        )}
      </div>

      <FamilyWeeklyBudgetSection members={user.members} />

      <div className="card task-list task-list--tap">
        <button type="button" className="task-row" onClick={onOpenFamily}>
          <span className="task-icon" style={{ background: "rgb(59 130 246 / 0.12)" }}>
            👨‍👩‍👧
          </span>
          <span>
            <div className="task-title">Семья</div>
            <div className="task-sub">
              {user.family.memberCounts.parents} родит.
              {user.family.memberCounts.teens > 1
                ? ` · ${user.family.memberCounts.teens} подростков`
                : ""}
              · пригласить
            </div>
          </span>
        </button>

        <button type="button" className="task-row" onClick={onOpenAgreements}>
          <span className="task-icon" style={{ background: "rgb(86 186 138 / 0.12)" }}>
            ✓
          </span>
          <span>
            <div className="task-title">Мои договорённости</div>
            <div className="task-sub">
              Развлечения {entertainment} ₽ · резерв {user.family.allocation.reserve} ₽
            </div>
          </span>
        </button>
      </div>
    </div>
  );
}

export function TeenHomeMainButton({
  visible,
  onStart,
}: {
  visible: boolean;
  onStart: () => void;
}) {
  if (!visible) return null;
  return <MainAction text="Начать квест" visible={false} onClick={onStart} />;
}
