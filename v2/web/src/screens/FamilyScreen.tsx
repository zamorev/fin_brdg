import { useEffect, useState } from "react";
import { fetchFamilyView } from "../api/client";
import type { SessionUser, UserType } from "../domain/types";
import { useBackAction } from "../components/useBackAction";
import { useTwa } from "../twa/TwaProvider";
import type { InviteTarget } from "../telegram/bot";
import { APP_BUILD_ID } from "../buildInfo";

type Props = {
  user: SessionUser;
  onBack: () => void;
};

export function FamilyScreen({ user, onBack }: Props) {
  const { tg, hideMainButton, shareFamilyInvite, haptic } = useTwa();
  const [members, setMembers] = useState(user.members);
  const [counts, setCounts] = useState(user.family.memberCounts);
  const [inviteCode, setInviteCode] = useState(user.family.inviteCode);
  const isParent = user.userType === "parent";

  useBackAction(onBack, 650);

  useEffect(() => {
    hideMainButton();
  }, [hideMainButton]);

  useEffect(() => {
    void fetchFamilyView().then((view) => {
      setMembers(view.members);
      setCounts(view.memberCounts);
      setInviteCode(view.inviteCode);
    });
  }, []);

  const parents = members.filter((m) => m.userType === "parent");
  const teens = members.filter((m) => m.userType === "teen");
  const needsSecondParent = isParent && counts.parents < 2;

  const copyCode = () => {
    void navigator.clipboard?.writeText(inviteCode);
    tg?.HapticFeedback?.notificationOccurred("success");
    haptic("success");
  };

  const sendInvite = (target: InviteTarget) => {
    shareFamilyInvite(target, inviteCode);
    haptic("light");
  };

  return (
    <div className="app-shell">
      <h1 className="screen-title">
        <span className="screen-title__brand">Fin Bridge</span>
        <span className="screen-title__sep"> / </span>
        Семья
      </h1>
      <p className="screen-sub">
        {counts.parents}{" "}
        {plural(counts.parents, "родитель", "родителя", "родителей")}
        {" · "}
        {counts.teens}{" "}
        {plural(counts.teens, "подросток", "подростка", "подростков")}
        {isParent
          ? ". Пригласи кого не хватает — ссылкой выше."
          : ". Не хватает кого-то — ссылкой выше."}
      </p>

      <h2 style={{ fontSize: "1rem", margin: "0 0 8px" }}>Кого пригласить</h2>
      <div className="card task-list task-list--tap">
        {needsSecondParent ? (
          <InviteRow
            icon="👤"
            title="Второй родитель"
            sub="Партнёр, мама или папа — со своего Telegram"
            action="Отправить ссылку"
            onAction={() => sendInvite("parent")}
          />
        ) : null}
        {isParent ? (
          <InviteRow
            icon="🎒"
            title="Ребёнок"
            sub="Подросток — квесты и бюджет на своём телефоне"
            action="Отправить ссылку"
            onAction={() => sendInvite("teen")}
          />
        ) : (
          <>
            <InviteRow
              icon="👤"
              title="Родитель"
              sub="Чтобы согласовывать правила и лимиты"
              action="Отправить ссылку"
              onAction={() => sendInvite("parent")}
            />
            <InviteRow
              icon="🎒"
              title="Брат или сестра"
              sub="Подросток в той же семье"
              action="Отправить ссылку"
              onAction={() => sendInvite("teen")}
            />
          </>
        )}
      </div>

      <div className="card" style={{ marginTop: 12 }}>
        <div style={{ color: "var(--fb-hint)", fontSize: "0.8125rem" }}>
          Код семьи (если удобнее вручную)
        </div>
        <div className="row-between" style={{ marginTop: 8 }}>
          <span
            style={{
              fontSize: "1.375rem",
              fontWeight: 700,
              letterSpacing: "0.12em",
            }}
          >
            {inviteCode}
          </span>
          <button type="button" className="inline-action" onClick={copyCode}>
            Скопировать
          </button>
        </div>
      </div>

      <h2 style={{ fontSize: "1rem", margin: "16px 0 8px" }}>Родители</h2>
      <div className="card task-list">
        {parents.length === 0 ? (
          <EmptyMembers hint={emptyParentsHint(user.userType)} />
        ) : (
          parents.map((m) => (
            <MemberRow key={`${m.displayName}-${m.userType}`} member={m} />
          ))
        )}
      </div>

      <h2 style={{ fontSize: "1rem", margin: "16px 0 8px" }}>Подростки</h2>
      <div className="card task-list">
        {teens.length === 0 ? (
          <EmptyMembers hint={emptyTeensHint(user.userType)} />
        ) : (
          teens.map((m) => (
            <MemberRow key={`${m.displayName}-${m.userType}`} member={m} />
          ))
        )}
      </div>

      <p className="hint-footer">
        Квесты и учебный бюджет в прототипе общие на семью. Отдельный прогресс на
        каждого подростка — позже.
      </p>
      <p className="hint-footer build-stamp">id {APP_BUILD_ID}</p>

      <button type="button" className="btn-primary-fallback" onClick={onBack}>
        Готово
      </button>
    </div>
  );
}

function InviteRow({
  icon,
  title,
  sub,
  action,
  onAction,
}: {
  icon: string;
  title: string;
  sub: string;
  action: string;
  onAction: () => void;
}) {
  return (
    <button type="button" className="task-row" onClick={onAction}>
      <span className="task-icon">{icon}</span>
      <span>
        <div className="task-title">{title}</div>
        <div className="task-sub">{sub}</div>
      </span>
      <span className="inline-action">{action}</span>
    </button>
  );
}

function EmptyMembers({ hint }: { hint: string }) {
  return (
    <p style={{ color: "var(--fb-hint)", fontSize: "0.875rem", margin: 0, padding: "4px 0" }}>
      {hint}
    </p>
  );
}

function emptyParentsHint(viewer: UserType): string {
  if (viewer === "parent") {
    return "Пока только ты — пригласи второго родителя кнопкой выше.";
  }
  return "Пока никого — попроси родителя зайти по ссылке выше.";
}

function emptyTeensHint(viewer: UserType): string {
  if (viewer === "parent") {
    return "Пока никого — отправь ссылку ребёнку кнопкой выше.";
  }
  return "Пока никого — отправь ссылку брату или сестре кнопкой выше.";
}

function MemberRow({ member }: { member: SessionUser["members"][0] }) {
  return (
    <div className="task-row" style={{ cursor: "default" }}>
      <span className="task-icon">
        {member.userType === "parent" ? "👤" : "🎒"}
      </span>
      <span>
        <div className="task-title">
          {member.displayName}
          {member.isYou ? " · ты" : ""}
        </div>
        <div className="task-sub">
          {member.userType === "parent" ? "Родитель" : "Подросток"}
        </div>
      </span>
    </div>
  );
}

function plural(n: number, one: string, few: string, many: string): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return few;
  return many;
}
