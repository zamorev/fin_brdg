import { useEffect, useRef, useState } from "react";
import { fetchFamilyView } from "../api/client";
import type { SessionUser, UserType } from "../domain/types";
import { MemberAvatar } from "../components/MemberAvatar";
import { useBackAction } from "../components/useBackAction";
import { useTwa } from "../twa/TwaProvider";
import type { InviteTarget } from "../telegram/bot";
import { APP_BUILD_ID } from "../buildInfo";

type Props = {
  user: SessionUser;
  /** Telegram «Назад» — с короткой задержкой от случайного тапа по списку. */
  onBack: () => void;
  /** Явный выход («← Назад» сверху экрана), без guard. */
  onDone: () => void;
};

export function FamilyScreen({ user, onBack, onDone }: Props) {
  const { shareFamilyInvite, haptic, hideMainButton } = useTwa();
  const [members, setMembers] = useState(user.members);
  const [counts, setCounts] = useState(user.family.memberCounts);
  const inviteTokens = useRef({
    parent: user.family.inviteCodeParent ?? user.family.inviteCode,
    teen: user.family.inviteCodeTeen ?? user.family.inviteCode,
  });
  const isParent = user.userType === "parent";

  useBackAction(onBack, 650);

  useEffect(() => {
    hideMainButton();
    return () => hideMainButton();
  }, [hideMainButton]);

  useEffect(() => {
    void fetchFamilyView().then((view) => {
      setMembers(view.members);
      setCounts(view.memberCounts);
      inviteTokens.current = {
        parent: view.inviteCodeParent ?? view.inviteCode,
        teen: view.inviteCodeTeen ?? view.inviteCode,
      };
    });
  }, []);

  const sendInvite = (target: InviteTarget) => {
    const token = target === "parent" ? inviteTokens.current.parent : inviteTokens.current.teen;
    shareFamilyInvite(target, token, user.telegramId);
    haptic("light");
  };

  const parents = members.filter((m) => m.userType === "parent");
  const teens = members.filter((m) => m.userType === "teen");

  return (
    <div className="app-shell app-shell--inline-footer">
      <button type="button" className="screen-back" onClick={onDone}>
        ← Назад
      </button>
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
          ? ". Пригласи ссылкой — «Пригласить» у каждого списка."
          : ". Позови ссылкой — «Пригласить» у каждого списка."}
      </p>

      <div className="family-section-head">
        <h2 className="family-section-title">Родители</h2>
        <button type="button" className="section-invite-link" onClick={() => sendInvite("parent")}>
          Пригласить
        </button>
      </div>
      <div className="card task-list">
        {parents.length === 0 ? (
          <EmptyMembers hint={emptyParentsHint(user.userType)} />
        ) : (
          parents.map((m) => (
            <MemberRow key={m.telegramId} member={m} />
          ))
        )}
      </div>

      <div className="family-section-head">
        <h2 className="family-section-title">Подростки</h2>
        <button type="button" className="section-invite-link" onClick={() => sendInvite("teen")}>
          Пригласить
        </button>
      </div>
      <div className="card task-list">
        {teens.length === 0 ? (
          <EmptyMembers hint={emptyTeensHint(user.userType)} />
        ) : (
          teens.map((m) => (
            <MemberRow key={m.telegramId} member={m} />
          ))
        )}
      </div>

      <p className="hint-footer">
        Квесты и учебный бюджет в прототипе общие на семью. Отдельный прогресс на
        каждого подростка — позже.
      </p>

      <p className="hint-footer build-stamp">id {APP_BUILD_ID}</p>
    </div>
  );
}

function EmptyMembers({ hint }: { hint: string }) {
  return (
    <p className="empty-members-hint" style={{ color: "var(--fb-hint)", fontSize: "0.875rem" }}>
      {hint}
    </p>
  );
}

function emptyParentsHint(viewer: UserType): string {
  if (viewer === "parent") {
    return "Пока только ты — нажми «Пригласить» справа.";
  }
  return "Пока никого — «Пригласить» справа или попроси зайти по ссылке.";
}

function emptyTeensHint(viewer: UserType): string {
  if (viewer === "parent") {
    return "Пока никого — «Пригласить» справа.";
  }
  return "Пока никого — «Пригласить» справа.";
}

function MemberRow({ member }: { member: SessionUser["members"][0] }) {
  return (
    <div className="task-row" style={{ cursor: "default" }}>
      <MemberAvatar member={member} />
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
