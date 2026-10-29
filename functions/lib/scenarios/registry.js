"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CINEMA_CHAIN_V1 = void 0;
exports.loadScenario = loadScenario;
exports.listScenarioIds = listScenarioIds;
const cinema_chain_v1_1 = require("./cinema_chain_v1");
Object.defineProperty(exports, "CINEMA_CHAIN_V1", { enumerable: true, get: function () { return cinema_chain_v1_1.CINEMA_CHAIN_V1; } });
const REGISTRY = {
    [cinema_chain_v1_1.CINEMA_CHAIN_V1.id]: cinema_chain_v1_1.CINEMA_CHAIN_V1,
};
function loadScenario(scenarioId) {
    const scenario = REGISTRY[scenarioId];
    if (!scenario) {
        throw new Error("Сценарий не найден");
    }
    return scenario;
}
function listScenarioIds() {
    return Object.keys(REGISTRY);
}
//# sourceMappingURL=registry.js.map