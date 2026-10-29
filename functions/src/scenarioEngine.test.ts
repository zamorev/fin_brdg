import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_ALLOCATION } from "./domain";
import { loadScenario } from "./scenarios/registry";
import {
  activeStepForRun,
  materializeDueStep,
  startRunState,
  submitAnswer,
} from "./scenarioEngine";

const cinema = loadScenario("cinema_chain_v1");

describe("scenarioEngine cinema_chain_v1", () => {
  it("starts at invite ready", () => {
    const run = startRunState(cinema, 1000);
    assert.equal(run.currentNodeId, "invite");
    assert.equal(run.stepStatus, "ready");
    const { step } = activeStepForRun(run, 1000, cinema);
    assert.ok(step);
    assert.equal(step!.options.length, 2);
  });

  it("invite go schedules box_office pending", () => {
    const run = startRunState(cinema, 0);
    const result = submitAnswer(run, "go", { ...DEFAULT_ALLOCATION }, 0, cinema);
    assert.equal(result.completed, false);
    assert.equal(result.run.currentNodeId, "box_office");
    assert.equal(result.run.stepStatus, "pending");
    assert.equal(result.effectsApplied.length, 0);
    const { step } = activeStepForRun(result.run, 1000, cinema);
    assert.equal(step, null);
    const ready = materializeDueStep(result.run, result.run.readyAtMs);
    assert.equal(ready.stepStatus, "ready");
  });

  it("box_office yes spends entertainment", () => {
    let run = startRunState(cinema, 0);
    run = submitAnswer(run, "go", { ...DEFAULT_ALLOCATION }, 0, cinema).run;
    run = materializeDueStep(run, run.readyAtMs);
    const result = submitAnswer(run, "yes", { ...DEFAULT_ALLOCATION }, run.readyAtMs, cinema);
    assert.equal(result.completed, true);
    assert.equal(result.allocation.entertainment, 0);
    assert.equal(result.effectsApplied.length, 2);
  });

  it("invite no_go leads to friends_pay after delay", () => {
    const run = startRunState(cinema, 0);
    const result = submitAnswer(run, "no_go", { ...DEFAULT_ALLOCATION }, 0, cinema);
    assert.equal(result.run.currentNodeId, "friends_pay");
    assert.equal(result.run.stepStatus, "pending");
  });

  it("rejects unknown option", () => {
    const run = startRunState(cinema, 0);
    assert.throws(() => submitAnswer(run, "nope", { ...DEFAULT_ALLOCATION }, 0, cinema));
  });
});
