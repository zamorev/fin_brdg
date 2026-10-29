import { botInviteLink, inviteShareText, type InviteTarget, captureInviteFromTwa } from "../telegram/bot";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

interface TelegramWebApp {
  initData: string;
  initDataUnsafe?: { start_param?: string };
  startParam?: string;
  ready: () => void;
  expand: () => void;
  openTelegramLink?: (url: string) => void;
  openLink?: (url: string) => void;
  disableVerticalSwipes?: () => void;
  safeAreaInset?: { top: number; bottom: number; left: number; right: number };
  contentSafeAreaInset?: { top: number; bottom: number; left: number; right: number };
  themeParams: Record<string, string | undefined>;
  MainButton: {
    setText: (text: string) => void;
    show: () => void;
    hide: () => void;
    enable: () => void;
    disable: () => void;
    onClick: (cb: () => void) => void;
    offClick: (cb: () => void) => void;
  };
  BackButton: {
    show: () => void;
    hide: () => void;
    onClick: (cb: () => void) => void;
    offClick: (cb: () => void) => void;
  };
  HapticFeedback?: {
    notificationOccurred: (type: "success" | "error" | "warning") => void;
    impactOccurred: (type: "light" | "medium" | "heavy") => void;
  };
}

declare global {
  interface Window {
    Telegram?: {
      WebApp: TelegramWebApp;
    };
  }
}

type MainButtonConfig = {
  text: string;
  visible: boolean;
  enabled: boolean;
  onClick: (() => void) | null;
};

type TwaContextValue = {
  tg: TelegramWebApp | null;
  isTwa: boolean;
  setMainButton: (config: Partial<MainButtonConfig>) => void;
  hideMainButton: () => void;
  haptic: (type: "success" | "error" | "light") => void;
  setBackHandler: (handler: (() => void) | null) => void;
  shareFamilyInvite: (target: InviteTarget, inviteCode: string, inviterTelegramId?: number) => void;
};

const TwaContext = createContext<TwaContextValue | null>(null);

export function TwaProvider({ children }: { children: ReactNode }) {
  const tg = typeof window !== "undefined" ? window.Telegram?.WebApp : undefined;
  const isTwa = Boolean(tg?.initData);

  useEffect(() => {
    if (!tg) return;
    tg.ready();
    tg.expand();
    if (typeof tg.disableVerticalSwipes === "function") {
      tg.disableVerticalSwipes();
    }
    // Зафиксировать invite до любых переходов внутри TWA.
    captureInviteFromTwa(tg);
    const content = tg.contentSafeAreaInset;
    const safe = tg.safeAreaInset;
    const contentTop = content?.top ?? 0;
    const safeTop = safe?.top ?? 0;
    /** Под «Закрыть» + заголовок Mini App на iOS (ниже нельзя — режет заголовок). */
    const MIN_TOP = 104;
    const topInset = Math.max(contentTop + 64, safeTop + 72, MIN_TOP);

    if (content) {
      document.documentElement.style.setProperty(
        "--tg-content-safe-area-inset-top",
        `${content.top}px`,
      );
      document.documentElement.style.setProperty(
        "--tg-content-safe-area-inset-bottom",
        `${content.bottom}px`,
      );
    }
    if (safe) {
      document.documentElement.style.setProperty(
        "--tg-safe-area-inset-top",
        `${safe.top}px`,
      );
    }
    document.documentElement.style.setProperty("--fb-content-top", `${topInset}px`);
    // telegram-web-app.js создаёт WebApp и в обычном браузере; без initData — не TWA, нужна fallback-кнопка.
    if (isTwa) document.documentElement.classList.add("twa-ready");
  }, [tg, isTwa]);

  const [mainConfig, setMainConfigState] = useState<MainButtonConfig>({
    text: "",
    visible: false,
    enabled: true,
    onClick: null,
  });

  const [backHandler, setBackHandlerState] = useState<(() => void) | null>(null);

  /** Функцию в useState кладём через обёртку — иначе React вызовет её как updater. */
  const setBackHandler = useCallback((handler: (() => void) | null) => {
    setBackHandlerState(() => handler);
  }, []);

  useEffect(() => {
    if (!tg?.MainButton) return;
    const mb = tg.MainButton;
    if (!mainConfig.visible) {
      mb.hide();
      return;
    }
    mb.setText(mainConfig.text);
    if (mainConfig.enabled) mb.enable();
    else mb.disable();
    mb.show();
    const armedAt = Date.now();
    const onClick = () => {
      if (Date.now() - armedAt < 500) return;
      mainConfig.onClick?.();
    };
    mb.onClick(onClick);
    return () => {
      mb.offClick(onClick);
      mb.hide();
    };
  }, [tg, mainConfig]);

  useEffect(() => {
    if (!tg?.BackButton) return;
    const bb = tg.BackButton;
    if (!backHandler) {
      bb.hide();
      return;
    }
    bb.show();
    const armedAt = Date.now();
    const handler = () => {
      // Игнорируем «хвост» того же тапа, что открыл экран (TWA BackButton).
      if (Date.now() - armedAt < 500) return;
      backHandler();
    };
    bb.onClick(handler);
    return () => {
      bb.offClick(handler);
      bb.hide();
    };
  }, [tg, backHandler]);

  const setMainButton = useCallback((patch: Partial<MainButtonConfig>) => {
    setMainConfigState((prev) => ({ ...prev, ...patch }));
  }, []);

  const hideMainButton = useCallback(() => {
    setMainConfigState((prev) => ({ ...prev, visible: false, onClick: null }));
  }, []);

  const haptic = useCallback(
    (type: "success" | "error" | "light") => {
      const hf = tg?.HapticFeedback;
      if (!hf) return;
      if (type === "success") hf.notificationOccurred("success");
      else if (type === "error") hf.notificationOccurred("error");
      else hf.impactOccurred("light");
    },
    [tg],
  );

  const shareFamilyInvite = useCallback(
    (target: InviteTarget, inviteCode: string, inviterTelegramId?: number) => {
      const text = inviteShareText(target);
      const link = botInviteLink(inviteCode, target, inviterTelegramId);
      const payload = `${text}\n${link}`;
      if (tg?.openTelegramLink) {
        tg.openTelegramLink(
          `https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(text)}`,
        );
        return;
      }
      if (typeof navigator.share === "function") {
        void navigator.share({ text: payload }).catch(() => {
          void navigator.clipboard?.writeText(payload);
        });
        return;
      }
      void navigator.clipboard?.writeText(payload);
      haptic("success");
    },
    [tg, haptic],
  );

  const value = useMemo(
    () => ({
      tg: tg ?? null,
      isTwa,
      setMainButton,
      hideMainButton,
      haptic,
      setBackHandler,
      shareFamilyInvite,
    }),
    [tg, isTwa, setMainButton, hideMainButton, haptic, setBackHandler, shareFamilyInvite],
  );

  return <TwaContext.Provider value={value}>{children}</TwaContext.Provider>;
}

export function useTwa() {
  const ctx = useContext(TwaContext);
  if (!ctx) throw new Error("useTwa outside provider");
  return ctx;
}
