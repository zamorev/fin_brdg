import { useState } from "react";
import { CATEGORY_LABELS, formatRub, type Allocation, type CategoryKey } from "../domain/budget";
import { answerScenarioRun } from "../api/client";
import { MainAction } from "../components/MainAction";
import { useBackAction } from "../components/useBackAction";
import { useTwa } from "../twa/TwaProvider";
import type { ScenarioStep, SessionUser } from "../domain/types";

type Props = {
  step: ScenarioStep;
  onBack: () => void;
  onAnswered: (user: SessionUser, summary: AnswerSummary | null) => void;
};

export type AnswerSummary = {
  allocationBefore: Allocation;
  allocationAfter: Allocation;
  completed: boolean;
  nextPendingReadyAt: string | null;
};

export function ScenarioStepScreen({ step, onBack, onAnswered }: Props) {
  const { haptic } = useTwa();
  const [loading, setLoading] = useState(false);

  useBackAction(onBack);

  const submit = async (optionId: string) => {
    setLoading(true);
    try {
      const res = await answerScenarioRun(step.runId, optionId);
      haptic("success");
      const summary: AnswerSummary | null =
        res.effectsApplied.length > 0 || res.nextPendingReadyAt || res.completed
          ? {
              allocationBefore: res.allocationBefore,
              allocationAfter: res.allocationAfter,
              completed: res.completed,
              nextPendingReadyAt: res.nextPendingReadyAt,
            }
          : null;
      onAnswered(res.user, summary);
    } catch {
      haptic("error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-shell">
      <h1 className="screen-title">{step.scenarioTitle}</h1>
      <div className="card">
        <p className="screen-sub" style={{ whiteSpace: "pre-line", marginBottom: 16 }}>
          {step.prompt}
        </p>
        <div className="radio-list">
          {step.options.map((opt) => (
            <button
              key={opt.id}
              type="button"
              className="radio-item"
              style={{
                width: "100%",
                textAlign: "left",
                border: "none",
                background: "transparent",
                cursor: loading ? "wait" : "pointer",
              }}
              disabled={loading}
              onClick={() => void submit(opt.id)}
            >
              <span>{opt.label}</span>
            </button>
          ))}
        </div>
      </div>
      <p className="hint-footer">
        Здесь нет оценки «хорошо» или «плохо» — только то, что произойдёт с учебным
        бюджетом.
      </p>
    </div>
  );
}

type OutcomeProps = {
  user: SessionUser;
  before: Allocation;
  after: Allocation;
  completed: boolean;
  nextPendingReadyAt: string | null;
  onDone: () => void;
};

export function ScenarioOutcome({
  before,
  after,
  completed,
  nextPendingReadyAt,
  onDone,
}: OutcomeProps) {
  useBackAction(onDone);

  const lines = spendLines(before, after);

  return (
    <div className="app-shell">
      <h1 className="screen-title">Что это значит</h1>
      <div className="card">
        {lines.length > 0 ? (
          <ul style={{ margin: "0 0 12px", paddingLeft: 20 }}>
            {lines.map((line) => (
              <li key={line} style={{ marginBottom: 6 }}>
                {line}
              </li>
            ))}
          </ul>
        ) : (
          <p className="screen-sub">Бюджет на неделю пока без изменений.</p>
        )}
        {nextPendingReadyAt ? (
          <p style={{ color: "var(--fb-hint)", margin: "12px 0 0" }}>
            Следующий шаг откроется около{" "}
            {new Date(nextPendingReadyAt).toLocaleString("ru-RU", {
              hour: "2-digit",
              minute: "2-digit",
              day: "numeric",
              month: "short",
            })}
            . Мы напомним в Telegram.
          </p>
        ) : null}
        {completed ? (
          <p style={{ margin: "12px 0 0" }}>Сценарий завершён — можно обсудить с семьёй.</p>
        ) : null}
        <MainAction text="На главную" onClick={onDone} />
      </div>
    </div>
  );
}

function spendLines(before: Allocation, after: Allocation): string[] {
  const keys: CategoryKey[] = [
    "transport",
    "food",
    "entertainment",
    "savings",
    "reserve",
  ];
  const lines: string[] = [];
  for (const key of keys) {
    const diff = before[key] - after[key];
    if (diff > 0) {
      lines.push(`${CATEGORY_LABELS[key]}: ${formatRub(before[key])} → ${formatRub(after[key])}`);
    }
  }
  return lines;
}

export function ScenarioStepMainButton({
  visible,
  onOpen,
}: {
  visible: boolean;
  onOpen: () => void;
}) {
  if (!visible) return null;
  return <MainAction text="Ответить" visible={false} onClick={onOpen} />;
}
