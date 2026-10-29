"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getNode = getNode;
exports.nodeToStepView = nodeToStepView;
exports.startRunState = startRunState;
exports.submitAnswer = submitAnswer;
exports.materializeDueStep = materializeDueStep;
exports.activeStepForRun = activeStepForRun;
const domain_1 = require("./domain");
function getNode(scenario, nodeId) {
    const node = scenario.nodes[nodeId];
    if (!node)
        throw new Error("Узел сценария не найден");
    return node;
}
function nodeToStepView(node) {
    return {
        nodeId: node.id,
        prompt: node.prompt,
        options: node.options.map((o) => ({ id: o.id, label: o.label })),
    };
}
function startRunState(scenario, nowMs) {
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
function findOption(node, optionId) {
    const option = node.options.find((o) => o.id === optionId);
    if (!option)
        throw new Error("Такого варианта нет");
    return option;
}
function submitAnswer(run, optionId, allocation, nowMs, scenario) {
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
    const nextAllocation = effects.length ? (0, domain_1.applyScenarioEffects)(allocation, effects) : allocation;
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
function materializeDueStep(run, nowMs) {
    if (run.status !== "active" || run.stepStatus !== "pending") {
        return run;
    }
    if (nowMs < run.readyAtMs) {
        return run;
    }
    return { ...run, stepStatus: "ready" };
}
function activeStepForRun(run, nowMs, scenario) {
    const materialized = materializeDueStep(run, nowMs);
    if (materialized.status !== "active" || materialized.stepStatus !== "ready") {
        return { run: materialized, step: null };
    }
    const node = getNode(scenario, materialized.currentNodeId);
    return { run: materialized, step: nodeToStepView(node) };
}
//# sourceMappingURL=scenarioEngine.js.map