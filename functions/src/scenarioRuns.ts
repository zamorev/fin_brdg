import { getFirestore, FieldValue, Timestamp } from "firebase-admin/firestore";
import type { TelegramUser } from "./telegram";
import type { Allocation, SpendEffect } from "./domain";
import { resolveScenario } from "./cms/scenarios";
import {
  activeStepForRun,
  materializeDueStep,
  startRunState,
  submitAnswer,
  type ScenarioRunState,
} from "./scenarioEngine";
import { notifyScenarioStepReady } from "./scenarioNotify";

const db = () => getFirestore();

export type ScenarioHistoryEntry = {
  nodeId: string;
  optionId: string;
  at: Timestamp;
  effects?: SpendEffect[];
};

export type ScenarioRunDoc = {
  scenarioId: string;
  scenarioVersion: number;
  familyId: string;
  teenTelegramId: number;
  status: "active" | "completed" | "cancelled";
  currentNodeId: string;
  stepStatus: "ready" | "pending";
  readyAt: Timestamp;
  notifiedAt?: Timestamp;
  history: ScenarioHistoryEntry[];
};

function runDocToState(doc: ScenarioRunDoc): ScenarioRunState {
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

function stateToFirestoreUpdate(state: ScenarioRunState, historyEntry?: ScenarioHistoryEntry) {
  const update: Record<string, unknown> = {
    status: state.status,
    currentNodeId: state.currentNodeId,
    stepStatus: state.stepStatus,
    readyAt: Timestamp.fromMillis(state.readyAtMs),
    notifiedAt: FieldValue.delete(),
  };
  if (historyEntry) {
    update.history = FieldValue.arrayUnion(historyEntry);
  }
  return update;
}

export type ScenarioStepPayload = {
  runId: string;
  scenarioId: string;
  scenarioTitle: string;
  nodeId: string;
  prompt: string;
  options: Array<{ id: string; label: string }>;
};

export type PendingScenarioPayload = {
  runId: string;
  scenarioId: string;
  scenarioTitle: string;
  readyAt: string;
};

export async function findActiveRun(
  teenTelegramId: number,
  scenarioId?: string,
): Promise<{ id: string; doc: ScenarioRunDoc } | null> {
  let q = db()
    .collection("scenarioRuns")
    .where("teenTelegramId", "==", teenTelegramId)
    .where("status", "==", "active");
  if (scenarioId) {
    q = q.where("scenarioId", "==", scenarioId);
  }
  const snap = await q.limit(1).get();
  if (snap.empty) return null;
  const doc = snap.docs[0];
  return { id: doc.id, doc: doc.data() as ScenarioRunDoc };
}

export async function buildScenarioSessionFields(
  teenTelegramId: number,
  userType: string,
): Promise<{
  activeScenarioStep: ScenarioStepPayload | null;
  pendingScenarioStep: PendingScenarioPayload | null;
}> {
  if (userType !== "teen") {
    return { activeScenarioStep: null, pendingScenarioStep: null };
  }
  const active = await findActiveRun(teenTelegramId);
  if (!active) {
    return { activeScenarioStep: null, pendingScenarioStep: null };
  }

  const nowMs = Date.now();
  let state = runDocToState(active.doc);
  state = materializeDueStep(state, nowMs);

  if (state !== runDocToState(active.doc)) {
    await db()
      .collection("scenarioRuns")
      .doc(active.id)
      .update({
        stepStatus: state.stepStatus,
        readyAt: Timestamp.fromMillis(state.readyAtMs),
      });
  }

  const scenario = await resolveScenario(state.scenarioId);

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

  const { step } = activeStepForRun(state, nowMs, scenario);
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

export async function startScenarioRun(
  user: TelegramUser,
  familyId: string,
  scenarioId: string,
): Promise<{ runId: string }> {
  const existing = await findActiveRun(user.id, scenarioId);
  if (existing) {
    return { runId: existing.id };
  }

  const nowMs = Date.now();
  const scenario = await resolveScenario(scenarioId);
  const state = startRunState(scenario, nowMs);
  const ref = db().collection("scenarioRuns").doc();
  const doc: ScenarioRunDoc = {
    scenarioId: state.scenarioId,
    scenarioVersion: state.scenarioVersion,
    familyId,
    teenTelegramId: user.id,
    status: "active",
    currentNodeId: state.currentNodeId,
    stepStatus: state.stepStatus,
    readyAt: Timestamp.fromMillis(state.readyAtMs),
    history: [],
  };
  await ref.set(doc);
  return { runId: ref.id };
}

export type AnswerScenarioResult = {
  effectsApplied: SpendEffect[];
  allocationBefore: Allocation;
  allocationAfter: Allocation;
  completed: boolean;
  nextPendingReadyAt: string | null;
};

export async function answerScenarioRun(
  user: TelegramUser,
  familyId: string,
  runId: string,
  optionId: string,
  allocation: Allocation,
): Promise<AnswerScenarioResult> {
  const ref = db().collection("scenarioRuns").doc(runId);
  const snap = await ref.get();
  if (!snap.exists) throw new Error("Сценарий не найден");
  const doc = snap.data() as ScenarioRunDoc;
  if (doc.teenTelegramId !== user.id) throw new Error("Это не твой сценарий");
  if (doc.familyId !== familyId) throw new Error("Это не твоя семья");
  if (doc.status !== "active") throw new Error("Сценарий уже завершён");

  const nowMs = Date.now();
  let state = runDocToState(doc);
  state = materializeDueStep(state, nowMs);

  const allocationBefore = { ...allocation };
  const scenario = await resolveScenario(state.scenarioId);
  const result = submitAnswer(state, optionId, allocation, nowMs, scenario);

  const historyEntry: ScenarioHistoryEntry = {
    nodeId: state.currentNodeId,
    optionId,
    at: Timestamp.fromMillis(nowMs),
    ...(result.effectsApplied.length ? { effects: result.effectsApplied } : {}),
  };

  await ref.update(stateToFirestoreUpdate(result.run, historyEntry));

  return {
    effectsApplied: result.effectsApplied,
    allocationBefore,
    allocationAfter: result.allocation,
    completed: result.completed,
    nextPendingReadyAt:
      !result.completed && result.run.stepStatus === "pending"
        ? new Date(result.run.readyAtMs).toISOString()
        : null,
  };
}

export async function applyScenarioAllocationUpdate(
  familyId: string,
  allocation: Allocation,
  completed: boolean,
): Promise<void> {
  const familyRef = db().collection("families").doc(familyId);
  const update: Record<string, unknown> = { allocation };
  if (completed) {
    update.skills = FieldValue.arrayUnion("Приоритизация расходов");
  }
  await familyRef.update(update);
}

export async function processDueScenarioSteps(botToken: string): Promise<number> {
  const now = Timestamp.now();
  const q = await db()
    .collection("scenarioRuns")
    .where("stepStatus", "==", "pending")
    .where("readyAt", "<=", now)
    .limit(50)
    .get();

  let processed = 0;
  for (const docSnap of q.docs) {
    const doc = docSnap.data() as ScenarioRunDoc;
    if (doc.status !== "active") continue;

    await docSnap.ref.update({
      stepStatus: "ready",
      notifiedAt: FieldValue.delete(),
    });

    if (botToken) {
      const scenario = await resolveScenario(doc.scenarioId);
      const node = scenario.nodes[doc.currentNodeId];
      const snippet = node?.prompt.split("\n")[0] ?? scenario.title;
      await notifyScenarioStepReady(botToken, doc.teenTelegramId, docSnap.id, snippet);
      await docSnap.ref.update({ notifiedAt: FieldValue.serverTimestamp() });
    }
    processed += 1;
  }
  return processed;
}

export async function notifyReadyStepIfNeeded(
  botToken: string,
  runId: string,
  teenTelegramId: number,
  promptSnippet: string,
): Promise<void> {
  const ref = db().collection("scenarioRuns").doc(runId);
  const snap = await ref.get();
  if (!snap.exists) return;
  const doc = snap.data() as ScenarioRunDoc;
  if (doc.notifiedAt || doc.stepStatus !== "ready") return;
  await notifyScenarioStepReady(botToken, teenTelegramId, runId, promptSnippet);
  await ref.update({ notifiedAt: FieldValue.serverTimestamp() });
}
