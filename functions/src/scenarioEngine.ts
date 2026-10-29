import type { Allocation, SpendEffect } from "./domain";
import { applyScenarioEffects } from "./domain";
import type { ScenarioDefinition, ScenarioNode, ScenarioOption } from "./scenarios/types";

export type ScenarioRunState = {
  scenarioId: string;
  scenarioVersion: number;
  status: "active" | "completed";
  currentNodeId: string;
  stepStatus: "ready" | "pending";
  readyAtMs: number;
  history: Array<{
    nodeId: string;
    optionId: string;
    atMs: number;
    effects?: SpendEffect[];
  }>;
};

export type ScenarioStepView = {
  nodeId: string;
  prompt: string;
  options: Array<{ id: string; label: string }>;
};

export function getNode(scenario: ScenarioDefinition, nodeId: string): ScenarioNode {
  const node = scenario.nodes[nodeId];
  if (!node) throw new Error("Узел сценария не найден");
  return node;
}

export function nodeToStepView(node: ScenarioNode): ScenarioStepView {
  return {
    nodeId: node.id,
    prompt: node.prompt,
    options: node.options.map((o) => ({ id: o.id, label: o.label })),
  };
}

export function startRunState(scenario: ScenarioDefinition, nowMs: number): ScenarioRunState {
  return {
    scenarioId: scenario.id,
    scenarioVersion: scenario.version,
    status: "active",
    currentNodeId: scenario.startNodeId,
    stepStatus: "ready",
    readyAtMs: nowMs,
    history: [],
  };
}

function findOption(node: ScenarioNode, optionId: string): ScenarioOption {
  const option = node.options.find((o) => o.id === optionId);
  if (!option) throw new Error("Такого варианта нет");
  return option;
}

export type SubmitAnswerResult = {
  run: ScenarioRunState;
  allocation: Allocation;
  effectsApplied: SpendEffect[];
  completed: boolean;
};

export function submitAnswer(
  run: ScenarioRunState,
  optionId: string,
  allocation: Allocation,
  nowMs: number,
  scenario: ScenarioDefinition,
): SubmitAnswerResult {
  if (run.status !== "active") {
    throw new Error("Сценарий уже завершён");
  }
  if (run.stepStatus !== "ready") {
    throw new Error("Следующий шаг ещё не готов — загляни позже");
  }

  const already = run.history.find((h) => h.nodeId === run.currentNodeId);
  if (already) {
    throw new Error("На этот шаг уже ответили");
  }

  const node = getNode(scenario, run.currentNodeId);
  const option = findOption(node, optionId);
  const effects = option.effects ?? [];
  const nextAllocation = effects.length ? applyScenarioEffects(allocation, effects) : allocation;

  const historyEntry = {
    nodeId: run.currentNodeId,
    optionId,
    atMs: nowMs,
    ...(effects.length ? { effects } : {}),
  };

  const history = [...run.history, historyEntry];

  if (option.terminal || !option.nextNodeId) {
    return {
      run: {
        ...run,
        status: "completed",
        stepStatus: "ready",
        readyAtMs: nowMs,
        history,
      },
      allocation: nextAllocation,
      effectsApplied: effects,
      completed: true,
    };
  }

  const delayMs = option.delayMs ?? 0;
  const readyAtMs = nowMs + delayMs;
  return {
    run: {
      ...run,
      currentNodeId: option.nextNodeId,
      stepStatus: delayMs > 0 ? "pending" : "ready",
      readyAtMs,
      history,
    },
    allocation: nextAllocation,
    effectsApplied: effects,
    completed: false,
  };
}

/** Переводит pending → ready, если наступило readyAt. */
export function materializeDueStep(run: ScenarioRunState, nowMs: number): ScenarioRunState {
  if (run.status !== "active" || run.stepStatus !== "pending") {
    return run;
  }
  if (nowMs < run.readyAtMs) {
    return run;
  }
  return { ...run, stepStatus: "ready" };
}

export function activeStepForRun(
  run: ScenarioRunState,
  nowMs: number,
  scenario: ScenarioDefinition,
): { run: ScenarioRunState; step: ScenarioStepView | null } {
  const materialized = materializeDueStep(run, nowMs);
  if (materialized.status !== "active" || materialized.stepStatus !== "ready") {
    return { run: materialized, step: null };
  }
  const node = getNode(scenario, materialized.currentNodeId);
  return { run: materialized, step: nodeToStepView(node) };
}
