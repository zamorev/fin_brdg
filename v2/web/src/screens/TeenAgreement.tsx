import { useCallback, useEffect, useRef, useState } from "react";
import {
  CATEGORY_LABELS,
  CATEGORY_MINIMUMS,
  CATEGORY_ORDER,
  formatRub,
  reserveSpare,
  type Allocation,
  type CategoryKey,
} from "../domain/budget";
import { memberWeeklyBudget } from "../domain/memberBudget";
import {
  budgetBalance,
  pendingRequest,
  plural,
  questsDone,
  requestSubject,
  requestTeen,
} from "../domain/parentView";
import type { SessionUser } from "../domain/types";
import { updateTeenAgreement } from "../api/client";
import { useBackAction } from "../components/useBackAction";
import { BackLink } from "../components/BackLink";
import { MemberAvatar } from "../components/MemberAvatar";
import { CategorySheet } from "../components/CategorySheet";
import { AlertIcon, CheckIcon, ChevronRight } from "../components/ParentIcons";
import { useTwa } from "../twa/TwaProvider";

type Props = {
  user: SessionUser;
  teenTelegramId: number;
  onBack: () => void;
  onOpenRequests: () => void;
  onSaved: (user: SessionUser) => void;
};

const BUDGET_STEP = 100;
const SAVE_DEBOUNCE_MS = 800;

// Цвет категории в полосе и в иконке строки.
const CATEGORY_COLORS: Record<CategoryKey, string> = {
  transport: "#5b9bff",
  food: "#2fb872",
  entertainment: "#e0a82a",
  savings: "#b866d6",
  reserve: "#9a9aa0",
};

type Draft = { allocation: Allocation; weeklyBudget: number };

/** Экран 3 — договорённость с подростком: бюджет недели и категории. */
export function TeenAgreement({ user, teenTelegramId, onBack, onOpenRequests, onSaved }: Props) {
  const teen = user.members.find((m) => m.telegramId === teenTelegramId) ?? null;
  const server: Draft = {
    allocation: user.family.allocation,
    weeklyBudget: teen ? memberWeeklyBudget(teen) : 0,
  };
  const [draft, setDraft] = useState<Draft>(server);
  const [sheet, setSheet] = useState<CategoryKey | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const saveTimer = useRef<number | null>(null);
  const { haptic } = useTwa();

  // Новая сессия с сервера (после сохранения или перезапроса) — сбросить черновик.
  useEffect(() => {
    setDraft({ allocation: user.family.allocation, weeklyBudget: server.weeklyBudget });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 3000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => () => {
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
  }, []);

  const closeSheet = useCallback(() => setSheet(null), []);
  useBackAction(sheet ? closeSheet : onBack);

  const save = useCallback(
    async (next: Draft) => {
      try {
        const res = await updateTeenAgreement(teenTelegramId, next.allocation, next.weeklyBudget);
        haptic("success");
        onSaved(res.user);
      } catch (e) {
        setDraft({ allocation: user.family.allocation, weeklyBudget: server.weeklyBudget });
        setToast(e instanceof Error ? e.message : "Не получилось сохранить. Попробуй ещё раз");
        haptic("error");
        throw e;
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [teenTelegramId, user, onSaved, haptic],
  );

  if (!teen) {
    return (
      <div className="app-shell">
        <BackLink onClick={onBack} />
        <p className="screen-sub">Подросток не найден в семье.</p>
      </div>
    );
  }

  // −/+ бюджета двигают резерв: так сумма категорий всегда равна бюджету.
  const stepBudget = (sign: 1 | -1) => {
    haptic("light");
    const next: Draft = {
      weeklyBudget: draft.weeklyBudget + sign * BUDGET_STEP,
      allocation: { ...draft.allocation, reserve: draft.allocation.reserve + sign * BUDGET_STEP },
    };
    setDraft(next);
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => void save(next).catch(() => {}), SAVE_DEBOUNCE_MS);
  };

  const { allocated, unallocated } = budgetBalance(draft.allocation, draft.weeklyBudget);
  const denom = Math.max(draft.weeklyBudget, allocated) || 1;
  const req = pendingRequest(user);
  const teenReq = req && requestTeen(user, req)?.telegramId === teen.telegramId ? req : null;
  const quests = questsDone(user.family);

  return (
    <div className="app-shell">
      <BackLink onClick={onBack} />

      <div className="pv-teen-head" style={{ marginTop: 8 }}>
        <MemberAvatar member={teen} size={56} initials />
        <span style={{ display: "flex", flexDirection: "column", gap: 3 }}>
          <h1>{teen.displayName}</h1>
          <span className="pv-role">
            {user.family.level} уровень · {quests} {plural(quests, "квест пройден", "квеста пройдено", "квестов пройдено")}
          </span>
        </span>
      </div>

      {teenReq ? (
        <button type="button" className="pv-banner" onClick={onOpenRequests}>
          <span className="pv-row__body">
            <span className="pv-tone-warn" style={{ fontSize: "0.8125rem", fontWeight: 600 }}>Новый запрос</span>
            <span style={{ fontWeight: 600 }}>
              {requestSubject(teenReq)}: {teenReq.currentAmount.toLocaleString("ru-RU")} → {formatRub(teenReq.proposedAmount)}
            </span>
          </span>
          <span className="pv-banner__cta">Рассмотреть</span>
        </button>
      ) : null}

      <section className="pv-card pv-card--pad pv-budget">
        <div className="row-between">
          <span style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span className="pv-role">Бюджет на неделю</span>
            <span className="pv-big">{formatRub(draft.weeklyBudget)}</span>
          </span>
          <span style={{ display: "flex", gap: 8 }}>
            <button
              type="button"
              className="pv-round"
              aria-label={`Уменьшить на ${BUDGET_STEP} ₽`}
              disabled={reserveSpare(draft.allocation) < BUDGET_STEP}
              onClick={() => stepBudget(-1)}
            >
              −
            </button>
            <button type="button" className="pv-round" aria-label={`Увеличить на ${BUDGET_STEP} ₽`} onClick={() => stepBudget(1)}>
              +
            </button>
          </span>
        </div>
        <div className={`pv-bar${unallocated < 0 ? " pv-bar--over" : ""}`}>
          {CATEGORY_ORDER.filter((k) => draft.allocation[k] > 0).map((k) => (
            <span key={k} style={{ width: `${(draft.allocation[k] / denom) * 100}%`, background: CATEGORY_COLORS[k] }} />
          ))}
        </div>
        <BalanceLine allocated={allocated} unallocated={unallocated} />
        <span className="pv-row__sub">−/+ меняют резерв; резерв не опускается ниже {formatRub(CATEGORY_MINIMUMS.reserve ?? 0)}</span>
      </section>

      <section className="pv-section">
        <div className="pv-section-head">
          <h2>Категории</h2>
          <span className="pv-role" style={{ fontSize: "0.875rem" }}>в неделю</span>
        </div>
        <div className="pv-card">
          {CATEGORY_ORDER.map((k) => {
            const min = CATEGORY_MINIMUMS[k];
            const color = CATEGORY_COLORS[k];
            return (
              <button key={k} type="button" className="pv-row" onClick={() => setSheet(k)}>
                <span className="pv-dot-tile" style={{ background: `color-mix(in srgb, ${color} 18%, transparent)` }}>
                  <span className="pv-dot" style={{ background: color }} />
                </span>
                <span className="pv-row__body">
                  <span className="pv-row__title" style={{ fontSize: "1rem" }}>{CATEGORY_LABELS[k]}</span>
                  <span className="pv-row__sub">
                    {min ? `мин. ${formatRub(min)}` : "без минимума"}
                    {k === "reserve" ? " · на срочные покупки" : ""}
                  </span>
                </span>
                <span className="pv-amount" style={{ fontSize: "1.0625rem" }}>{formatRub(draft.allocation[k])}</span>
                <ChevronRight />
              </button>
            );
          })}
        </div>
        <p className="pv-hint">Суммы — из плана подростка. Нажми на категорию, чтобы поменять её вместе с ним.</p>
      </section>

      {sheet ? (
        <CategorySheet
          category={sheet}
          allocation={draft.allocation}
          weeklyBudget={draft.weeklyBudget}
          teenName={teen.displayName}
          onClose={closeSheet}
          onSave={async (next) => {
            setDraft(next);
            try {
              await save(next);
              setSheet(null);
            } catch {
              // тост уже показан, шторка остаётся открытой
            }
          }}
        />
      ) : null}

      {toast ? <div className="pv-toast" role="status">{toast}</div> : null}
    </div>
  );
}

function BalanceLine({ allocated, unallocated }: { allocated: number; unallocated: number }) {
  if (unallocated === 0) {
    return (
      <span className="pv-note pv-tone-ok">
        <CheckIcon /> Распределено всё: {formatRub(allocated)}
      </span>
    );
  }
  if (unallocated > 0) {
    return (
      <span className="pv-note pv-tone-warn">
        <AlertIcon /> Не распределено {formatRub(unallocated)}
      </span>
    );
  }
  return (
    <span className="pv-note pv-tone-danger">
      <AlertIcon /> Категории больше бюджета на {formatRub(-unallocated)}
    </span>
  );
}
