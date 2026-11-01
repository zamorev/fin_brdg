import { formatRub } from "../domain/budget";
import { memberWeeklyBudget } from "../domain/memberBudget";
import {
  pendingRequest,
  plural,
  teens,
  teenStatusLine,
  waitingCaption,
} from "../domain/parentView";
import type { SessionUser } from "../domain/types";
import { MemberAvatar } from "../components/MemberAvatar";
import { ChevronRight, FamilyIcon, InboxIcon } from "../components/ParentIcons";
import { APP_BUILD_ID } from "../buildInfo";

type Props = {
  user: SessionUser;
  onOpenRequests: () => void;
  onOpenTeen: (telegramId: number) => void;
  onOpenFamily: () => void;
};

/** Экран 1 — главная родителя: запросы, бюджет по подросткам, семья. */
export function ParentHome({ user, onOpenRequests, onOpenTeen, onOpenFamily }: Props) {
  const req = pendingRequest(user);
  const list = teens(user);
  const familyWeekly = list.reduce((sum, t) => sum + memberWeeklyBudget(t), 0);
  const { parents, teens: teenCount } = user.family.memberCounts;

  return (
    <div className="app-shell">
      <header className="pv-header">
        <h1>Fin Bridge</h1>
        <span className="pv-role">Родитель</span>
      </header>

      {req ? (
        <button type="button" className="pv-card pv-row" onClick={onOpenRequests} style={{ padding: 16, gap: 14 }}>
          <span className="pv-tile pv-tile--warn">
            <InboxIcon size={26} />
          </span>
          <span className="pv-row__body">
            <span className="pv-row__title">Запросы подростков</span>
            <span className="pv-row__sub" style={{ fontSize: "0.875rem" }}>
              {waitingCaption(user, req)}
            </span>
          </span>
          <span className="pv-count">1</span>
        </button>
      ) : null}

      <section className={req ? "pv-section" : undefined}>
        <div className="pv-section-head">
          <h2>Еженедельный бюджет</h2>
          {list.length > 0 ? <span className="pv-amount" style={{ fontSize: "1.25rem" }}>{formatRub(familyWeekly)}</span> : null}
        </div>
        {list.length === 0 ? (
          <div className="pv-card pv-empty">
            <strong>Пока нет подростков</strong>
            <span>Отправь ссылку-приглашение — подросток появится здесь</span>
            <button type="button" className="pv-btn pv-btn--primary" style={{ padding: "0 20px", marginTop: 8 }} onClick={onOpenFamily}>
              Пригласить
            </button>
          </div>
        ) : (
          <>
            <div className="pv-card">
              {list.map((teen) => {
                const status = teenStatusLine(user, teen);
                return (
                  <button key={teen.telegramId} type="button" className="pv-row" onClick={() => onOpenTeen(teen.telegramId)}>
                    <MemberAvatar member={teen} initials />
                    <span className="pv-row__body">
                      <span className="pv-row__title">{teen.displayName}</span>
                      <span className={`pv-row__sub pv-tone-${status.tone}`}>{status.text}</span>
                    </span>
                    <span className="pv-amount" style={{ fontSize: "1.0625rem" }}>
                      {formatRub(memberWeeklyBudget(teen))}
                    </span>
                    <ChevronRight />
                  </button>
                );
              })}
            </div>
            <p className="pv-hint">Нажми на подростка — там его бюджет и категории</p>
          </>
        )}
      </section>

      <button type="button" className="pv-card pv-row pv-section" onClick={onOpenFamily} style={{ padding: 16, gap: 14 }}>
        <span className="pv-tile pv-tile--link">
          <FamilyIcon size={26} />
        </span>
        <span className="pv-row__body">
          <span className="pv-row__title">Семья</span>
          <span className="pv-row__sub" style={{ fontSize: "0.875rem" }}>
            {parents} родит. · {teenCount} {plural(teenCount, "подросток", "подростка", "подростков")} ·{" "}
            <span className="pv-tone-link">пригласить</span>
          </span>
        </span>
      </button>

      <p className="hint-footer build-stamp">id {APP_BUILD_ID}</p>
    </div>
  );
}
