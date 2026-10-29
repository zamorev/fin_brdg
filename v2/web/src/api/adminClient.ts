const API_BASE = import.meta.env.VITE_API_BASE ?? "/api";
const TOKEN_KEY = "fin_brdg_admin_token";

export function getAdminToken(): string | null {
  try {
    return sessionStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setAdminToken(token: string | null): void {
  try {
    if (token) sessionStorage.setItem(TOKEN_KEY, token);
    else sessionStorage.removeItem(TOKEN_KEY);
  } catch {
    /* private mode */
  }
}

async function adminRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getAdminToken();
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Admin ${token}` } : {}),
      ...init?.headers,
    },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = typeof body.error === "string" ? body.error : "Ошибка запроса";
    throw new Error(msg);
  }
  return body as T;
}

export function adminHasSession(): boolean {
  return Boolean(getAdminToken());
}

export function adminLogin(login: string, password: string) {
  return adminRequest<{ ok: boolean; login: string; token: string }>("/admin/login", {
    method: "POST",
    body: JSON.stringify({ login, password }),
  });
}

export function adminLogout() {
  return adminRequest<{ ok: boolean }>("/admin/logout", { method: "POST" });
}

export function adminMe() {
  return adminRequest<{ login: string }>("/admin/me");
}

export type AdminMessageRow = {
  key: string;
  label: string;
  group: string;
  defaultText: string;
  text: string;
  multiline?: boolean;
  isOverride: boolean;
};

export function fetchAdminMessages() {
  return adminRequest<{ messages: AdminMessageRow[] }>("/admin/messages");
}

export function saveAdminMessage(key: string, text: string) {
  return adminRequest<{ ok: boolean }>(`/admin/messages/${encodeURIComponent(key)}`, {
    method: "PUT",
    body: JSON.stringify({ text }),
  });
}

/** Первичное заполнение Firestore текстами и сценарием из кода (если коллекции пустые). */
export function adminSeed() {
  return adminRequest<{ ok: boolean; messages: number; scenarios: number }>("/admin/seed", {
    method: "POST",
  });
}

export type ScenarioListItem = {
  id: string;
  title: string;
  version: number;
  source: "firestore" | "git";
};

export type ScenarioDefinition = {
  id: string;
  version: number;
  title: string;
  startNodeId: string;
  nodes: Record<
    string,
    {
      id: string;
      prompt: string;
      options: Array<{
        id: string;
        label: string;
        effects?: Array<{ type: "spend"; category: string; amount: number }>;
        nextNodeId?: string;
        delayMs?: number;
        terminal?: boolean;
      }>;
    }
  >;
};

export function fetchAdminScenarios() {
  return adminRequest<{ scenarios: ScenarioListItem[] }>("/admin/scenarios");
}

export function fetchAdminScenario(id: string) {
  return adminRequest<{ scenario: ScenarioDefinition }>(
    `/admin/scenarios/${encodeURIComponent(id)}`,
  );
}

export function saveAdminScenario(scenario: ScenarioDefinition) {
  return adminRequest<{ ok: boolean; warnings: string[] }>(
    `/admin/scenarios/${encodeURIComponent(scenario.id)}`,
    {
      method: "PUT",
      body: JSON.stringify(scenario),
    },
  );
}
