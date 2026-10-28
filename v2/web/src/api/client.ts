import type { OnboardingPreview, SessionUser, UserType } from "../domain/types";

const API_BASE = import.meta.env.VITE_API_BASE ?? "/api";

function authHeaders(): HeadersInit {
  const tg = window.Telegram?.WebApp;
  const initData = tg?.initData ?? "";
  return {
    "Content-Type": "application/json",
    Authorization: initData ? `tma ${initData}` : "",
  };
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: { ...authHeaders(), ...init?.headers },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg =
      typeof body.error === "string" ? body.error : "Не удалось загрузить данные";
    throw new Error(msg);
  }
  return body as T;
}

export type MeResponse = OnboardingPreview | (SessionUser & { needsOnboarding?: false });

export async function fetchMe(): Promise<MeResponse> {
  return request<MeResponse>("/me");
}

export function completeOnboarding(
  userType: UserType,
  mode: import("../domain/types").OnboardingMode,
  inviteCode?: string,
) {
  return request<SessionUser>("/onboarding", {
    method: "POST",
    body: JSON.stringify({ userType, mode, inviteCode }),
  });
}

export function fetchFamilyView() {
  return request<{
    familyId: string;
    inviteCode: string;
    memberCounts: { teens: number; parents: number; total: number };
    members: import("../domain/types").FamilyMember[];
  }>("/family");
}

export function checkWeekBudget(allocation: Record<string, number>) {
  return request<{ ok: boolean; errors: { message: string }[]; user: SessionUser }>(
    "/quests/week-budget",
    { method: "POST", body: JSON.stringify({ allocation }) },
  );
}

export function submitUnplanned(choice: string) {
  return request<{ user: SessionUser }>("/quests/unplanned", {
    method: "POST",
    body: JSON.stringify({ choice }),
  });
}

export function createRuleRequest(proposedAmount: number, explanation: string) {
  return request<{ user: SessionUser }>("/requests", {
    method: "POST",
    body: JSON.stringify({ proposedAmount, explanation }),
  });
}

export function decideRequest(
  requestId: string,
  action: string,
  comment: string,
) {
  return request<{ user: SessionUser }>(`/requests/${requestId}/decide`, {
    method: "POST",
    body: JSON.stringify({ action, comment }),
  });
}

/** @deprecated use fetchMe */
export const fetchSession = fetchMe;
