import { useEffect, useState } from "react";
import { completeOnboarding } from "../api/client";
import type { OnboardingMode, OnboardingPreview, UserType } from "../domain/types";
import { MainAction } from "../components/MainAction";
import { useTwa } from "../twa/TwaProvider";
import { parseInviteStartParam } from "../telegram/bot";

type Props = {
  preview: OnboardingPreview;
  onDone: () => void;
};

type Step = "pick-role" | "pick-mode" | "join-code";

export function OnboardingScreen({ preview, onDone }: Props) {
  const { haptic, tg } = useTwa();
  const [step, setStep] = useState<Step>("pick-role");
  const [userType, setUserType] = useState<UserType | null>(null);
  const [inviteCode, setInviteCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const parsed = parseInviteStartParam(tg?.initDataUnsafe?.start_param);
    if (!parsed) return;
    setInviteCode(parsed.inviteCode);
    if ("userType" in parsed) {
      setUserType(parsed.userType);
      setStep("join-code");
    }
  }, [tg]);

  const submit = async (type: UserType, mode: OnboardingMode, code?: string) => {
    setLoading(true);
    setError(null);
    try {
      await completeOnboarding(type, mode, code);
      haptic("success");
      onDone();
    } catch (e) {
      haptic("error");
      setError(e instanceof Error ? e.message : "Не получилось — попробуй ещё");
    } finally {
      setLoading(false);
    }
  };

  if (step === "pick-role") {
    return (
      <div className="app-shell">
        <h1 className="screen-title">Кто ты в Fin Bridge?</h1>
        <p className="screen-sub">Выбери свою роль — и начнём.</p>
        <p style={{ color: "var(--fb-hint)", fontSize: "0.8125rem", marginBottom: 16 }}>
          Одна роль на этот Telegram — потом сменить нельзя.
        </p>
        <p style={{ color: "var(--fb-hint)", fontSize: "0.875rem", marginBottom: 12 }}>
          {preview.displayName}
        </p>

        <div className="card" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <RolePick
            icon="🎒"
            title="Я подросток"
            sub="Квесты, бюджет и финансовые решения"
            onClick={() => {
              setUserType("teen");
              setStep(inviteCode.trim().length >= 4 ? "join-code" : "pick-mode");
            }}
          />
          <RolePick
            icon="👤"
            title="Я родитель"
            sub="Семейные договорённости и предложения подростка"
            onClick={() => {
              setUserType("parent");
              setStep(inviteCode.trim().length >= 4 ? "join-code" : "pick-mode");
            }}
          />
        </div>
        {error && <div className="error-banner">{error}</div>}
      </div>
    );
  }

  if (step === "pick-mode" && userType) {
    return (
      <div className="app-shell">
        <h1 className="screen-title">Семья</h1>
        <p className="screen-sub">
          {userType === "teen"
            ? "Создай свою семью или зайди по коду — если кто-то из семьи уже внутри."
            : "Создай семью или зайди по коду от того, кто уже в Fin Bridge."}
        </p>

        <div className="card" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <button
            type="button"
            className="task-row"
            style={{ borderRadius: 12, padding: 16 }}
            disabled={loading}
            onClick={() => void submit(userType, "create")}
          >
            <span className="task-icon">✨</span>
            <span>
              <div className="task-title">Создать новую семью</div>
              <div className="task-sub">Код для родителей и подростков</div>
            </span>
          </button>
          <button
            type="button"
            className="task-row"
            style={{ borderRadius: 12, padding: 16 }}
            disabled={loading}
            onClick={() => setStep("join-code")}
          >
            <span className="task-icon">🔗</span>
            <span>
              <div className="task-title">У меня есть код</div>
              <div className="task-sub">Присоединиться к семье</div>
            </span>
          </button>
        </div>

        <button
          type="button"
          className="text-link"
          onClick={() => {
            setStep("pick-role");
            setError(null);
          }}
        >
          Назад
        </button>
        {loading && <p className="hint-footer">Сохраняем…</p>}
        {error && <div className="error-banner">{error}</div>}
      </div>
    );
  }

  if (!userType) return null;

  return (
    <div className="app-shell">
      <h1 className="screen-title">Код семьи</h1>
      <p className="screen-sub">
        {userType
          ? "Код из ссылки уже подставлен — проверь и войди."
          : "Попроси скопировать код в разделе «Семья» у того, кто уже внутри."}
      </p>

      <div className="card">
        <input
          className="textarea"
          style={{ minHeight: 48, textTransform: "uppercase", letterSpacing: "0.12em" }}
          value={inviteCode}
          onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
          placeholder="Например AB12CD"
          autoComplete="off"
        />
        {error && <div className="error-banner">{error}</div>}
        <MainAction
          text="Войти в семью"
          enabled={!loading && inviteCode.trim().length >= 4}
          onClick={() => void submit(userType, "join", inviteCode)}
        />
        <button
          type="button"
          className="text-link"
          onClick={() => {
            setStep("pick-mode");
            setError(null);
          }}
        >
          Назад
        </button>
      </div>
    </div>
  );
}

function RolePick({
  icon,
  title,
  sub,
  onClick,
}: {
  icon: string;
  title: string;
  sub: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className="task-row"
      style={{ borderRadius: 12, padding: 16 }}
      onClick={onClick}
    >
      <span className="task-icon">{icon}</span>
      <span>
        <div className="task-title">{title}</div>
        <div className="task-sub">{sub}</div>
      </span>
    </button>
  );
}
