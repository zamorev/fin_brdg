"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveScenario = resolveScenario;
exports.listScenariosForAdmin = listScenariosForAdmin;
exports.getScenarioForAdmin = getScenarioForAdmin;
exports.saveScenarioForAdmin = saveScenarioForAdmin;
exports.seedCmsScenariosIfEmpty = seedCmsScenariosIfEmpty;
exports.removeNodeFromScenario = removeNodeFromScenario;
exports.deleteScenarioNodeForAdmin = deleteScenarioNodeForAdmin;
exports.createScenarioForAdmin = createScenarioForAdmin;
exports.deleteScenarioForAdmin = deleteScenarioForAdmin;
const firestore_1 = require("firebase-admin/firestore");
const registry_1 = require("../scenarios/registry");
const cinema_chain_v1_1 = require("../scenarios/cinema_chain_v1");
const scenarioValidate_1 = require("./scenarioValidate");
const db = () => (0, firestore_1.getFirestore)();
async function resolveScenario(scenarioId) {
    const snap = await db().collection("cmsScenarios").doc(scenarioId).get();
    if (snap.exists) {
        return (0, scenarioValidate_1.stripScenarioDoc)(snap.data());
    }
    return (0, registry_1.loadScenario)(scenarioId);
}
async function listScenariosForAdmin() {
    const ids = new Set((0, registry_1.listScenarioIds)());
    const snap = await db().collection("cmsScenarios").get();
    for (const doc of snap.docs)
        ids.add(doc.id);
    const items = [];
    for (const id of ids) {
        const fs = snap.docs.find((d) => d.id === id);
        if (fs) {
            const def = (0, scenarioValidate_1.stripScenarioDoc)(fs.data());
            items.push({ id, title: def.title, version: def.version, source: "firestore" });
        }
        else {
            const def = (0, registry_1.loadScenario)(id);
            items.push({ id, title: def.title, version: def.version, source: "git" });
        }
    }
    return items.sort((a, b) => a.id.localeCompare(b.id));
}
async function getScenarioForAdmin(id) {
    return resolveScenario(id);
}
async function saveScenarioForAdmin(def, updatedBy) {
    const validation = (0, scenarioValidate_1.validateScenarioDefinition)(def);
    if (!validation.ok) {
        throw new Error(validation.errors.join("; "));
    }
    const prev = await db().collection("cmsScenarios").doc(def.id).get();
    let prevVersion = 0;
    if (prev.exists) {
        prevVersion = Number((0, scenarioValidate_1.stripScenarioDoc)(prev.data()).version ?? 0);
    }
    else if ((0, registry_1.listScenarioIds)().includes(def.id)) {
        prevVersion = (0, registry_1.loadScenario)(def.id).version;
    }
    const next = {
        ...def,
        version: prev.exists ? Math.max(def.version ?? 0, prevVersion) + 1 : Math.max(1, def.version ?? 1),
    };
    await db()
        .collection("cmsScenarios")
        .doc(def.id)
        .set({
        ...next,
        updatedAt: firestore_1.FieldValue.serverTimestamp(),
        updatedBy,
    });
    return { warnings: validation.warnings };
}
async function seedCmsScenariosIfEmpty(updatedBy) {
    const snap = await db().collection("cmsScenarios").limit(1).get();
    if (!snap.empty)
        return 0;
    await db()
        .collection("cmsScenarios")
        .doc(cinema_chain_v1_1.CINEMA_CHAIN_V1.id)
        .set({
        ...cinema_chain_v1_1.CINEMA_CHAIN_V1,
        updatedAt: firestore_1.FieldValue.serverTimestamp(),
        updatedBy,
    });
    return 1;
}
function removeNodeFromScenario(def, nodeId) {
    const warnings = [];
    if (!def.nodes[nodeId]) {
        throw new Error("Шаг не найден");
    }
    if (Object.keys(def.nodes).length <= 1) {
        throw new Error("В сценарии должен остаться хотя бы один шаг");
    }
    if (def.startNodeId === nodeId) {
        throw new Error("Сначала выбери другой стартовый шаг — этот удалить нельзя");
    }
    const nodes = {};
    for (const [id, node] of Object.entries(def.nodes)) {
        if (id === nodeId)
            continue;
        nodes[id] = {
            ...node,
            options: node.options.map((opt) => {
                if (opt.nextNodeId !== nodeId)
                    return opt;
                warnings.push(`Ответ «${opt.label}» на шаге ${id}: переход на удалённый шаг сброшен, сценарий завершится после ответа`);
                return {
                    ...opt,
                    nextNodeId: undefined,
                    terminal: true,
                    delayMs: undefined,
                };
            }),
        };
    }
    return { scenario: { ...def, nodes }, warnings };
}
async function deleteScenarioNodeForAdmin(scenarioId, nodeId, updatedBy) {
    const def = await resolveScenario(scenarioId);
    if (def.id !== scenarioId) {
        throw new Error("Сценарий не найден");
    }
    const { scenario, warnings } = removeNodeFromScenario(def, nodeId);
    const saveResult = await saveScenarioForAdmin(scenario, updatedBy);
    return { scenario, warnings: [...warnings, ...saveResult.warnings] };
}
const SCENARIO_ID_RE = /^[a-z][a-z0-9_]{2,48}$/i;
async function createScenarioForAdmin(rawId, rawTitle, updatedBy) {
    const id = rawId.trim();
    const title = rawTitle.trim() || "Новый сценарий";
    if (!SCENARIO_ID_RE.test(id)) {
        throw new Error("id: от 3 символов, латиница, цифры и _ (например shop_trip_v1)");
    }
    const ref = db().collection("cmsScenarios").doc(id);
    if ((await ref.get()).exists) {
        throw new Error("Сценарий с таким id уже есть в CMS");
    }
    if ((0, registry_1.listScenarioIds)().includes(id)) {
        throw new Error("Такой id занят встроенным сценарием — выбери другой");
    }
    const startNodeId = "start";
    const def = {
        id,
        version: 1,
        title,
        startNodeId,
        nodes: {
            [startNodeId]: {
                id: startNodeId,
                prompt: "Текст первого шага",
                options: [{ id: "finish", label: "Готово", terminal: true }],
            },
        },
    };
    await ref.set({
        ...def,
        updatedAt: firestore_1.FieldValue.serverTimestamp(),
        updatedBy,
    });
    return def;
}
async function deleteScenarioForAdmin(scenarioId, updatedBy) {
    void updatedBy;
    const id = scenarioId.trim();
    const ref = db().collection("cmsScenarios").doc(id);
    const snap = await ref.get();
    if (!snap.exists) {
        throw new Error("Сценарий не найден в CMS (удалять нечего)");
    }
    const inGit = (0, registry_1.listScenarioIds)().includes(id);
    await ref.delete();
    return { removed: inGit ? "overlay" : "cms", fallbackGit: inGit };
}
//# sourceMappingURL=scenarios.js.map