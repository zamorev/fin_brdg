import { getFirestore, FieldValue, Timestamp } from "firebase-admin/firestore";
import {
  applyUnplanned,
  DEFAULT_ALLOCATION,
  type Allocation,
  type RequestStatus,
  type UnplannedChoice,
  validateAllocation,
  validateRuleChange,
} from "./domain";

export type { Allocation };
import type { TelegramUser } from "./telegram";
import { displayName } from "./telegram";

const db = () => getFirestore();

/** Один Telegram-аккаунт — один пользователь с фиксированным типом. */
export type UserType = "teen" | "parent";

export type UserDoc = {
  userType: UserType;
  familyId: string;
  displayName: string;
  createdAt: Timestamp;
};

/** Общие правила и прогресс квестов MVP (на всю семью; позже — per-teen). */
export type FamilyDoc = {
  inviteCode: string;
  allocation: Allocation;
  questWeekBudgetCompleted: boolean;
  questUnplannedCompleted: boolean;
  unplannedChoice?: UnplannedChoice;
  level: number;
  xpToNext: number;
  skills: string[];
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
  displayName: string;
  userType: UserType;
  isYou: boolean;
};

export type OnboardingMode = "create" | "join";

function newInviteCode(): string {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

function newFamilyDoc(inviteCode: string): FamilyDoc {
  return {
    inviteCode,
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

export async function getFamily(familyId: string): Promise<FamilyDoc> {
  const doc = await db().collection("families").doc(familyId).get();
  if (!doc.exists) {
    throw new Error("Семья не найдена");
  }
  const data = doc.data() as FamilyDoc;
  return {
    ...data,
    inviteCode: data.inviteCode ?? "",
  };
}

export async function listFamilyMembers(
  familyId: string,
  selfTelegramId: number,
): Promise<FamilyMemberView[]> {
  const q = await db().collection("users").where("familyId", "==", familyId).get();
  const members: FamilyMemberView[] = q.docs.map((doc) => {
    const data = doc.data() as UserDoc;
    return {
      displayName: data.displayName,
      userType: data.userType,
      isYou: doc.id === String(selfTelegramId),
    };
  });

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
  profile: UserDoc,
  family: FamilyDoc,
  members: FamilyMemberView[],
  active: ({ id: string } & RequestDoc) | null,
) {
  const teens = members.filter((m) => m.userType === "teen").length;
  const parents = members.filter((m) => m.userType === "parent").length;

  return {
    telegramId: tg.id,
    userType: profile.userType,
    displayName: profile.displayName || displayName(tg),
    family: {
      familyId: profile.familyId,
      inviteCode: family.inviteCode,
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
  };
}

async function sessionForUser(tg: TelegramUser, profile: UserDoc) {
  const family = await getFamily(profile.familyId);
  const active = await getActiveRequest(profile.familyId);
  const members = await listFamilyMembers(profile.familyId, tg.id);
  return buildSessionPayload(tg, profile, family, members, active);
}

export type MeResponse =
  | { needsOnboarding: true; telegramId: number; displayName: string }
  | ({ needsOnboarding: false } & ReturnType<typeof buildSessionPayload>);

export async function buildMe(user: TelegramUser): Promise<MeResponse> {
  const profile = await resolveUser(user.id);
  if (!profile) {
    return {
      needsOnboarding: true,
      telegramId: user.id,
      displayName: displayName(user),
    };
  }
  const session = await sessionForUser(user, profile);
  return { needsOnboarding: false, ...session };
}

export async function completeOnboarding(
  tg: TelegramUser,
  userType: UserType,
  mode: OnboardingMode,
  inviteCodeRaw?: string,
) {
  const existing = await resolveUser(tg.id);
  if (existing) {
    throw new Error("Ты уже в Fin Bridge — роль менять нельзя");
  }

  const name = displayName(tg);
  const id = String(tg.id);
  let familyId: string;

  if (mode === "create") {
    familyId = db().collection("families").doc().id;
    const inviteCode = newInviteCode();
    await db().collection("families").doc(familyId).set(newFamilyDoc(inviteCode));
  } else {
    const inviteCode = (inviteCodeRaw ?? "").trim().toUpperCase();
    if (!inviteCode) {
      throw new Error("Введи код семьи");
    }
    const snap = await db()
      .collection("families")
      .where("inviteCode", "==", inviteCode)
      .limit(1)
      .get();
    if (snap.empty) {
      throw new Error("Код не найден — проверьте у того, кто уже в семье");
    }
    familyId = snap.docs[0].id;
  }

  await db()
    .collection("users")
    .doc(id)
    .set({
      userType,
      familyId,
      displayName: name,
      createdAt: FieldValue.serverTimestamp(),
    });

  const me = await buildMe(tg);
  if (me.needsOnboarding) {
    throw new Error("Не удалось завершить регистрацию");
  }
  const { needsOnboarding: _skip, ...session } = me;
  return session;
}

async function requireUser(tg: TelegramUser, type?: UserType): Promise<UserDoc> {
  const profile = await resolveUser(tg.id);
  if (!profile) {
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
  const errors = validateAllocation(allocation);
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

export async function getFamilyView(user: TelegramUser) {
  const profile = await requireUser(user);
  const family = await getFamily(profile.familyId);
  const members = await listFamilyMembers(profile.familyId, user.id);
  return {
    familyId: profile.familyId,
    inviteCode: family.inviteCode,
    memberCounts: {
      teens: members.filter((m) => m.userType === "teen").length,
      parents: members.filter((m) => m.userType === "parent").length,
      total: members.length,
    },
    members,
  };
}
