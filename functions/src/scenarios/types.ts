import type { CategoryKey } from "../domain";

export type SpendEffect = { type: "spend"; category: CategoryKey; amount: number };

export type ScenarioOption = {
  id: string;
  label: string;
  effects?: SpendEffect[];
  nextNodeId?: string;
  /** Пауза перед показом nextNodeId; 0 или omit = сразу ready. */
  delayMs?: number;
  terminal?: boolean;
};

export type ScenarioNode = {
  id: string;
  prompt: string;
  options: ScenarioOption[];
};

export type ScenarioDefinition = {
  id: string;
  version: number;
  title: string;
  startNodeId: string;
  nodes: Record<string, ScenarioNode>;
};
