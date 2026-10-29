"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateScenarioDefinition = validateScenarioDefinition;
exports.stripScenarioDoc = stripScenarioDoc;
const domain_1 = require("../domain");
const CATEGORY_KEYS = new Set(domain_1.CATEGORY_ORDER);
function validateScenarioDefinition(def) {
    const errors = [];
    const warnings = [];
    if (!def.id?.trim())
        errors.push("Нужен id сценария");
    if (!def.title?.trim())
        errors.push("Нужно название");
    if (!def.startNodeId?.trim())
        errors.push("Нужен startNodeId");
    if (!def.nodes || typeof def.nodes !== "object") {
        errors.push("Нужен объект nodes");
        return { ok: false, errors, warnings };
    }
    const nodeIds = Object.keys(def.nodes);
    if (def.startNodeId && !def.nodes[def.startNodeId]) {
        errors.push("startNodeId не найден среди узлов");
    }
    const reachable = new Set();
    if (def.startNodeId && def.nodes[def.startNodeId]) {
        const stack = [def.startNodeId];
        while (stack.length) {
            const id = stack.pop();
            if (reachable.has(id))
                continue;
            reachable.add(id);
            const node = def.nodes[id];
            for (const opt of node.options ?? []) {
                if (opt.nextNodeId && !opt.terminal)
                    stack.push(opt.nextNodeId);
            }
        }
    }
    for (const nodeId of nodeIds) {
        const node = def.nodes[nodeId];
        if (node.id !== nodeId)
            errors.push(`Узел ${nodeId}: id в теле не совпадает`);
        if (!node.prompt?.trim())
            errors.push(`Узел ${nodeId}: пустой prompt`);
        if (!(node.options?.length ?? 0)) {
            errors.push(`Узел ${nodeId}: нужен хотя бы один вариант ответа`);
        }
        const optionIds = new Set();
        for (const opt of node.options ?? []) {
            if (!opt.id?.trim())
                errors.push(`Узел ${nodeId}: вариант без id`);
            if (optionIds.has(opt.id))
                errors.push(`Узел ${nodeId}: дублирующийся id варианта ${opt.id}`);
            optionIds.add(opt.id);
            if (!opt.label?.trim())
                errors.push(`Узел ${nodeId}/${opt.id}: пустой label`);
            if (opt.terminal && opt.nextNodeId) {
                warnings.push(`Узел ${nodeId}/${opt.id}: terminal и nextNodeId одновременно`);
            }
            if (!opt.terminal && opt.nextNodeId && !def.nodes[opt.nextNodeId]) {
                errors.push(`Узел ${nodeId}/${opt.id}: nextNodeId ${opt.nextNodeId} не существует`);
            }
            for (const eff of opt.effects ?? []) {
                if (eff.type !== "spend")
                    errors.push(`Узел ${nodeId}/${opt.id}: неизвестный effect`);
                if (!CATEGORY_KEYS.has(eff.category)) {
                    errors.push(`Узел ${nodeId}/${opt.id}: категория ${eff.category}`);
                }
                if (!(eff.amount > 0))
                    errors.push(`Узел ${nodeId}/${opt.id}: сумма effect должна быть > 0`);
            }
        }
    }
    for (const id of nodeIds) {
        if (def.startNodeId && !reachable.has(id)) {
            warnings.push(`Узел ${id} недостижим от startNodeId`);
        }
    }
    return { ok: errors.length === 0, errors, warnings };
}
function stripScenarioDoc(data) {
    const { updatedAt, updatedBy, ...rest } = data;
    void updatedAt;
    void updatedBy;
    return rest;
}
//# sourceMappingURL=scenarioValidate.js.map