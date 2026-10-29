import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { fetchContentStrings } from "../api/client";
import { COPY_DEFAULTS } from "./defaults";

type CopyContextValue = {
  t: (key: string, params?: Record<string, string | number>) => string;
  ready: boolean;
};

const CopyContext = createContext<CopyContextValue | null>(null);

function interpolate(template: string, params?: Record<string, string | number>): string {
  if (!params) return template;
  let s = template;
  for (const [k, v] of Object.entries(params)) {
    s = s.split(`{${k}}`).join(String(v));
  }
  return s;
}

export function CopyProvider({ children }: { children: ReactNode }) {
  const [strings, setStrings] = useState<Record<string, string>>(COPY_DEFAULTS);

  useEffect(() => {
    void fetchContentStrings().then((remote) => {
      if (Object.keys(remote).length) {
        setStrings((prev) => ({ ...prev, ...remote }));
      }
    });
  }, []);

  const t = useCallback(
    (key: string, params?: Record<string, string | number>) => {
      const text = strings[key] ?? COPY_DEFAULTS[key] ?? key;
      return interpolate(text, params);
    },
    [strings],
  );

  const value = useMemo(() => ({ t, ready: true }), [t]);

  return <CopyContext.Provider value={value}>{children}</CopyContext.Provider>;
}

export function useCopy(): CopyContextValue {
  const ctx = useContext(CopyContext);
  if (!ctx) {
    return {
      t: (key, params) => interpolate(COPY_DEFAULTS[key] ?? key, params),
      ready: false,
    };
  }
  return ctx;
}
