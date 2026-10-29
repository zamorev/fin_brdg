export type UserType = "teen" | "parent";

export type OnboardingMode = "create" | "join";

export type FamilyMember = {
  telegramId: number;
  displayName: string;
  userType: UserType;
  isYou: boolean;
  photoUrl?: string;
  hasAvatar?: boolean;
  /** Лимит на неделю (₽), только для подростков. */
  weeklyBudget?: number;
};

export type RuleChangeRequest = {
  id: string;
  category: "entertainment";
  currentAmount: number;
  proposedAmount: number;
  explanation: string;
  status: import("./budget").RequestStatus;
  parentComment: string;
};

export type FamilyState = {
  familyId: string;
  /** @deprecated подростковый код для совместимости */
  inviteCode: string;
  inviteCodeParent: string;
  inviteCodeTeen: string;
  memberCounts: { teens: number; parents: number; total: number };
  allocation: import("./budget").Allocation;
  questWeekBudgetCompleted: boolean;
  questUnplannedCompleted: boolean;
  unplannedChoice?: import("./budget").UnplannedChoice;
  level: number;
  xpToNext: number;
  skills: string[];
};

export type SessionUser = {
  telegramId: number;
  userType: UserType;
  displayName: string;
  family: FamilyState;
  members: FamilyMember[];
  activeRequest: RuleChangeRequest | null;
  activeScenarioStep: ScenarioStep | null;
  pendingScenarioStep: PendingScenarioStep | null;
};

export type ScenarioStep = {
  runId: string;
  scenarioId: string;
  scenarioTitle: string;
  nodeId: string;
  prompt: string;
  options: Array<{ id: string; label: string }>;
};

export type PendingScenarioStep = {
  runId: string;
  scenarioId: string;
  scenarioTitle: string;
  readyAt: string;
};

export type OnboardingPreview = {
  needsOnboarding: true;
  telegramId: number;
  displayName: string;
  inviteParam?: string;
  inviteError?: string;
};

export type DecideAction =
  | "approve_week"
  | "reject"
  | "needs_clarification";
