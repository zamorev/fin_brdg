import { useCallback, useEffect, useRef, useState } from "react";
import { REQUEST_STATUS_LABELS } from "./domain/budget";
import type { Allocation, UnplannedChoice } from "./domain/budget";
import { useSession } from "./session/SessionProvider";
import { OnboardingScreen } from "./screens/OnboardingScreen";
import { TeenHome } from "./screens/TeenHome";
import { QuestBudget } from "./screens/QuestBudget";
import { UnplannedPurchase } from "./screens/UnplannedPurchase";
import { Consequences } from "./screens/Consequences";
import { NewConditions } from "./screens/NewConditions";
import { RequestSent } from "./screens/RequestSent";
import { RequestStatusTeen } from "./screens/RequestStatusTeen";
import { ParentRequest } from "./screens/ParentRequest";
import { FamilyScreen } from "./screens/FamilyScreen";
import { APP_BUILD_ID } from "./buildInfo";

type Route =
  | { name: "home" }
  | { name: "family" }
  | { name: "quest-budget" }
  | { name: "unplanned" }
  | {
      name: "consequences";
      choice: UnplannedChoice;
      before: Allocation;
    }
  | { name: "new-conditions" }
  | { name: "request-sent" }
  | { name: "request-status" }
  | { name: "parent-request" };

export function App() {
  const { user, onboarding, loading, error, setUser, refresh } = useSession();
  const [route, setRoute] = useState<Route>({ name: "home" });
  const familyEnteredAt = useRef(0);

  const goHome = useCallback(() => setRoute({ name: "home" }), []);

  const openFamily = useCallback(() => {
    familyEnteredAt.current = Date.now();
    setRoute({ name: "family" });
  }, []);

  const backFromFamily = useCallback(
    (opts?: { immediate?: boolean }) => {
      if (!opts?.immediate && Date.now() - familyEnteredAt.current < 800) return;
      goHome();
    },
    [goHome],
  );

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [route.name]);

  if (loading) {
    return <div className="loading">Загружаем…</div>;
  }

  if (error) {
    return (
      <div className="app-shell">
        <h1 className="screen-title">Не получилось</h1>
        <p className="screen-sub">{error}</p>
      </div>
    );
  }

  if (onboarding) {
    return (
      <OnboardingScreen
        preview={onboarding}
        onDone={() => void refresh()}
      />
    );
  }

  if (!user) {
    return (
      <div className="app-shell">
        <h1 className="screen-title">Открой через бота</h1>
        <p className="screen-sub">@fin_brdg_bot → кнопка «Начать»</p>
      </div>
    );
  }

  if (user.userType === "parent") {
    if (route.name === "family") {
      return <FamilyScreen user={user} onBack={backFromFamily} onDone={goHome} />;
    }
    if (route.name === "parent-request") {
      return (
        <ParentRequest
          user={user}
          onBack={goHome}
          onDecided={(u) => {
            setUser(u);
            goHome();
          }}
        />
      );
    }
    const pending = user.activeRequest?.status === "pending" ? user.activeRequest : null;
    return (
      <div className="app-shell">
        <h1 className="screen-title">Fin Bridge</h1>
        <p className="screen-sub">
          Когда подросток предложит новое правило — увидишь его здесь, со своего
          Telegram.
        </p>
        <div className="card task-list task-list--tap">
          {pending ? (
            <button
              type="button"
              className="task-row"
              onClick={() => setRoute({ name: "parent-request" })}
            >
              <span className="task-icon">⏳</span>
              <span>
                <div className="task-title">Предложение подростка</div>
                <div className="task-sub">Развлечения — новый лимит на неделю</div>
              </span>
              <span className="badge">{REQUEST_STATUS_LABELS[pending.status]}</span>
            </button>
          ) : null}
          <button
            type="button"
            className="task-row"
            onClick={openFamily}
          >
            <span className="task-icon">👨‍👩‍👧</span>
            <span>
              <div className="task-title">Семья</div>
              <div className="task-sub">
                {user.family.memberCounts.total}{" "}
                {pluralMembers(user.family.memberCounts.total)} · пригласить
              </div>
            </span>
          </button>
        </div>
        <p className="hint-footer build-stamp">id {APP_BUILD_ID}</p>
      </div>
    );
  }

  if (route.name === "family") {
    return <FamilyScreen user={user} onBack={backFromFamily} onDone={goHome} />;
  }

  switch (route.name) {
    case "quest-budget":
      return (
        <QuestBudget
          user={user}
          onBack={goHome}
          onSuccess={(u) => setUser(u)}
          onContinueUnplanned={() => setRoute({ name: "unplanned" })}
        />
      );
    case "unplanned":
      return (
        <UnplannedPurchase
          user={user}
          onBack={goHome}
          onContinue={(choice, u, before) => {
            setUser(u);
            setRoute({ name: "consequences", choice, before });
          }}
        />
      );
    case "consequences":
      return (
        <Consequences
          user={{
            ...user,
            family: { ...user.family, allocation: route.before },
          }}
          choice={route.choice}
          onBack={goHome}
          onNext={() => setRoute({ name: "new-conditions" })}
        />
      );
    case "new-conditions":
      return (
        <NewConditions
          user={user}
          onBack={goHome}
          onSent={(u) => {
            setUser(u);
            setRoute({ name: "request-sent" });
          }}
        />
      );
    case "request-sent":
      return (
        <RequestSent
          user={user}
          onDone={goHome}
          onViewStatus={() => setRoute({ name: "request-status" })}
        />
      );
    case "request-status":
      return (
        <RequestStatusTeen
          user={user}
          onBack={() => {
            void refresh();
            goHome();
          }}
        />
      );
    case "home":
    default:
      return (
        <TeenHome
          user={user}
          onStartQuest={() => setRoute({ name: "quest-budget" })}
          onOpenAgreements={goHome}
          onOpenRequest={() => setRoute({ name: "request-status" })}
          onOpenFamily={openFamily}
        />
      );
  }
}

function pluralMembers(n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return "участник";
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return "участника";
  return "участников";
}
