import { getFirestore, FieldValue } from "firebase-admin/firestore";
import {
  CATALOG_BY_KEY,
  MESSAGE_CATALOG,
  defaultStringsRecord,
  interpolate,
  type CatalogEntry,
} from "./catalog";

const db = () => getFirestore();

const cache = new Map<string, { text: string; at: number }>();
const CACHE_MS = 5000;

export function invalidateMessageCache(key?: string): void {
  if (key) cache.delete(key);
  else cache.clear();
}

export async function getMessage(
  key: string,
  params?: Record<string, string | number>,
): Promise<string> {
  const entry = CATALOG_BY_KEY.get(key);
  const fallback = entry?.defaultText ?? key;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_MS) {
    return params ? interpolate(hit.text, params) : hit.text;
  }
  const snap = await db().collection("cmsMessages").doc(key).get();
  const text = snap.exists ? String(snap.data()?.text ?? fallback) : fallback;
  cache.set(key, { text, at: Date.now() });
  return params ? interpolate(text, params) : text;
}

export async function getAllContentStrings(): Promise<Record<string, string>> {
  const base = defaultStringsRecord();
  const snap = await db().collection("cmsMessages").get();
  for (const doc of snap.docs) {
    base[doc.id] = String(doc.data().text ?? base[doc.id] ?? "");
  }
  return base;
}

export type AdminMessageRow = CatalogEntry & {
  text: string;
  isOverride: boolean;
};

export async function listAdminMessages(): Promise<AdminMessageRow[]> {
  const snap = await db().collection("cmsMessages").get();
  const overrides = new Map(snap.docs.map((d) => [d.id, String(d.data().text ?? "")]));
  return MESSAGE_CATALOG.map((entry) => {
    const override = overrides.get(entry.key);
    return {
      ...entry,
      text: override ?? entry.defaultText,
      isOverride: override !== undefined,
    };
  });
}

export async function setAdminMessage(
  key: string,
  text: string,
  updatedBy: string,
): Promise<void> {
  if (!CATALOG_BY_KEY.has(key)) {
    throw new Error("Неизвестный ключ сообщения");
  }
  const trimmed = text.trim();
  if (!trimmed) throw new Error("Текст не может быть пустым");
  if (trimmed.length > 4000) throw new Error("Слишком длинный текст");
  await db()
    .collection("cmsMessages")
    .doc(key)
    .set({
      text: trimmed,
      updatedAt: FieldValue.serverTimestamp(),
      updatedBy,
    });
  invalidateMessageCache(key);
}

export async function seedCmsMessagesIfEmpty(updatedBy: string): Promise<number> {
  const snap = await db().collection("cmsMessages").limit(1).get();
  if (!snap.empty) return 0;
  const batch = db().batch();
  for (const entry of MESSAGE_CATALOG) {
    const ref = db().collection("cmsMessages").doc(entry.key);
    batch.set(ref, {
      text: entry.defaultText,
      updatedAt: FieldValue.serverTimestamp(),
      updatedBy,
    });
  }
  await batch.commit();
  invalidateMessageCache();
  return MESSAGE_CATALOG.length;
}
