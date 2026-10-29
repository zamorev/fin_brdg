"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const strict_1 = __importDefault(require("node:assert/strict"));
const domain_1 = require("./domain");
const registry_1 = require("./scenarios/registry");
const scenarioEngine_1 = require("./scenarioEngine");
const cinema = (0, registry_1.loadScenario)("cinema_chain_v1");
(0, node_test_1.describe)("scenarioEngine cinema_chain_v1", () => {
    (0, node_test_1.it)("starts at invite ready", () => {
        const run = (0, scenarioEngine_1.startRunState)(cinema, 1000);
        strict_1.default.equal(run.currentNodeId, "invite");
        strict_1.default.equal(run.stepStatus, "ready");
        const { step } = (0, scenarioEngine_1.activeStepForRun)(run, 1000, cinema);
        strict_1.default.ok(step);
        strict_1.default.equal(step.options.length, 2);
    });
    (0, node_test_1.it)("invite go schedules box_office pending", () => {
        const run = (0, scenarioEngine_1.startRunState)(cinema, 0);
        const result = (0, scenarioEngine_1.submitAnswer)(run, "go", { ...domain_1.DEFAULT_ALLOCATION }, 0, cinema);
        strict_1.default.equal(result.completed, false);
        strict_1.default.equal(result.run.currentNodeId, "box_office");
        strict_1.default.equal(result.run.stepStatus, "pending");
        strict_1.default.equal(result.effectsApplied.length, 0);
        const { step } = (0, scenarioEngine_1.activeStepForRun)(result.run, 1000, cinema);
        strict_1.default.equal(step, null);
        const ready = (0, scenarioEngine_1.materializeDueStep)(result.run, result.run.readyAtMs);
        strict_1.default.equal(ready.stepStatus, "ready");
    });
    (0, node_test_1.it)("box_office yes spends entertainment", () => {
        let run = (0, scenarioEngine_1.startRunState)(cinema, 0);
        run = (0, scenarioEngine_1.submitAnswer)(run, "go", { ...domain_1.DEFAULT_ALLOCATION }, 0, cinema).run;
        run = (0, scenarioEngine_1.materializeDueStep)(run, run.readyAtMs);
        const result = (0, scenarioEngine_1.submitAnswer)(run, "yes", { ...domain_1.DEFAULT_ALLOCATION }, run.readyAtMs, cinema);
        strict_1.default.equal(result.completed, true);
        strict_1.default.equal(result.allocation.entertainment, 0);
        strict_1.default.equal(result.effectsApplied.length, 2);
    });
    (0, node_test_1.it)("invite no_go leads to friends_pay after delay", () => {
        const run = (0, scenarioEngine_1.startRunState)(cinema, 0);
        const result = (0, scenarioEngine_1.submitAnswer)(run, "no_go", { ...domain_1.DEFAULT_ALLOCATION }, 0, cinema);
        strict_1.default.equal(result.run.currentNodeId, "friends_pay");
        strict_1.default.equal(result.run.stepStatus, "pending");
    });
    (0, node_test_1.it)("rejects unknown option", () => {
        const run = (0, scenarioEngine_1.startRunState)(cinema, 0);
        strict_1.default.throws(() => (0, scenarioEngine_1.submitAnswer)(run, "nope", { ...domain_1.DEFAULT_ALLOCATION }, 0, cinema));
    });
});
//# sourceMappingURL=scenarioEngine.test.js.map