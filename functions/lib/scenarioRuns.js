"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.findActiveRun = findActiveRun;
exports.buildScenarioSessionFields = buildScenarioSessionFields;
exports.startScenarioRun = startScenarioRun;
exports.answerScenarioRun = answerScenarioRun;
exports.applyScenarioAllocationUpdate = applyScenarioAllocationUpdate;
exports.processDueScenarioSteps = processDueScenarioSteps;
exports.notifyReadyStepIfNeeded = notifyReadyStepIfNeeded;
const firestore_1 = require("firebase-admin/firestore");
const registry_1 = require("./scenarios/registry");
const scenarioEngine_1 = require("./scenarioEngine");
const scenarioNotify_1 = require("./scenarioNotify");
const db = () => (0, firestore_1.getFirestore)();
function runDocToState(doc) {
    return {
        scenarioId: doc.scenarioId,
        scenarioVersion: doc.scenarioVersion,
        status: doc.status === "completed" ? "completed" : "active",
        currentNodeId: doc.currentNodeId,
        stepStatus: doc.stepStatus,
        readyAtMs: doc.readyAt.toMillis(),
        history: doc.history.map((h) => ({
            nodeId: h.nodeId,
            optionId: h.optionId,
            atMs: h.at.toMillis(),
            effects: h.effects,
        })),
    };
}
function stateToFirestoreUpdate(state, historyEntry) {
    const update = {
        status: state.status,
        currentNodeId: state.currentNodeId,
        stepStatus: state.stepStatus,
        readyAt: firestore_1.Timestamp.fromMillis(state.readyAtMs),
        notifiedAt: firestore_1.FieldValue.delete(),
    };
    if (historyEntry) {
        update.history = firestore_1.FieldValue.arrayUnion(historyEntry);
    }
    return update;
}
async function findActiveRun(teenTelegramId, scenarioId) {
    let q = db()
        .collection("scenarioRuns")
        .where("teenTelegramId", "==", teenTelegramId)
        .where("status", "==", "active");
    if (scenarioId) {
        q = q.where("scenarioId", "==", scenarioId);
    }
    const snap = await q.limit(1).get();
    if (snap.empty)
        return null;
    const doc = snap.docs[0];
    return { id: doc.id, doc: doc.data() };
}
async function buildScenarioSessionFields(teenTelegramId, userType) {
    if (userType !== "teen") {
        return { activeScenarioStep: null, pendingScenarioStep: null };
    }
    const active = await findActiveRun(teenTelegramId);
    if (!active) {
        return { activeScenarioStep: null, pendingScenarioStep: null };
    }
    const nowMs = Date.now();
    let state = runDocToState(active.doc);
    state = (0, scenarioEngine_1.materializeDueStep)(state, nowMs);
    if (state !== runDocToState(active.doc)) {
        await db()
            .collection("scenarioRuns")
            .doc(active.id)
            .update({
            stepStatus: state.stepStatus,
            readyAt: firestore_1.Timestamp.fromMillis(state.readyAtMs),
        });
    }
    const scenario = (0, registry_1.loadScenario)(state.scenarioId);
    if (state.stepStatus === "pending") {
        return {
            activeScenarioStep: null,
            pendingScenarioStep: {
                runId: active.id,
                scenarioId: state.scenarioId,
                scenarioTitle: scenario.title,
                readyAt: new Date(state.readyAtMs).toISOString(),
            },
        };
    }
    const { step } = (0, scenarioEngine_1.activeStepForRun)(state, nowMs);
    if (!step) {
        return { activeScenarioStep: null, pendingScenarioStep: null };
    }
    return {
        activeScenarioStep: {
            runId: active.id,
            scenarioId: state.scenarioId,
            scenarioTitle: scenario.title,
            nodeId: step.nodeId,
            prompt: step.prompt,
            options: step.options,
        },
        pendingScenarioStep: null,
    };
}
async function startScenarioRun(user, familyId, scenarioId) {
    (0, registry_1.loadScenario)(scenarioId);
    const existing = await findActiveRun(user.id, scenarioId);
    if (existing) {
        return { runId: existing.id };
    }
    const nowMs = Date.now();
    const state = (0, scenarioEngine_1.startRunState)(scenarioId, nowMs);
    const ref = db().collection("scenarioRuns").doc();
    const doc = {
        scenarioId: state.scenarioId,
        scenarioVersion: state.scenarioVersion,
        familyId,
        teenTelegramId: user.id,
        status: "active",
        currentNodeId: state.currentNodeId,
        stepStatus: state.stepStatus,
        readyAt: firestore_1.Timestamp.fromMillis(state.readyAtMs),
        history: [],
    };
    await ref.set(doc);
    return { runId: ref.id };
}
async function answerScenarioRun(user, familyId, runId, optionId, allocation) {
    const ref = db().collection("scenarioRuns").doc(runId);
    const snap = await ref.get();
    if (!snap.exists)
        throw new Error("Сценарий не найден");
    const doc = snap.data();
    if (doc.teenTelegramId !== user.id)
        throw new Error("Это не твой сценарий");
    if (doc.familyId !== familyId)
        throw new Error("Это не твоя семья");
    if (doc.status !== "active")
        throw new Error("Сценарий уже завершён");
    const nowMs = Date.now();
    let state = runDocToState(doc);
    state = (0, scenarioEngine_1.materializeDueStep)(state, nowMs);
    const allocationBefore = { ...allocation };
    const result = (0, scenarioEngine_1.submitAnswer)(state, optionId, allocation, nowMs);
    const historyEntry = {
        nodeId: state.currentNodeId,
        optionId,
        at: firestore_1.Timestamp.fromMillis(nowMs),
        ...(result.effectsApplied.length ? { effects: result.effectsApplied } : {}),
    };
    await ref.update(stateToFirestoreUpdate(result.run, historyEntry));
    return {
        effectsApplied: result.effectsApplied,
        allocationBefore,
        allocationAfter: result.allocation,
        completed: result.completed,
        nextPendingReadyAt: !result.completed && result.run.stepStatus === "pending"
            ? new Date(result.run.readyAtMs).toISOString()
            : null,
    };
}
async function applyScenarioAllocationUpdate(familyId, allocation, completed) {
    const familyRef = db().collection("families").doc(familyId);
    const update = { allocation };
    if (completed) {
        update.skills = firestore_1.FieldValue.arrayUnion("Приоритизация расходов");
    }
    await familyRef.update(update);
}
async function processDueScenarioSteps(botToken) {
    const now = firestore_1.Timestamp.now();
    const q = await db()
        .collection("scenarioRuns")
        .where("stepStatus", "==", "pending")
        .where("readyAt", "<=", now)
        .limit(50)
        .get();
    let processed = 0;
    for (const docSnap of q.docs) {
        const doc = docSnap.data();
        if (doc.status !== "active")
            continue;
        await docSnap.ref.update({
            stepStatus: "ready",
            notifiedAt: firestore_1.FieldValue.delete(),
        });
        if (botToken) {
            const scenario = (0, registry_1.loadScenario)(doc.scenarioId);
            const node = scenario.nodes[doc.currentNodeId];
            const snippet = node?.prompt.split("\n")[0] ?? scenario.title;
            await (0, scenarioNotify_1.notifyScenarioStepReady)(botToken, doc.teenTelegramId, docSnap.id, snippet);
            await docSnap.ref.update({ notifiedAt: firestore_1.FieldValue.serverTimestamp() });
        }
        processed += 1;
    }
    return processed;
}
async function notifyReadyStepIfNeeded(botToken, runId, teenTelegramId, promptSnippet) {
    const ref = db().collection("scenarioRuns").doc(runId);
    const snap = await ref.get();
    if (!snap.exists)
        return;
    const doc = snap.data();
    if (doc.notifiedAt || doc.stepStatus !== "ready")
        return;
    await (0, scenarioNotify_1.notifyScenarioStepReady)(botToken, teenTelegramId, runId, promptSnippet);
    await ref.update({ notifiedAt: firestore_1.FieldValue.serverTimestamp() });
}
//# sourceMappingURL=scenarioRuns.js.map