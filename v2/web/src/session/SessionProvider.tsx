import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { fetchMe } from "../api/client";
import type { OnboardingPreview, SessionUser } from "../domain/types";

type SessionContextValue = {
  user: SessionUser | null;
  onboarding: OnboardingPreview | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  setUser: (user: SessionUser) => void;
  clearOnboarding: () => void;
};

const SessionContext = createContext<SessionContextValue | null>(null);

function isOnboarding(data: unknown): data is OnboardingPreview {
  return (
    typeof data === "object" &&
    data !== null &&
    "needsOnboarding" in data &&
    (data as OnboardingPreview).needsOnboarding === true
  );
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [onboarding, setOnboarding] = useState<OnboardingPreview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchMe();
      if (isOnboarding(data)) {
        setOnboarding(data);
        setUser(null);
      } else {
        setUser(data as SessionUser);
        setOnboarding(null);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не получилось открыть приложение");
      setUser(null);
      setOnboarding(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const clearOnboarding = useCallback(() => setOnboarding(null), []);

  const value = useMemo(
    () => ({
      user,
      onboarding,
      loading,
      error,
      refresh,
      setUser,
      clearOnboarding,
    }),
    [user, onboarding, loading, error, refresh, clearOnboarding],
  );

  return (
    <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
  );
}

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession outside provider");
  return ctx;
}
