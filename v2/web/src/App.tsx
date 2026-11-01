import { useCallback, useEffect, useRef, useState } from "react";
import type { Allocation, UnplannedChoice } from "./domain/budget";
import { useSession } from "./session/SessionProvider";
import { OnboardingScreen } from "./screens/OnboardingScreen";
import { TeenHome } from "./screens/TeenHome";
import { QuestBudget } from "./screens/QuestBudget";
import { UnplannedPurchase } from "./screens/UnplannedPurchase";
import { Consequences } from "./screens/Consequences";
import {
  ScenarioOutcome,
  ScenarioStepScreen,
  type AnswerSummary,
} from "./screens/ScenarioStep";
import { NewConditions } from "./screens/NewConditions";
import { RequestSent } from "./screens/RequestSent";
import { RequestStatusTeen } from "./screens/RequestStatusTeen";
import { ParentHome } from "./screens/ParentHome";
import { ParentRequests } from "./screens/ParentRequests";
import { TeenAgreement } from "./screens/TeenAgreement";
import { fetchMe } from "./api/client";
import type { SessionUser } from "./domain/types";
import { FamilyScreen } from "./screens/FamilyScreen";
import { useCopy } from "./copy/CopyProvider";

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
  | { name: "parent-requests" }
  | { name: "parent-teen"; teenTelegramId: number }
  | { name: "scenario-step" }
  | { name: "scenario-outcome"; summary: AnswerSummary };

export function App() {
  const { user, onboarding, loading, error, setUser, refresh } = useSession();
  const { t } = useCopy();
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

  // Вернулись в Mini App — тихо обновить сессию (новый запрос, решение другой стороны).
  const hasUser = Boolean(user);
  useEffect(() => {
    if (!hasUser) return;
    const onVisible = () => {
      if (document.visibilityState !== "visible") return;
      void fetchMe()
        .then((data) => {
          if (!("needsOnboarding" in data && data.needsOnboarding)) setUser(data as SessionUser);
        })
        .catch(() => {});
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [hasUser, setUser]);

  useEffect(() => {
    if (!user || user.userType !== "teen") return;
    const runId = new URLSearchParams(window.location.search).get("run");
    if (!runId || user.activeScenarioStep?.runId !== runId) return;
    setRoute({ name: "scenario-step" });
  }, [user]);

  if (loading) {
    return <div className="loading">{t("ui.loading")}</div>;
  }

  if (error) {
    return (
      <div className="app-shell">
        <h1 className="screen-title">{t("ui.error.title")}</h1>
        <p className="screen-sub">{error}</p>
        {import.meta.env.DEV ? <LocalDevHint /> : null}
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
        <h1 className="screen-title">{t("ui.openViaBot.title")}</h1>
        <p className="screen-sub">{t("ui.openViaBot.sub")}</p>
      </div>
    );
  }

  if (user.userType === "parent") {
    if (route.name === "family") {
      return <FamilyScreen user={user} onBack={backFromFamily} onDone={goHome} />;
    }
    if (route.name === "parent-requests") {
      return <ParentRequests user={user} onBack={goHome} onDecided={setUser} />;
    }
    if (route.name === "parent-teen") {
      return (
        <TeenAgreement
          user={user}
          teenTelegramId={route.teenTelegramId}
          onBack={goHome}
          onOpenRequests={() => setRoute({ name: "parent-requests" })}
          onSaved={setUser}
        />
      );
    }
    return (
      <ParentHome
        user={user}
        onOpenRequests={() => setRoute({ name: "parent-requests" })}
        onOpenTeen={(teenTelegramId) => setRoute({ name: "parent-teen", teenTelegramId })}
        onOpenFamily={openFamily}
      />
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
    case "scenario-step": {
      const step = user.activeScenarioStep;
      if (!step) {
        goHome();
        return null;
      }
      return (
        <ScenarioStepScreen
          step={step}
          onBack={goHome}
          onAnswered={(u, summary) => {
            setUser(u);
            if (summary) {
              setRoute({ name: "scenario-outcome", summary });
            } else {
              goHome();
            }
          }}
        />
      );
    }
    case "scenario-outcome":
      return (
        <ScenarioOutcome
          user={user}
          before={route.summary.allocationBefore}
          after={route.summary.allocationAfter}
          completed={route.summary.completed}
          nextPendingReadyAt={route.summary.nextPendingReadyAt}
          onDone={goHome}
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
          onNewRequest={() => setRoute({ name: "new-conditions" })}
          onOpenFamily={openFamily}
          onOpenScenarioStep={() => setRoute({ name: "scenario-step" })}
          onScenarioStarted={(u) => {
            setUser(u);
            if (u.activeScenarioStep) {
              setRoute({ name: "scenario-step" });
            }
          }}
        />
      );
  }
}

function LocalDevHint() {
  return (
    <div className="dev-setup-hint">
      <p>
        <strong>Локально</strong> нужны два процесса:
      </p>
      <ol>
        <li>
          В <code>functions/.env</code> добавь <code>AUTH_SKIP=1</code> (см.{" "}
          <code>functions/.env.example</code>).
        </li>
        <li>
          Из корня репо:{" "}
          <code>firebase emulators:start --only functions</code>
          <span className="hint-footer" style={{ display: "block", marginTop: 4 }}>
            (нужен Firestore-эмулятор — установи Java и добавь{" "}
            <code>,firestore</code> в команду)
          </span>
        </li>
        <li>
          Отдельно: <code>cd v2/web && npm run dev</code> →{" "}
          <code>http://localhost:5173</code>
        </li>
      </ol>
      <p className="hint-footer">
        Без эмулятора запрос <code>/api/me</code> не доходит — открой приложение через
        бота на проде или подними эмулятор.
      </p>
    </div>
  );
}
