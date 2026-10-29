import { formatRub, WEEKLY_BUDGET } from "../domain/budget";
import type { FamilyMember } from "../domain/types";

type Props = {
  members: FamilyMember[];
};

function teenWeeklyBudget(member: FamilyMember): number {
  return member.weeklyBudget ?? WEEKLY_BUDGET;
}

/** Строки подростков и сумма в заголовке (если подростков > 1). */
export function FamilyWeeklyBudgetSection({ members }: Props) {
  const teens = members.filter((m) => m.userType === "teen");
  if (teens.length === 0) return null;

  const total = teens.reduce((sum, teen) => sum + teenWeeklyBudget(teen), 0);

  return (
    <>
      <div className="family-section-head">
        <h2 className="family-section-title">Еженедельный бюджет</h2>
        {teens.length > 1 ? (
          <span className="weekly-budget-amount weekly-budget-amount--header">
            {formatRub(total)}
          </span>
        ) : null}
      </div>
      <div className="card task-list">
        {teens.map((teen) => (
          <div key={teen.telegramId} className="weekly-budget-row">
            <span className="task-title">
              {teen.displayName}
              {teen.isYou ? " · ты" : ""}
            </span>
            <span className="weekly-budget-amount">{formatRub(teenWeeklyBudget(teen))}</span>
          </div>
        ))}
      </div>
    </>
  );
}
