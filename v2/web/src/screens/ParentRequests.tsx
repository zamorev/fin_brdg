import { useEffect, useState } from "react";
import {
  BUDGET_INCREASE_MAX,
  BUDGET_INCREASE_STEP,
  CATEGORY_MINIMUMS,
  changeCategory,
  formatRub,
  validateCategoryRequest,
} from "../domain/budget";
import { memberWeeklyBudget } from "../domain/memberBudget";
import {
  categoryChangeEffect,
  formatRequestTime,
  pendingRequest,
  requestSubject,
  requestTeen,
  signedRub,
  teenName,
} from "../domain/parentView";
import type { DecideAction, RuleChangeRequest, SessionUser } from "../domain/types";
import { decideRequest } from "../api/client";
import { useBackAction } from "../components/useBackAction";
import { BackLink } from "../components/BackLink";
import { MemberAvatar } from "../components/MemberAvatar";
import { ArrowRight, CheckIcon, ClockIcon, InfoIcon } from "../components/ParentIcons";
import { useTwa } from "../twa/TwaProvider";

type Props = {
  user: SessionUser;
  onBack: () => void;
  onDecided: (user: SessionUser) => void;
};

type Mode = "idle" | "decline" | "ask" | "counter";
type Outcome = { text: string; tone: "ok" | "danger" | "link" | "warn" };

const RESULT_MS = 2000;

/** Экран 2 — запросы подростков: решение по запросу и «Недавно решено». */
export function ParentRequests({ user, onBack, onDecided }: Props) {
  const [tab, setTab] = useState<"pending" | "history">("pending");
  const [outcome, setOutcome] = useState<{ result: Outcome; next: SessionUser } | null>(null);
  useBackAction(onBack);

  // Итоговая плашка висит 2 секунды, потом карточка уходит в «Недавно решено».
  useEffect(() => {
    if (!outcome) return;
    const timer = window.setTimeout(() => {
      onDecided(outcome.next);
      setOutcome(null);
    }, RESULT_MS);
    return () => window.clearTimeout(timer);
  }, [outcome, onDecided]);

  const req = pendingRequest(user);
  const pendingCount = req ? 1 : 0;
  const decided = user.activeRequest && !req ? user.activeRequest : null;

  return (
    <div className="app-shell">
      <BackLink onClick={onBack} />
      <h1 className="screen-title" style={{ fontSize: "1.75rem", marginTop: 8, marginBottom: 6 }}>
        Запросы
      </h1>
      <p className="screen-sub">
        Подростки просят прибавку к бюджету или другую сумму в категории. Решение сразу увидят у себя в приложении.
      </p>

      <div className="pv-tabs" role="tablist">
        <button type="button" role="tab" className="pv-tab" aria-selected={tab === "pending"} onClick={() => setTab("pending")}>
          Ждут ответа{pendingCount ? ` · ${pendingCount}` : ""}
        </button>
        <button type="button" role="tab" className="pv-tab" aria-selected={tab === "history"} onClick={() => setTab("history")}>
          История
        </button>
      </div>

      {tab === "history" ? (
        <div className="pv-card pv-empty">
          <span className="pv-tone-link">
            <ClockIcon />
          </span>
          <strong>История скоро появится</strong>
          <span>Здесь будут все решения по договорённостям</span>
        </div>
      ) : (
        <>
          {req ? (
            <RequestCard
              user={user}
              req={req}
              outcome={outcome?.result ?? null}
              onResult={(result, next) => setOutcome({ result, next })}
            />
          ) : (
            <div className="pv-card pv-empty">
              <span className="pv-tone-ok" style={{ width: 48, height: 48, borderRadius: 24, display: "grid", placeItems: "center", background: "var(--fb-success-bg)" }}>
                <CheckIcon size={24} />
              </span>
              <strong>Всё решено</strong>
              <span>Новые запросы появятся здесь</span>
            </div>
          )}

          {decided ? <RecentlyDecided user={user} req={decided} /> : null}
        </>
      )}
    </div>
  );
}

function RequestCard({
  user,
  req,
  outcome,
  onResult,
}: {
  user: SessionUser;
  req: RuleChangeRequest;
  outcome: Outcome | null;
  onResult: (result: Outcome, next: SessionUser) => void;
}) {
  const teen = requestTeen(user, req);
  const name = teenName(teen);
  const weekly = req.category === "weekly_budget";
  // Запрос по категории (T28): последствия считаем от текущей договорённости.
  const categoryKey = req.category === "category_change" ? req.categoryKey ?? null : null;
  const source = req.fundingSource ?? "reserve";
  const allocation = user.family.allocation;
  const teenBudget = teen ? memberWeeklyBudget(teen) : 0;
  const delta = req.proposedAmount - req.currentAmount;
  const [mode, setMode] = useState<Mode>("idle");
  const [text, setText] = useState("");
  const [counter, setCounter] = useState(midpoint(req));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { haptic } = useTwa();

  const send = async (action: DecideAction, comment: string, result: Outcome, amount?: number) => {
    setLoading(true);
    setError(null);
    try {
      const res = await decideRequest(req.id, action, comment, amount);
      haptic(action === "reject" ? "error" : "success");
      onResult(result, res.user);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не получилось сохранить. Попробуй ещё раз");
      haptic("error");
    } finally {
      setLoading(false);
    }
  };

  const openMode = (next: Mode) => {
    setText("");
    setError(null);
    setMode(next);
  };

  return (
    <article className="pv-card pv-card--pad pv-request">
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        {teen ? <MemberAvatar member={teen} initials /> : null}
        <span className="pv-row__body">
          <span className="pv-row__title">{name}</span>
          <span className="pv-row__sub">{formatRequestTime(req.createdAt)}</span>
        </span>
        <span className="pv-chip pv-tone-warn" style={{ background: "var(--fb-accent-bg)" }}>
          {requestSubject(req)}
        </span>
      </div>

      <div className="pv-change">
        <span className="pv-change__old">{req.currentAmount.toLocaleString("ru-RU")}</span>
        <span style={{ color: "var(--fb-hint)", alignSelf: "center" }}>
          <ArrowRight />
        </span>
        <span className="pv-change__new">{formatRub(req.proposedAmount)}</span>
        <span className={`pv-change__delta ${delta >= 0 ? "pv-tone-warn" : "pv-tone-ok"}`}>
          {signedRub(delta)}/нед
        </span>
      </div>

      {req.explanation.trim() ? (
        <div className="pv-inset">
          <span className="pv-label">Почему</span>
          <span style={{ lineHeight: 1.45 }}>{req.explanation}</span>
        </div>
      ) : null}

      <div className="pv-note">
        <span className="pv-tone-link">
          <InfoIcon />
        </span>
        <span>
          {weekly
            ? `Если одобрить: бюджет ${formatRub(req.currentAmount)} → ${formatRub(req.proposedAmount)}, ${signedRub(delta)} в резерв`
            : categoryKey
              ? `Если одобрить: ${categoryChangeEffect(allocation, teenBudget, categoryKey, req.proposedAmount, source)}`
              : `Если одобрить: развлечения ${formatRub(req.currentAmount)} → ${formatRub(req.proposedAmount)}`}
        </span>
      </div>

      {outcome ? (
        <div className={`pv-result pv-tone-${outcome.tone}`} style={{ background: toneBg(outcome.tone) }}>
          {outcome.text}
        </div>
      ) : mode === "idle" ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div className="pv-actions">
            <button type="button" className="pv-btn pv-btn--muted" disabled={loading} onClick={() => openMode("decline")}>
              Отклонить
            </button>
            <button
              type="button"
              className="pv-btn pv-btn--primary"
              disabled={loading}
              onClick={() =>
                void send("approve_week", "", { text: "Одобрено", tone: "ok" })
              }
            >
              {loading ? "…" : "Одобрить"}
            </button>
          </div>
          <div className="pv-actions">
            {weekly || categoryKey ? (
              <button type="button" className="pv-btn pv-btn--text" disabled={loading} onClick={() => openMode("counter")}>
                Своя сумма
              </button>
            ) : (
              <span />
            )}
            <button type="button" className="pv-btn pv-btn--text pv-tone-warn" disabled={loading} onClick={() => openMode("ask")}>
              Расскажи ещё
            </button>
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {mode === "counter" && categoryKey ? (
            <CategoryCounter
              req={req}
              categoryKey={categoryKey}
              allocation={allocation}
              weeklyBudget={teenBudget}
              value={counter}
              onChange={(v) => {
                haptic("light");
                setCounter(v);
              }}
            />
          ) : mode === "counter" ? (
            <div className="pv-stepper">
              <button
                type="button"
                className="pv-round"
                aria-label={`Меньше на ${BUDGET_INCREASE_STEP} ₽`}
                disabled={counter - BUDGET_INCREASE_STEP <= req.currentAmount}
                onClick={() => {
                  haptic("light");
                  setCounter(counter - BUDGET_INCREASE_STEP);
                }}
              >
                −
              </button>
              <span style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
                <span style={{ fontSize: "1.75rem", fontWeight: 700 }}>{formatRub(counter)}</span>
                <span className="pv-row__sub">
                  в неделю · просит {formatRub(req.proposedAmount)}
                </span>
              </span>
              <button
                type="button"
                className="pv-round"
                aria-label={`Больше на ${BUDGET_INCREASE_STEP} ₽`}
                disabled={counter + BUDGET_INCREASE_STEP > req.currentAmount + BUDGET_INCREASE_MAX}
                onClick={() => {
                  haptic("light");
                  setCounter(counter + BUDGET_INCREASE_STEP);
                }}
              >
                +
              </button>
            </div>
          ) : (
            <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <span className="pv-row__sub">
                {mode === "ask" ? "Что уточнить?" : "Комментарий (можно не писать)"}
              </span>
              <textarea
                className="textarea"
                maxLength={200}
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder={mode === "ask" ? "На что именно нужны деньги?" : "Давай обсудим через неделю"}
              />
            </label>
          )}
          <div className="pv-actions">
            <button type="button" className="pv-btn pv-btn--text" disabled={loading} onClick={() => openMode("idle")}>
              Назад
            </button>
            <button
              type="button"
              className="pv-btn pv-btn--primary"
              disabled={
                loading ||
                (mode === "ask" && !text.trim()) ||
                (mode === "counter" &&
                  categoryKey !== null &&
                  validateCategoryRequest(allocation, teenBudget, categoryKey, counter, source, req.explanation).length > 0)
              }
              onClick={() => {
                if (mode === "decline") {
                  void send("reject", text, { text: "Отклонено — можно обсудить позже", tone: "danger" });
                } else if (mode === "ask") {
                  void send("needs_clarification", text, { text: `Попросили ${name} рассказать подробнее`, tone: "warn" });
                } else {
                  void send(
                    "approve_week",
                    "",
                    { text: `Своё предложение: ${formatRub(counter)}`, tone: "link" },
                    counter,
                  );
                }
              }}
            >
              {loading
                ? "…"
                : mode === "decline"
                  ? "Отклонить"
                  : mode === "ask"
                    ? "Отправить"
                    : `Предложить ${formatRub(counter)}`}
            </button>
          </div>
        </div>
      )}

      {error ? <div className="error-banner">{error}</div> : null}
    </article>
  );
}

function RecentlyDecided({ user, req }: { user: SessionUser; req: RuleChangeRequest }) {
  const name = teenName(requestTeen(user, req));
  const final = req.finalAmount ?? req.proposedAmount;
  const countered = req.status === "approved" && final !== req.proposedAmount;
  const status: Outcome =
    req.status === "approved"
      ? countered
        ? { text: "Своя сумма", tone: "link" }
        : { text: "Одобрено", tone: "ok" }
      : req.status === "rejected"
        ? { text: "Отклонено", tone: "danger" }
        : { text: "Попросили уточнить", tone: "warn" };
  const detail = countered
    ? `просил ${req.proposedAmount.toLocaleString("ru-RU")}, договорились на ${formatRub(final)}`
    : req.status === "approved"
      ? `${req.currentAmount.toLocaleString("ru-RU")} → ${formatRub(final)}`
      : `${req.currentAmount.toLocaleString("ru-RU")} → ${formatRub(req.proposedAmount)}`;

  return (
    <section className="pv-section">
      <div className="pv-section-head">
        <h2>Недавно решено</h2>
      </div>
      <div className="pv-card">
        <div className="pv-row" style={{ cursor: "default" }}>
          <span className="pv-row__body">
            <span className="pv-row__title" style={{ fontSize: "1rem" }}>
              {name} · {requestSubject(req)}
            </span>
            <span className="pv-row__sub" style={{ fontSize: "0.875rem" }}>{detail}</span>
            {req.parentComment ? <span className="pv-row__sub">«{req.parentComment}»</span> : null}
          </span>
          <span className={`pv-tone-${status.tone}`} style={{ fontSize: "0.875rem", fontWeight: 600 }}>
            {status.text}
          </span>
        </div>
      </div>
    </section>
  );
}

/** Середина между «было» и «просит», округлённая до шага, но не равная «было». */
function midpoint(req: RuleChangeRequest): number {
  const mid = (req.currentAmount + req.proposedAmount) / 2;
  const rounded = Math.round(mid / BUDGET_INCREASE_STEP) * BUDGET_INCREASE_STEP;
  return req.proposedAmount < req.currentAmount
    ? Math.min(req.currentAmount - BUDGET_INCREASE_STEP, rounded)
    : Math.max(req.currentAmount + BUDGET_INCREASE_STEP, rounded);
}

/** «Своя сумма» для запроса по категории (T28): степпер по сумме категории и последствия. */
function CategoryCounter({
  req,
  categoryKey,
  allocation,
  weeklyBudget,
  value,
  onChange,
}: {
  req: RuleChangeRequest;
  categoryKey: NonNullable<RuleChangeRequest["categoryKey"]>;
  allocation: SessionUser["family"]["allocation"];
  weeklyBudget: number;
  value: number;
  onChange: (value: number) => void;
}) {
  const source = req.fundingSource ?? "reserve";
  const min = CATEGORY_MINIMUMS[categoryKey] ?? 0;
  const increase = (v: number) =>
    changeCategory(allocation, weeklyBudget, categoryKey, v, source).weeklyBudget - weeklyBudget;
  const errors = validateCategoryRequest(allocation, weeklyBudget, categoryKey, value, source, req.explanation);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <div className="pv-stepper">
        <button
          type="button"
          className="pv-round"
          aria-label={`Меньше на ${BUDGET_INCREASE_STEP} ₽`}
          disabled={value - BUDGET_INCREASE_STEP < min}
          onClick={() => onChange(value - BUDGET_INCREASE_STEP)}
        >
          −
        </button>
        <span style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
          <span style={{ fontSize: "1.75rem", fontWeight: 700 }}>{formatRub(value)}</span>
          <span className="pv-row__sub">в неделю · просит {formatRub(req.proposedAmount)}</span>
        </span>
        <button
          type="button"
          className="pv-round"
          aria-label={`Больше на ${BUDGET_INCREASE_STEP} ₽`}
          disabled={increase(value + BUDGET_INCREASE_STEP) > BUDGET_INCREASE_MAX}
          onClick={() => onChange(value + BUDGET_INCREASE_STEP)}
        >
          +
        </button>
      </div>
      {errors.length ? (
        <span className="pv-note pv-tone-danger">{errors.join("; ")}</span>
      ) : (
        <span className="pv-note">{categoryChangeEffect(allocation, weeklyBudget, categoryKey, value, source)}</span>
      )}
    </div>
  );
}

function toneBg(tone: Outcome["tone"]): string {
  return {
    ok: "var(--fb-success-bg)",
    danger: "var(--fb-danger-bg)",
    link: "var(--fb-link-bg)",
    warn: "var(--fb-accent-bg)",
  }[tone];
}
