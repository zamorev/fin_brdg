"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveScenario = resolveScenario;
exports.listScenariosForAdmin = listScenariosForAdmin;
exports.getScenarioForAdmin = getScenarioForAdmin;
exports.saveScenarioForAdmin = saveScenarioForAdmin;
exports.seedCmsScenariosIfEmpty = seedCmsScenariosIfEmpty;
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
    const prevVersion = prev.exists
        ? Number((0, scenarioValidate_1.stripScenarioDoc)(prev.data()).version ?? 0)
        : (0, registry_1.loadScenario)(def.id).version;
    const next = {
        ...def,
        version: Math.max(def.version ?? 0, prevVersion) + 1,
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
//# sourceMappingURL=scenarios.js.map