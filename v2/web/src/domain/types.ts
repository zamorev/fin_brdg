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
  /**
   * `weekly_budget` — «+N ₽ к недельному бюджету» (T20); `category_change` — сумма одной
   * категории (T28); `entertainment` — старые запросы.
   */
  category: "entertainment" | "weekly_budget" | "category_change";
  teenTelegramId?: number;
  /** Суммы бюджета недели или категории — по `category`. */
  currentAmount: number;
  proposedAmount: number;
  /** Только `category_change`. */
  categoryKey?: import("./budget").CategoryKey;
  fundingSource?: import("./budget").FundingSource;
  /** Что одобрил родитель («своя сумма» или proposedAmount). */
  finalAmount?: number;
  /** ISO-время создания. */
  createdAt?: string;
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
