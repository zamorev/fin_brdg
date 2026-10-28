import { useEffect, useRef, useState } from "react";
import { completeOnboarding, fetchInvitePreview, joinByInvite } from "../api/client";
import type { OnboardingPreview, UserType } from "../domain/types";
import { MainAction } from "../components/MainAction";
import { useTwa } from "../twa/TwaProvider";
import {
  captureInviteFromTwa,
  clearStoredInvite,
  inviteParamForApi,
  roleHintLabel,
  type InvitePayload,
} from "../telegram/bot";

type Props = {
  preview: OnboardingPreview;
  onDone: () => void;
};

type Step = "invite-join" | "pick-role" | "create-family";

export function OnboardingScreen({ preview, onDone }: Props) {
  const { haptic, tg } = useTwa();
  const inviteRef = useRef<InvitePayload | null>(captureInviteFromTwa(tg));
  const [invite] = useState<InvitePayload | null>(() => inviteRef.current);
  const [step, setStep] = useState<Step>(() =>
    inviteRef.current ? "invite-join" : "pick-role",
  );
  const [userType, setUserType] = useState<UserType | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resolvedRole, setResolvedRole] = useState<UserType | null>(
    invite?.roleHint ?? null,
  );
  const joinAttempted = useRef(false);

  useEffect(() => {
    const payload = captureInviteFromTwa(tg);
    if (payload) inviteRef.current = payload;
  }, [tg]);

  useEffect(() => {
    if (step !== "invite-join" || !invite || joinAttempted.current) return;
    joinAttempted.current = true;
    setError(null);
    setLoading(true);

    void (async () => {
      try {
        if (!invite.roleHint) {
          const previewRole = await fetchInvitePreview(invite.code);
          setResolvedRole(previewRole.userType);
        } else {
          setResolvedRole(invite.roleHint);
        }
        await joinByInvite(inviteParamForApi(invite));
        clearStoredInvite();
        haptic("success");
        onDone();
      } catch (e) {
        joinAttempted.current = false;
        haptic("error");
        setError(e instanceof Error ? e.message : "Не получилось войти по ссылке");
      } finally {
        setLoading(false);
      }
    })();
  }, [step, invite, haptic, onDone]);

  const retryInviteJoin = () => {
    joinAttempted.current = false;
    setError(null);
    setStep("invite-join");
  };

  const abandonInvite = () => {
    clearStoredInvite();
    inviteRef.current = null;
    joinAttempted.current = false;
    setError(null);
    setStep("pick-role");
  };

  const createFamily = async (type: UserType) => {
    setLoading(true);
    setError(null);
    try {
      await completeOnboarding(type, "create");
      clearStoredInvite();
      haptic("success");
      onDone();
    } catch (e) {
      haptic("error");
      setError(e instanceof Error ? e.message : "Не получилось — попробуй ещё");
    } finally {
      setLoading(false);
    }
  };

  if (step === "invite-join" && invite) {
    const role = resolvedRole ?? invite.roleHint;
    return (
      <div className="app-shell">
        <h1 className="screen-title">Приглашение в семью</h1>
        <p className="screen-sub">
          {role
            ? `По ссылке ты заходишь как ${roleHintLabel(role)} — подключим автоматически.`
            : "Подключаем к семье по ссылке…"}
        </p>
        <p style={{ color: "var(--fb-hint)", fontSize: "0.875rem", marginBottom: 12 }}>
          {preview.displayName}
        </p>
        {loading && !error ? (
          <div className="loading" style={{ padding: "24px 0" }}>
            Подключаем к семье…
          </div>
        ) : null}
        {error ? (
          <>
            <div className="error-banner">{error}</div>
            <MainAction text="Попробовать снова" onClick={retryInviteJoin} />
            <button type="button" className="text-link" onClick={abandonInvite}>
              Создать новую семью вместо этого
            </button>
          </>
        ) : null}
      </div>
    );
  }

  if (step === "pick-role") {
    return (
      <div className="app-shell">
        <h1 className="screen-title">Кто ты в Fin Bridge?</h1>
        <p className="screen-sub">Выбери свою роль — и начнём.</p>
        <p style={{ color: "var(--fb-hint)", fontSize: "0.8125rem", marginBottom: 16 }}>
          Одна роль на этот Telegram — потом сменить нельзя. В семью — по ссылке от близких.
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
              setStep("create-family");
            }}
          />
          <RolePick
            icon="👤"
            title="Я родитель"
            sub="Семейные договорённости и предложения подростка"
            onClick={() => {
              setUserType("parent");
              setStep("create-family");
            }}
          />
        </div>
        {error && <div className="error-banner">{error}</div>}
      </div>
    );
  }

  if (!userType) return null;

  return (
    <div className="app-shell">
      <h1 className="screen-title">Новая семья</h1>
      <p className="screen-sub">
        Создай семью и пригласи близких ссылкой из раздела «Семья».
      </p>

      <div className="card">
        <MainActionBlock
          loading={loading}
          onCreate={() => void createFamily(userType)}
        />
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
      {error && <div className="error-banner">{error}</div>}
    </div>
  );
}

function MainActionBlock({
  loading,
  onCreate,
}: {
  loading: boolean;
  onCreate: () => void;
}) {
  return (
    <button
      type="button"
      className="task-row"
      style={{ borderRadius: 12, padding: 16, width: "100%" }}
      disabled={loading}
      onClick={onCreate}
    >
      <span className="task-icon">✨</span>
      <span>
        <div className="task-title">{loading ? "Создаём…" : "Создать семью"}</div>
        <div className="task-sub">Потом отправишь ссылки тем, кого позовёшь</div>
      </span>
    </button>
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
