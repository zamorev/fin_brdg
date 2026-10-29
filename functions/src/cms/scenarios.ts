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
  const prevVersion = prev.exists
    ? Number(stripScenarioDoc(prev.data() as Record<string, unknown>).version ?? 0)
    : loadScenario(def.id).version;
  const next: ScenarioDefinition = {
    ...def,
    version: Math.max(def.version ?? 0, prevVersion) + 1,
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
