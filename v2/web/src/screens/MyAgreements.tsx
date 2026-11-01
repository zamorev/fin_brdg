import { useCallback, useState } from "react";
import { formatRub, type CategoryKey } from "../domain/budget";
import { selfWeeklyBudget } from "../domain/memberBudget";
import { pendingRequest, requestSubject } from "../domain/parentView";
import type { SessionUser } from "../domain/types";
import { createCategoryRequest } from "../api/client";
import { useBackAction } from "../components/useBackAction";
import { BackLink } from "../components/BackLink";
import { BudgetCard, CategoryList } from "../components/AgreementBlocks";
import { CategorySheet } from "../components/CategorySheet";
import { useTwa } from "../twa/TwaProvider";

type Props = {
  user: SessionUser;
  onBack: () => void;
  onOpenRequest: () => void;
  onSent: (user: SessionUser) => void;
};

/** «Мои договорённости» (T28): бюджет и категории подростка; изменение — запросом родителю. */
export function MyAgreements({ user, onBack, onOpenRequest, onSent }: Props) {
  const [sheet, setSheet] = useState<CategoryKey | null>(null);
  const { haptic } = useTwa();
  const allocation = user.family.allocation;
  const weeklyBudget = selfWeeklyBudget(user);
  const pending = pendingRequest(user);

  const closeSheet = useCallback(() => setSheet(null), []);
  useBackAction(sheet ? closeSheet : onBack);

  return (
    <div className="app-shell">
      <BackLink onClick={onBack} />
      <h1 className="screen-title" style={{ fontSize: "1.75rem", marginTop: 8, marginBottom: 6 }}>
        Мои договорённости
      </h1>
      <p className="screen-sub">
        Так ты делишь деньги на неделю. Хочешь по-другому — попроси семью.
      </p>

      {pending ? (
        <button type="button" className="pv-banner" onClick={onOpenRequest}>
          <span className="pv-row__body">
            <span className="pv-tone-warn" style={{ fontSize: "0.8125rem", fontWeight: 600 }}>Ждём ответа семьи</span>
            <span style={{ fontWeight: 600 }}>
              {requestSubject(pending)}: {pending.currentAmount.toLocaleString("ru-RU")} → {formatRub(pending.proposedAmount)}
            </span>
          </span>
          <span className="pv-banner__cta">Открыть</span>
        </button>
      ) : null}

      <BudgetCard allocation={allocation} weeklyBudget={weeklyBudget} />

      <CategoryList
        allocation={allocation}
        onSelect={(key) => {
          if (pending) {
            haptic("error");
            return;
          }
          setSheet(key);
        }}
        hint={
          pending
            ? "Новый запрос можно отправить, когда семья ответит на этот."
            : "Нажми на категорию, чтобы попросить другую сумму. Изменится, когда родитель согласится."
        }
      />

      {sheet ? (
        <CategorySheet
          mode="request"
          category={sheet}
          allocation={allocation}
          weeklyBudget={weeklyBudget}
          onClose={closeSheet}
          onRequest={async ({ amount, source, explanation }) => {
            const res = await createCategoryRequest(sheet, amount, source, explanation);
            haptic("success");
            setSheet(null);
            onSent(res.user);
          }}
        />
      ) : null}
    </div>
  );
}
