import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { loadScenario, listScenarioIds } from "../scenarios/registry";
import type { ScenarioDefinition } from "../scenarios/types";
import { CINEMA_CHAIN_V1 } from "../scenarios/cinema_chain_v1";
import { stripScenarioDoc, validateScenarioDefinition } from "./scenarioValidate";

const db = () => getFirestore();

export async function resolveScenario(scenarioId: string): Promise<ScenarioDefinition> {
  const snap = await db().collection("cmsScenarios").doc(scenarioId).get();
  if (snap.exists) {
    return stripScenarioDoc(snap.data() as Record<string, unknown>);
  }
  return loadScenario(scenarioId);
}

export type ScenarioListItem = {
  id: string;
  title: string;
  version: number;
  source: "firestore" | "git";
};

export async function listScenariosForAdmin(): Promise<ScenarioListItem[]> {
  const ids = new Set(listScenarioIds());
  const snap = await db().collection("cmsScenarios").get();
  for (const doc of snap.docs) ids.add(doc.id);

  const items: ScenarioListItem[] = [];
  for (const id of ids) {
    const fs = snap.docs.find((d) => d.id === id);
    if (fs) {
      const def = stripScenarioDoc(fs.data() as Record<string, unknown>);
      items.push({ id, title: def.title, version: def.version, source: "firestore" });
    } else {
      const def = loadScenario(id);
      items.push({ id, title: def.title, version: def.version, source: "git" });
    }
  }
  return items.sort((a, b) => a.id.localeCompare(b.id));
}

export async function getScenarioForAdmin(id: string): Promise<ScenarioDefinition> {
  return resolveScenario(id);
}

export async function saveScenarioForAdmin(
  def: ScenarioDefinition,
  updatedBy: string,
): Promise<{ warnings: string[] }> {
  const validation = validateScenarioDefinition(def);
  if (!validation.ok) {
    throw new Error(validation.errors.join("; "));
  }

  const prev = await db().collection("cmsScenarios").doc(def.id).get();
  let prevVersion = 0;
  if (prev.exists) {
    prevVersion = Number(stripScenarioDoc(prev.data() as Record<string, unknown>).version ?? 0);
  } else if (listScenarioIds().includes(def.id)) {
    prevVersion = loadScenario(def.id).version;
  }
  const next: ScenarioDefinition = {
    ...def,
    version: prev.exists ? Math.max(def.version ?? 0, prevVersion) + 1 : Math.max(1, def.version ?? 1),
  };

  await db()
    .collection("cmsScenarios")
    .doc(def.id)
    .set({
      ...next,
      updatedAt: FieldValue.serverTimestamp(),
      updatedBy,
    });

  return { warnings: validation.warnings };
}

export async function seedCmsScenariosIfEmpty(updatedBy: string): Promise<number> {
  const snap = await db().collection("cmsScenarios").limit(1).get();
  if (!snap.empty) return 0;
  await db()
    .collection("cmsScenarios")
    .doc(CINEMA_CHAIN_V1.id)
    .set({
      ...CINEMA_CHAIN_V1,
      updatedAt: FieldValue.serverTimestamp(),
      updatedBy,
    });
  return 1;
}

export function removeNodeFromScenario(
  def: ScenarioDefinition,
  nodeId: string,
): { scenario: ScenarioDefinition; warnings: string[] } {
  const warnings: string[] = [];
  if (!def.nodes[nodeId]) {
    throw new Error("Шаг не найден");
  }
  if (Object.keys(def.nodes).length <= 1) {
    throw new Error("В сценарии должен остаться хотя бы один шаг");
  }
  if (def.startNodeId === nodeId) {
    throw new Error("Сначала выбери другой стартовый шаг — этот удалить нельзя");
  }

  const nodes: ScenarioDefinition["nodes"] = {};
  for (const [id, node] of Object.entries(def.nodes)) {
    if (id === nodeId) continue;
    nodes[id] = {
      ...node,
      options: node.options.map((opt) => {
        if (opt.nextNodeId !== nodeId) return opt;
        warnings.push(
          `Ответ «${opt.label}» на шаге ${id}: переход на удалённый шаг сброшен, сценарий завершится после ответа`,
        );
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

export async function deleteScenarioNodeForAdmin(
  scenarioId: string,
  nodeId: string,
  updatedBy: string,
): Promise<{ scenario: ScenarioDefinition; warnings: string[] }> {
  const def = await resolveScenario(scenarioId);
  if (def.id !== scenarioId) {
    throw new Error("Сценарий не найден");
  }
  const { scenario, warnings } = removeNodeFromScenario(def, nodeId);
  const saveResult = await saveScenarioForAdmin(scenario, updatedBy);
  return { scenario, warnings: [...warnings, ...saveResult.warnings] };
}

const SCENARIO_ID_RE = /^[a-z][a-z0-9_]{2,48}$/i;

export async function createScenarioForAdmin(
  rawId: string,
  rawTitle: string,
  updatedBy: string,
): Promise<ScenarioDefinition> {
  const id = rawId.trim();
  const title = rawTitle.trim() || "Новый сценарий";
  if (!SCENARIO_ID_RE.test(id)) {
    throw new Error("id: от 3 символов, латиница, цифры и _ (например shop_trip_v1)");
  }
  const ref = db().collection("cmsScenarios").doc(id);
  if ((await ref.get()).exists) {
    throw new Error("Сценарий с таким id уже есть в CMS");
  }
  if (listScenarioIds().includes(id)) {
    throw new Error("Такой id занят встроенным сценарием — выбери другой");
  }

  const startNodeId = "start";
  const def: ScenarioDefinition = {
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
    updatedAt: FieldValue.serverTimestamp(),
    updatedBy,
  });
  return def;
}

export async function deleteScenarioForAdmin(
  scenarioId: string,
  updatedBy: string,
): Promise<{ removed: "cms" | "overlay"; fallbackGit: boolean }> {
  void updatedBy;
  const id = scenarioId.trim();
  const ref = db().collection("cmsScenarios").doc(id);
  const snap = await ref.get();
  if (!snap.exists) {
    throw new Error("Сценарий не найден в CMS (удалять нечего)");
  }
  const inGit = listScenarioIds().includes(id);
  await ref.delete();
  return { removed: inGit ? "overlay" : "cms", fallbackGit: inGit };
}
