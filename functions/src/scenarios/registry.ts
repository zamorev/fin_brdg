import { CINEMA_CHAIN_V1 } from "./cinema_chain_v1";
import type { ScenarioDefinition } from "./types";

const REGISTRY: Record<string, ScenarioDefinition> = {
  [CINEMA_CHAIN_V1.id]: CINEMA_CHAIN_V1,
};

export function loadScenario(scenarioId: string): ScenarioDefinition {
  const scenario = REGISTRY[scenarioId];
  if (!scenario) {
    throw new Error("Сценарий не найден");
  }
  return scenario;
}

export function listScenarioIds(): string[] {
  return Object.keys(REGISTRY);
}

export { CINEMA_CHAIN_V1 };
