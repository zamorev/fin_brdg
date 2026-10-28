"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUser = getUser;
exports.resolveUser = resolveUser;
exports.isOnboardedUser = isOnboardedUser;
exports.ensureUserRecord = ensureUserRecord;
exports.previewInviteCode = previewInviteCode;
exports.getFamily = getFamily;
exports.listFamilyMembers = listFamilyMembers;
exports.getActiveRequest = getActiveRequest;
exports.buildMe = buildMe;
exports.completeOnboarding = completeOnboarding;
exports.joinByInviteCode = joinByInviteCode;
exports.buildSession = buildSession;
exports.saveWeekBudget = saveWeekBudget;
exports.saveUnplanned = saveUnplanned;
exports.createRequest = createRequest;
exports.decideRequest = decideRequest;
exports.getFamilyView = getFamilyView;
exports.streamMemberAvatar = streamMemberAvatar;
const firestore_1 = require("firebase-admin/firestore");
const domain_1 = require("./domain");
const telegram_1 = require("./telegram");
const profilePhoto_1 = require("./profilePhoto");
const db = () => (0, firestore_1.getFirestore)();
function newInviteCode() {
    return Math.random().toString(36).slice(2, 8).toUpperCase();
}
function newFamilyDoc() {
    const inviteCodeParent = newInviteCode();
    let inviteCodeTeen = newInviteCode();
    while (inviteCodeTeen === inviteCodeParent) {
        inviteCodeTeen = newInviteCode();
    }
    return {
        inviteCode: inviteCodeParent,
        inviteCodeParent,
        inviteCodeTeen,
        allocation: { ...domain_1.DEFAULT_ALLOCATION },
        questWeekBudgetCompleted: false,
        questUnplannedCompleted: false,
        level: 3,
        xpToNext: 140,
        skills: [],
    };
}
async function getUser(telegramId) {
    const doc = await db().collection("users").doc(String(telegramId)).get();
    if (!doc.exists)
        return null;
    return doc.data();
}
async function getLegacyMember(telegramId) {
    const doc = await db().collection("members").doc(String(telegramId)).get();
    if (!doc.exists)
        return null;
    const data = doc.data();
    return {
        userType: data.role,
        familyId: data.familyId,
        displayName: data.displayName,
        createdAt: firestore_1.Timestamp.now(),
    };
}
async function resolveUser(telegramId) {
    return (await getUser(telegramId)) ?? (await getLegacyMember(telegramId));
}
function isOnboardedUser(profile) {
    return profile.userType !== "anonymous" && Boolean(profile.familyId);
}
/** Первый заход (в т.ч. по invite): создаём users/{telegramId} с userType anonymous. */
async function ensureUserRecord(tg, botToken) {
    const id = String(tg.id);
    const ref = db().collection("users").doc(id);
    const snap = await ref.get();
    const name = (0, telegram_1.displayName)(tg);
    if (!snap.exists) {
        const doc = {
            userType: "anonymous",
            displayName: name,
            createdAt: firestore_1.Timestamp.now(),
        };
        await ref.set(doc);
        if (botToken) {
            void (0, profilePhoto_1.syncUserProfilePhoto)(tg.id, tg, botToken);
        }
        return doc;
    }
    const data = snap.data();
    if (data.displayName !== name) {
        await ref.set({ displayName: name }, { merge: true });
        return { ...data, displayName: name };
    }
    if (botToken) {
        void (0, profilePhoto_1.syncUserProfilePhoto)(tg.id, tg, botToken);
    }
    return data;
}
async function ensureFamilyInviteCodes(familyId, data) {
    let inviteCodeParent = data.inviteCodeParent ?? data.inviteCode ?? "";
    let inviteCodeTeen = data.inviteCodeTeen ?? "";
    const updates = {};
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
async function resolveFamilyByInviteCode(codeRaw) {
    const code = codeRaw.trim().toUpperCase();
    if (!code)
        return null;
    const tryField = async (field, intendedRole) => {
        const snap = await db()
            .collection("families")
            .where(field, "==", code)
            .limit(1)
            .get();
        if (snap.empty)
            return null;
        return { familyId: snap.docs[0].id, intendedRole };
    };
    return ((await tryField("inviteCodeParent", "parent")) ??
        (await tryField("inviteCodeTeen", "teen")) ??
        (await tryField("inviteCode", null)));
}
async function previewInviteCode(codeRaw) {
    const resolved = await resolveFamilyByInviteCode(codeRaw);
    if (!resolved?.intendedRole)
        return null;
    return { userType: resolved.intendedRole };
}
async function getFamily(familyId) {
    const doc = await db().collection("families").doc(familyId).get();
    if (!doc.exists) {
        throw new Error("Семья не найдена");
    }
    const data = doc.data();
    return ensureFamilyInviteCodes(familyId, {
        ...data,
        inviteCode: data.inviteCode ?? "",
    });
}
async function listFamilyMembers(familyId, selfTelegramId) {
    const q = await db().collection("users").where("familyId", "==", familyId).get();
    const members = [];
    for (const doc of q.docs) {
        const data = doc.data();
        if (!isOnboardedUser(data))
            continue;
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
async function getActiveRequest(familyId) {
    const q = await db()
        .collection("requests")
        .where("familyId", "==", familyId)
        .orderBy("createdAt", "desc")
        .limit(1)
        .get();
    if (q.empty)
        return null;
    const doc = q.docs[0];
    return { id: doc.id, ...doc.data() };
}
function buildSessionPayload(tg, profile, family, members, active) {
    const teens = members.filter((m) => m.userType === "teen").length;
    const parents = members.filter((m) => m.userType === "parent").length;
    return {
        telegramId: tg.id,
        userType: profile.userType,
        displayName: profile.displayName || (0, telegram_1.displayName)(tg),
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
    };
}
async function sessionForUser(tg, profile) {
    const family = await getFamily(profile.familyId);
    const active = await getActiveRequest(profile.familyId);
    const members = await listFamilyMembers(profile.familyId, tg.id);
    return buildSessionPayload(tg, profile, family, members, active);
}
async function buildMe(user, botToken) {
    const profile = await ensureUserRecord(user, botToken);
    if (!isOnboardedUser(profile)) {
        return {
            needsOnboarding: true,
            telegramId: user.id,
            displayName: profile.displayName || (0, telegram_1.displayName)(user),
        };
    }
    if (botToken) {
        (0, profilePhoto_1.schedulePhotoRefresh)(profile.familyId, botToken, user);
    }
    const session = await sessionForUser(user, profile);
    return { needsOnboarding: false, ...session };
}
async function completeOnboarding(tg, userType, mode, inviteCodeRaw, botToken) {
    await ensureUserRecord(tg, botToken);
    const existing = await resolveUser(tg.id);
    if (existing && isOnboardedUser(existing)) {
        throw new Error("Ты уже в Fin Bridge — роль менять нельзя");
    }
    const name = (0, telegram_1.displayName)(tg);
    const id = String(tg.id);
    let familyId;
    if (mode === "create") {
        familyId = db().collection("families").doc().id;
        await db().collection("families").doc(familyId).set(newFamilyDoc());
    }
    else {
        const inviteCode = (inviteCodeRaw ?? "").trim().toUpperCase();
        if (!inviteCode) {
            throw new Error("Введи код семьи");
        }
        const resolved = await resolveFamilyByInviteCode(inviteCode);
        if (!resolved) {
            throw new Error("Код не найден — проверьте у того, кто уже в семье");
        }
        if (resolved.intendedRole && resolved.intendedRole !== userType) {
            throw new Error(resolved.intendedRole === "parent"
                ? "Этот код — для родителя. Попроси ссылку, которую отправили родителю."
                : "Этот код — для подростка. Попроси ссылку, которую отправили ребёнку.");
        }
        familyId = resolved.familyId;
    }
    await db()
        .collection("users")
        .doc(id)
        .set({
        userType,
        familyId,
        displayName: name,
        ...(existing?.createdAt ? {} : { createdAt: firestore_1.FieldValue.serverTimestamp() }),
    }, { merge: true });
    const me = await buildMe(tg, botToken);
    if (me.needsOnboarding) {
        throw new Error("Не удалось завершить регистрацию");
    }
    const { needsOnboarding: _skip, ...session } = me;
    return session;
}
/** Вступление по invite-ссылке: роль определяется кодом на сервере. */
async function joinByInviteCode(tg, inviteCodeRaw, botToken) {
    await ensureUserRecord(tg, botToken);
    const trimmed = inviteCodeRaw.trim();
    let code = trimmed.toUpperCase();
    let roleHint = null;
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
        throw new Error("Ссылка устарела — попроси новую кнопку «Отправить ссылку» в разделе «Семья»");
    }
    const role = resolved.intendedRole ?? roleHint;
    if (!role) {
        throw new Error("Не удалось определить роль по ссылке — попроси отправить ссылку ещё раз из раздела «Семья»");
    }
    return completeOnboarding(tg, role, "join", code, botToken);
}
async function requireUser(tg, type) {
    const profile = await resolveUser(tg.id);
    if (!profile || !isOnboardedUser(profile)) {
        throw new Error("Сначала выберите, кто вы — подросток или родитель");
    }
    if (type && profile.userType !== type) {
        throw new Error(type === "teen"
            ? "Это действие только для подростка"
            : "Это действие только для родителя");
    }
    return profile;
}
async function buildSession(user) {
    const me = await buildMe(user);
    if (me.needsOnboarding) {
        throw new Error("ONBOARDING_REQUIRED");
    }
    return me;
}
async function saveWeekBudget(user, allocation) {
    const profile = await requireUser(user, "teen");
    const errors = (0, domain_1.validateAllocation)(allocation);
    if (errors.length)
        return { ok: false, errors: errors.map((message) => ({ message })) };
    const familyRef = db().collection("families").doc(profile.familyId);
    await familyRef.update({
        allocation,
        questWeekBudgetCompleted: true,
        skills: firestore_1.FieldValue.arrayUnion("Планирование бюджета"),
    });
    return {
        ok: true,
        errors: [],
        user: await sessionForUser(user, profile),
    };
}
async function saveUnplanned(user, choice) {
    const profile = await requireUser(user, "teen");
    const family = await getFamily(profile.familyId);
    const next = (0, domain_1.applyUnplanned)(family.allocation, choice);
    await db()
        .collection("families")
        .doc(profile.familyId)
        .update({
        allocation: next,
        questUnplannedCompleted: true,
        unplannedChoice: choice,
        skills: firestore_1.FieldValue.arrayUnion("Приоритизация расходов"),
    });
    return sessionForUser(user, profile);
}
async function createRequest(user, proposedAmount, explanation) {
    const profile = await requireUser(user, "teen");
    const family = await getFamily(profile.familyId);
    const current = family.allocation.entertainment;
    const errors = (0, domain_1.validateRuleChange)(current, proposedAmount, explanation);
    if (errors.length)
        throw new Error(errors.join("; "));
    await db().collection("requests").add({
        familyId: profile.familyId,
        category: "entertainment",
        currentAmount: current,
        proposedAmount,
        explanation: explanation.trim(),
        status: "pending",
        parentComment: "",
        createdAt: firestore_1.FieldValue.serverTimestamp(),
    });
    return sessionForUser(user, profile);
}
async function decideRequest(user, requestId, action, comment) {
    const profile = await requireUser(user, "parent");
    const ref = db().collection("requests").doc(requestId);
    const doc = await ref.get();
    if (!doc.exists)
        throw new Error("Предложение не найдено");
    const data = doc.data();
    if (data.familyId !== profile.familyId)
        throw new Error("Это не твоя семья");
    if (data.status !== "pending")
        throw new Error("Уже ответили");
    let status;
    if (action === "approve_week")
        status = "approved";
    else if (action === "reject")
        status = "rejected";
    else if (action === "needs_clarification")
        status = "needs_clarification";
    else
        throw new Error("Неизвестное действие");
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
async function getFamilyView(user, botToken) {
    const profile = await requireUser(user);
    if (botToken) {
        (0, profilePhoto_1.schedulePhotoRefresh)(profile.familyId, botToken, user);
    }
    const family = await getFamily(profile.familyId);
    const members = await listFamilyMembers(profile.familyId, user.id);
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
async function streamMemberAvatar(viewer, targetTelegramId, botToken, res) {
    const profile = await requireUser(viewer);
    await (0, profilePhoto_1.serveFamilyMemberAvatar)(profile.familyId, targetTelegramId, botToken, res);
}
//# sourceMappingURL=store.js.map