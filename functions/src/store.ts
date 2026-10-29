import { getFirestore, FieldValue, Timestamp } from "firebase-admin/firestore";
import {
  applyUnplanned,
  DEFAULT_ALLOCATION,
  WEEKLY_BUDGET,
  type Allocation,
  type RequestStatus,
  type UnplannedChoice,
  validateAllocation,
  validateRuleChange,
} from "./domain";

export type { Allocation };

import type { TelegramUser } from "./telegram";
import { displayName } from "./telegram";
import { schedulePhotoRefresh, serveFamilyMemberAvatar, syncUserProfilePhoto } from "./profilePhoto";
import { consumePendingInvite } from "./pendingInvite";
import {
  answerScenarioRun,
  applyScenarioAllocationUpdate,
  buildScenarioSessionFields,
  startScenarioRun,
} from "./scenarioRuns";
import { loadScenario } from "./scenarios/registry";

const db = () => getFirestore();

/** После онбординга — teen | parent; до выбора роли — anonymous. */
export type UserType = "teen" | "parent" | "anonymous";

export type RoleUserType = "teen" | "parent";

export type UserDoc = {
  userType: UserType;
  /** Нет у anonymous до завершения онбординга. */
  familyId?: string;
  displayName: string;
  createdAt: Timestamp;
  /** Публичный URL (t.me / CDN), без токена бота. */
  photoUrl?: string;
  /** Путь файла Bot API — отдаём только через /api/avatar. */
  photoFilePath?: string;
};

/** Общие правила и прогресс квестов MVP (на всю семью; позже — per-teen). */
export type FamilyDoc = {
  /** @deprecated общий код; для старых семей */
  inviteCode: string;
  inviteCodeParent?: string;
  inviteCodeTeen?: string;
  allocation: Allocation;
  questWeekBudgetCompleted: boolean;
  questUnplannedCompleted: boolean;
  unplannedChoice?: UnplannedChoice;
  level: number;
  xpToNext: number;
  skills: string[];
  /** telegramId → лимит на неделю (₽), только подростки семьи. */
  teenWeeklyBudgets?: Record<string, number>;
};

export type RequestDoc = {
  familyId: string;
  category: "entertainment";
  currentAmount: number;
  proposedAmount: number;
  explanation: string;
  status: RequestStatus;
  parentComment: string;
  createdAt: Timestamp;
};

export type FamilyMemberView = {
  telegramId: number;
  displayName: string;
  userType: RoleUserType;
  isYou: boolean;
  photoUrl?: string;
  hasAvatar: boolean;
  /** Только для userType teen — из families.teenWeeklyBudgets. */
  weeklyBudget?: number;
};

export type OnboardingMode = "create" | "join";

function newInviteCode(): string {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

function newFamilyDoc(): FamilyDoc {
  const inviteCodeParent = newInviteCode();
  let inviteCodeTeen = newInviteCode();
  while (inviteCodeTeen === inviteCodeParent) {
    inviteCodeTeen = newInviteCode();
  }
  return {
    inviteCode: inviteCodeParent,
    inviteCodeParent,
    inviteCodeTeen,
    allocation: { ...DEFAULT_ALLOCATION },
    questWeekBudgetCompleted: false,
    questUnplannedCompleted: false,
    level: 3,
    xpToNext: 140,
    skills: [],
  };
}

export async function getUser(telegramId: number): Promise<UserDoc | null> {
  const doc = await db().collection("users").doc(String(telegramId)).get();
  if (!doc.exists) return null;
  return doc.data() as UserDoc;
}

async function getLegacyMember(telegramId: number): Promise<UserDoc | null> {
  const doc = await db().collection("members").doc(String(telegramId)).get();
  if (!doc.exists) return null;
  const data = doc.data() as { role: UserType; familyId: string; displayName: string };
  return {
    userType: data.role,
    familyId: data.familyId,
    displayName: data.displayName,
    createdAt: Timestamp.now(),
  };
}

export async function resolveUser(telegramId: number): Promise<UserDoc | null> {
  return (await getUser(telegramId)) ?? (await getLegacyMember(telegramId));
}

export function isOnboardedUser(profile: UserDoc): profile is UserDoc & {
  userType: RoleUserType;
  familyId: string;
} {
  return profile.userType !== "anonymous" && Boolean(profile.familyId);
}

/** Первый заход (в т.ч. по invite): создаём users/{telegramId} с userType anonymous. */
export async function ensureUserRecord(tg: TelegramUser, botToken?: string): Promise<UserDoc> {
  const id = String(tg.id);
  const ref = db().collection("users").doc(id);
  const snap = await ref.get();
  const name = displayName(tg);

  if (!snap.exists) {
    const doc: UserDoc = {
      userType: "anonymous",
      displayName: name,
      createdAt: Timestamp.now(),
    };
    await ref.set(doc);
    if (botToken) {
      void syncUserProfilePhoto(tg.id, tg, botToken);
    }
    return doc;
  }

  const data = snap.data() as UserDoc;
  if (data.displayName !== name) {
    await ref.set({ displayName: name }, { merge: true });
    return { ...data, displayName: name };
  }
  if (botToken) {
    void syncUserProfilePhoto(tg.id, tg, botToken);
  }
  return data;
}

async function ensureFamilyInviteCodes(
  familyId: string,
  data: FamilyDoc,
): Promise<FamilyDoc> {
  let inviteCodeParent = data.inviteCodeParent ?? data.inviteCode ?? "";
  let inviteCodeTeen = data.inviteCodeTeen ?? "";
  const updates: Record<string, string> = {};

  if (!inviteCodeParent) {
    inviteCodeParent = newInviteCode();
    updates.inviteCodeParent = inviteCodeParent;
    updates.inviteCode = inviteCodeParent;
  }
  if (!inviteCodeTeen) {
    inviteCodeTeen = newInviteCode();
    while (inviteCodeTeen === inviteCodeParent) {
      inviteCodeTeen = newInviteCode();
    }
    updates.inviteCodeTeen = inviteCodeTeen;
  }

  if (Object.keys(updates).length > 0) {
    await db().collection("families").doc(familyId).update(updates);
  }

  return {
    ...data,
    inviteCode: data.inviteCode ?? inviteCodeParent,
    inviteCodeParent,
    inviteCodeTeen,
  };
}

type InviteResolve = {
  familyId: string;
  intendedRole: RoleUserType | null;
};

async function resolveFamilyByInviteCode(codeRaw: string): Promise<InviteResolve | null> {
  const code = codeRaw.trim().toUpperCase();
  if (!code) return null;

  const tryField = async (
    field: "inviteCodeParent" | "inviteCodeTeen" | "inviteCode",
    intendedRole: RoleUserType | null,
  ) => {
    const snap = await db()
      .collection("families")
      .where(field, "==", code)
      .limit(1)
      .get();
    if (snap.empty) return null;
    return { familyId: snap.docs[0].id, intendedRole };
  };

  return (
    (await tryField("inviteCodeParent", "parent")) ??
    (await tryField("inviteCodeTeen", "teen")) ??
    (await tryField("inviteCode", null))
  );
}

export async function previewInviteCode(
  codeRaw: string,
): Promise<{ userType: RoleUserType } | null> {
  const resolved = await resolveFamilyByInviteCode(codeRaw);
  if (!resolved?.intendedRole) return null;
  return { userType: resolved.intendedRole };
}

/** Имя для текста бота «{имя} приглашает тебя в семью». */
export async function resolveInviterDisplayName(
  inviteParamNormalized: string,
  inviterTelegramId?: number,
): Promise<string | null> {
  if (inviterTelegramId) {
    const doc = await db().collection("users").doc(String(inviterTelegramId)).get();
    if (doc.exists) {
      const data = doc.data() as UserDoc;
      const name = data.displayName?.trim();
      if (name && isOnboardedUser(data)) return name;
    }
  }

  let code = inviteParamNormalized.trim().toUpperCase();
  const prefixed = inviteParamNormalized.match(/^([pt])_(.+)$/i);
  if (prefixed) {
    code = prefixed[2].trim().toUpperCase();
  }
  const resolved = await resolveFamilyByInviteCode(code);
  if (!resolved) return null;

  const q = await db().collection("users").where("familyId", "==", resolved.familyId).get();
  let fallback: string | null = null;
  for (const memberDoc of q.docs) {
    const data = memberDoc.data() as UserDoc;
    if (!isOnboardedUser(data)) continue;
    const name = data.displayName?.trim();
    if (!name) continue;
    if (data.userType === "parent") return name;
    fallback = fallback ?? name;
  }
  return fallback;
}

async function syncTeenWeeklyBudgets(familyId: string, data: FamilyDoc): Promise<FamilyDoc> {
  const q = await db().collection("users").where("familyId", "==", familyId).get();
  const teenIds: string[] = [];
  for (const doc of q.docs) {
    const profile = doc.data() as UserDoc;
    if (isOnboardedUser(profile) && profile.userType === "teen") {
      teenIds.push(doc.id);
    }
  }

  const budgets = { ...(data.teenWeeklyBudgets ?? {}) };
  let dirty = false;
  for (const id of teenIds) {
    if (budgets[id] === undefined) {
      budgets[id] = WEEKLY_BUDGET;
      dirty = true;
    }
  }
  for (const key of Object.keys(budgets)) {
    if (!teenIds.includes(key)) {
      delete budgets[key];
      dirty = true;
    }
  }

  if (dirty) {
    await db().collection("families").doc(familyId).update({ teenWeeklyBudgets: budgets });
  }

  return { ...data, teenWeeklyBudgets: budgets };
}

function enrichMembersWithWeeklyBudgets(
  members: FamilyMemberView[],
  budgets: Record<string, number>,
): FamilyMemberView[] {
  return members.map((member) =>
    member.userType === "teen"
      ? {
          ...member,
          weeklyBudget: budgets[String(member.telegramId)] ?? WEEKLY_BUDGET,
        }
      : member,
  );
}

export async function getFamily(familyId: string): Promise<FamilyDoc> {
  const doc = await db().collection("families").doc(familyId).get();
  if (!doc.exists) {
    throw new Error("Семья не найдена");
  }
  const data = doc.data() as FamilyDoc;
  const withCodes = await ensureFamilyInviteCodes(familyId, {
    ...data,
    inviteCode: data.inviteCode ?? "",
  });
  return syncTeenWeeklyBudgets(familyId, withCodes);
}

export async function listFamilyMembers(
  familyId: string,
  selfTelegramId: number,
): Promise<FamilyMemberView[]> {
  const q = await db().collection("users").where("familyId", "==", familyId).get();
  const members: FamilyMemberView[] = [];
  for (const doc of q.docs) {
    const data = doc.data() as UserDoc;
    if (!isOnboardedUser(data)) continue;
    members.push({
      telegramId: Number(doc.id),
      displayName: data.displayName,
      userType: data.userType,
      isYou: doc.id === String(selfTelegramId),
      photoUrl: data.photoUrl,
      hasAvatar: Boolean(data.photoUrl || data.photoFilePath),
    });
  }

  members.sort((a, b) => {
    if (a.userType !== b.userType) {
      return a.userType === "parent" ? -1 : 1;
    }
    return a.displayName.localeCompare(b.displayName, "ru");
  });

  return members;
}

export async function getActiveRequest(familyId: string) {
  const q = await db()
    .collection("requests")
    .where("familyId", "==", familyId)
    .orderBy("createdAt", "desc")
    .limit(1)
    .get();
  if (q.empty) return null;
  const doc = q.docs[0];
  return { id: doc.id, ...(doc.data() as RequestDoc) };
}

function buildSessionPayload(
  tg: TelegramUser,
  profile: UserDoc & { familyId: string; userType: RoleUserType },
  family: FamilyDoc,
  members: FamilyMemberView[],
  active: ({ id: string } & RequestDoc) | null,
  scenarioFields: Awaited<ReturnType<typeof buildScenarioSessionFields>>,
) {
  const teens = members.filter((m) => m.userType === "teen").length;
  const parents = members.filter((m) => m.userType === "parent").length;

  return {
    telegramId: tg.id,
    userType: profile.userType,
    displayName: profile.displayName || displayName(tg),
    family: {
      familyId: profile.familyId,
      inviteCode: family.inviteCodeTeen ?? family.inviteCode,
      inviteCodeParent: family.inviteCodeParent ?? family.inviteCode,
      inviteCodeTeen: family.inviteCodeTeen ?? family.inviteCode,
      memberCounts: { teens, parents, total: members.length },
      allocation: family.allocation,
      questWeekBudgetCompleted: family.questWeekBudgetCompleted,
      questUnplannedCompleted: family.questUnplannedCompleted,
      unplannedChoice: family.unplannedChoice,
      level: family.level,
      xpToNext: family.xpToNext,
      skills: family.skills,
    },
    members,
    activeRequest: active
      ? {
          id: active.id,
          category: active.category,
          currentAmount: active.currentAmount,
          proposedAmount: active.proposedAmount,
          explanation: active.explanation,
          status: active.status,
          parentComment: active.parentComment,
        }
      : null,
    activeScenarioStep: scenarioFields.activeScenarioStep,
    pendingScenarioStep: scenarioFields.pendingScenarioStep,
  };
}

async function sessionForUser(
  tg: TelegramUser,
  profile: UserDoc & { familyId: string; userType: RoleUserType },
) {
  const family = await getFamily(profile.familyId);
  const active = await getActiveRequest(profile.familyId);
  const membersRaw = await listFamilyMembers(profile.familyId, tg.id);
  const members = enrichMembersWithWeeklyBudgets(
    membersRaw,
    family.teenWeeklyBudgets ?? {},
  );
  const scenarioFields = await buildScenarioSessionFields(tg.id, profile.userType);
  return buildSessionPayload(tg, profile, family, members, active, scenarioFields);
}

export type MeResponse =
  | {
      needsOnboarding: true;
      telegramId: number;
      displayName: string;
      /** start_param из initData, если invite не удался на сервере */
      inviteParam?: string;
      inviteError?: string;
    }
  | ({ needsOnboarding: false } & ReturnType<typeof buildSessionPayload>);

export async function buildMe(
  user: TelegramUser,
  botToken?: string,
  startParam?: string,
): Promise<MeResponse> {
  await ensureUserRecord(user, botToken);
  const profile = await resolveUser(user.id);
  const display = profile?.displayName || displayName(user);

  if (profile && isOnboardedUser(profile)) {
    if (botToken) {
      schedulePhotoRefresh(profile.familyId, botToken, user);
    }
    const session = await sessionForUser(user, profile);
    return { needsOnboarding: false, ...session };
  }

  const inviteFromInit = startParam?.trim();
  let inviteRaw = inviteFromInit;
  if (!inviteRaw && profile && !isOnboardedUser(profile)) {
    inviteRaw = await consumePendingInvite(user.id);
  }
  if (inviteRaw) {
    try {
      const session = await joinByInviteCode(user, inviteRaw, botToken);
      return { needsOnboarding: false, ...session };
    } catch (e) {
      return {
        needsOnboarding: true,
        telegramId: user.id,
        displayName: display,
        inviteParam: inviteRaw,
        inviteError: e instanceof Error ? e.message : "Не получилось войти по ссылке",
      };
    }
  }

  return {
    needsOnboarding: true,
    telegramId: user.id,
    displayName: display,
  };
}

export async function completeOnboarding(
  tg: TelegramUser,
  userType: RoleUserType,
  mode: OnboardingMode,
  inviteCodeRaw?: string,
  botToken?: string,
) {
  await ensureUserRecord(tg, botToken);
  const existing = await resolveUser(tg.id);
  if (existing && isOnboardedUser(existing)) {
    throw new Error("Ты уже в Fin Bridge — роль менять нельзя");
  }

  const name = displayName(tg);
  const id = String(tg.id);
  let familyId: string;

  if (mode === "create") {
    familyId = db().collection("families").doc().id;
    await db().collection("families").doc(familyId).set(newFamilyDoc());
  } else {
    const inviteCode = (inviteCodeRaw ?? "").trim().toUpperCase();
    if (!inviteCode) {
      throw new Error("Введи код семьи");
    }
    const resolved = await resolveFamilyByInviteCode(inviteCode);
    if (!resolved) {
      throw new Error("Код не найден — проверьте у того, кто уже в семье");
    }
    if (resolved.intendedRole && resolved.intendedRole !== userType) {
      throw new Error(
        resolved.intendedRole === "parent"
          ? "Этот код — для родителя. Попроси ссылку, которую отправили родителю."
          : "Этот код — для подростка. Попроси ссылку, которую отправили ребёнку.",
      );
    }
    familyId = resolved.familyId;
  }

  await db()
    .collection("users")
    .doc(id)
    .set(
      {
        userType,
        familyId,
        displayName: name,
        ...(existing?.createdAt ? {} : { createdAt: FieldValue.serverTimestamp() }),
      },
      { merge: true },
    );

  const me = await buildMe(tg, botToken);
  if (me.needsOnboarding) {
    throw new Error("Не удалось завершить регистрацию");
  }
  const { needsOnboarding: _skip, ...session } = me;
  return session;
}

/** Вступление по invite-ссылке: роль определяется кодом на сервере. */
export async function joinByInviteCode(
  tg: TelegramUser,
  inviteCodeRaw: string,
  botToken?: string,
) {
  await ensureUserRecord(tg, botToken);
  const trimmed = inviteCodeRaw.trim();
  let code = trimmed.toUpperCase();
  let roleHint: RoleUserType | null = null;
  const prefixed = trimmed.match(/^([pt])_(.+)$/i);
  if (prefixed) {
    roleHint = prefixed[1].toLowerCase() === "p" ? "parent" : "teen";
    code = prefixed[2].trim().toUpperCase();
  }
  if (!code) {
    throw new Error("Ссылка без кода — попроси отправить заново");
  }
  const resolved = await resolveFamilyByInviteCode(code);
  if (!resolved) {
    throw new Error(
      "Ссылка устарела — попроси новую кнопку «Отправить ссылку» в разделе «Семья»",
    );
  }
  const role: RoleUserType | null = resolved.intendedRole ?? roleHint;
  if (!role) {
    throw new Error(
      "Не удалось определить роль по ссылке — попроси отправить ссылку ещё раз из раздела «Семья»",
    );
  }
  return completeOnboarding(tg, role, "join", code, botToken);
}

async function requireUser(tg: TelegramUser, type?: RoleUserType): Promise<UserDoc & { familyId: string; userType: RoleUserType }> {
  const profile = await resolveUser(tg.id);
  if (!profile || !isOnboardedUser(profile)) {
    throw new Error("Сначала выберите, кто вы — подросток или родитель");
  }
  if (type && profile.userType !== type) {
    throw new Error(
      type === "teen"
        ? "Это действие только для подростка"
        : "Это действие только для родителя",
    );
  }
  return profile;
}

export async function buildSession(user: TelegramUser) {
  const me = await buildMe(user);
  if (me.needsOnboarding) {
    throw new Error("ONBOARDING_REQUIRED");
  }
  return me;
}

export async function saveWeekBudget(user: TelegramUser, allocation: Allocation) {
  const profile = await requireUser(user, "teen");
  const family = await getFamily(profile.familyId);
  const limit =
    family.teenWeeklyBudgets?.[String(user.id)] ?? WEEKLY_BUDGET;
  const errors = validateAllocation(allocation, limit);
  if (errors.length) return { ok: false as const, errors: errors.map((message) => ({ message })) };

  const familyRef = db().collection("families").doc(profile.familyId);
  await familyRef.update({
    allocation,
    questWeekBudgetCompleted: true,
    skills: FieldValue.arrayUnion("Планирование бюджета"),
  });
  return {
    ok: true as const,
    errors: [],
    user: await sessionForUser(user, profile),
  };
}

export async function saveUnplanned(user: TelegramUser, choice: UnplannedChoice) {
  const profile = await requireUser(user, "teen");
  const family = await getFamily(profile.familyId);
  const next = applyUnplanned(family.allocation, choice);
  await db()
    .collection("families")
    .doc(profile.familyId)
    .update({
      allocation: next,
      questUnplannedCompleted: true,
      unplannedChoice: choice,
      skills: FieldValue.arrayUnion("Приоритизация расходов"),
    });
  return sessionForUser(user, profile);
}

export async function createRequest(
  user: TelegramUser,
  proposedAmount: number,
  explanation: string,
) {
  const profile = await requireUser(user, "teen");
  const family = await getFamily(profile.familyId);
  const current = family.allocation.entertainment;
  const errors = validateRuleChange(current, proposedAmount, explanation);
  if (errors.length) throw new Error(errors.join("; "));

  await db().collection("requests").add({
    familyId: profile.familyId,
    category: "entertainment",
    currentAmount: current,
    proposedAmount,
    explanation: explanation.trim(),
    status: "pending",
    parentComment: "",
    createdAt: FieldValue.serverTimestamp(),
  });

  return sessionForUser(user, profile);
}

export async function startScenario(user: TelegramUser, scenarioId: string) {
  const profile = await requireUser(user, "teen");
  loadScenario(scenarioId);
  const { runId } = await startScenarioRun(user, profile.familyId, scenarioId);
  return { runId, user: await sessionForUser(user, profile) };
}

export async function answerScenario(
  user: TelegramUser,
  runId: string,
  optionId: string,
) {
  const profile = await requireUser(user, "teen");
  const family = await getFamily(profile.familyId);
  const result = await answerScenarioRun(
    user,
    profile.familyId,
    runId,
    optionId,
    family.allocation,
  );
  await applyScenarioAllocationUpdate(
    profile.familyId,
    result.allocationAfter,
    result.completed,
  );
  return {
    ...result,
    user: await sessionForUser(user, profile),
  };
}

export async function decideRequest(
  user: TelegramUser,
  requestId: string,
  action: string,
  comment: string,
) {
  const profile = await requireUser(user, "parent");

  const ref = db().collection("requests").doc(requestId);
  const doc = await ref.get();
  if (!doc.exists) throw new Error("Предложение не найдено");
  const data = doc.data() as RequestDoc;
  if (data.familyId !== profile.familyId) throw new Error("Это не твоя семья");
  if (data.status !== "pending") throw new Error("Уже ответили");

  let status: RequestStatus;
  if (action === "approve_week") status = "approved";
  else if (action === "reject") status = "rejected";
  else if (action === "needs_clarification") status = "needs_clarification";
  else throw new Error("Неизвестное действие");

  await ref.update({ status, parentComment: comment.trim() });

  if (status === "approved") {
    const familyRef = db().collection("families").doc(profile.familyId);
    const family = await getFamily(profile.familyId);
    await familyRef.update({
      allocation: {
        ...family.allocation,
        entertainment: data.proposedAmount,
      },
    });
  }

  return sessionForUser(user, profile);
}

export async function getFamilyView(user: TelegramUser, botToken?: string) {
  const profile = await requireUser(user);
  if (botToken) {
    schedulePhotoRefresh(profile.familyId, botToken, user);
  }
  const family = await getFamily(profile.familyId);
  const membersRaw = await listFamilyMembers(profile.familyId, user.id);
  const members = enrichMembersWithWeeklyBudgets(
    membersRaw,
    family.teenWeeklyBudgets ?? {},
  );
  return {
    familyId: profile.familyId,
    inviteCode: family.inviteCodeTeen ?? family.inviteCode,
    inviteCodeParent: family.inviteCodeParent ?? family.inviteCode,
    inviteCodeTeen: family.inviteCodeTeen ?? family.inviteCode,
    memberCounts: {
      teens: members.filter((m) => m.userType === "teen").length,
      parents: members.filter((m) => m.userType === "parent").length,
      total: members.length,
    },
    members,
  };
}

export async function streamMemberAvatar(
  viewer: TelegramUser,
  targetTelegramId: number,
  botToken: string,
  res: import("express").Response,
): Promise<void> {
  const profile = await requireUser(viewer);
  await serveFamilyMemberAvatar(profile.familyId, targetTelegramId, botToken, res);
}
