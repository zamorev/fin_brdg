import { useCallback, useEffect, useRef, useState } from "react";
import {
  CATEGORY_MINIMUMS,
  formatRub,
  reserveSpare,
  type Allocation,
  type CategoryKey,
} from "../domain/budget";
import { memberWeeklyBudget } from "../domain/memberBudget";
import {
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
import { BudgetCard, CategoryList } from "../components/AgreementBlocks";
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

      <BudgetCard
        allocation={draft.allocation}
        weeklyBudget={draft.weeklyBudget}
        hint={`−/+ меняют резерв; резерв не опускается ниже ${formatRub(CATEGORY_MINIMUMS.reserve ?? 0)}`}
        actions={
          <>
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
          </>
        }
      />

      <CategoryList
        allocation={draft.allocation}
        onSelect={setSheet}
        hint="Суммы — из плана подростка. Нажми на категорию, чтобы поменять её вместе с ним."
      />

      {sheet ? (
        <CategorySheet
          mode="edit"
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
