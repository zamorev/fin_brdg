"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.invalidateMessageCache = invalidateMessageCache;
exports.getMessage = getMessage;
exports.getAllContentStrings = getAllContentStrings;
exports.listAdminMessages = listAdminMessages;
exports.setAdminMessage = setAdminMessage;
exports.seedCmsMessagesIfEmpty = seedCmsMessagesIfEmpty;
const firestore_1 = require("firebase-admin/firestore");
const catalog_1 = require("./catalog");
const db = () => (0, firestore_1.getFirestore)();
const cache = new Map();
const CACHE_MS = 5000;
function invalidateMessageCache(key) {
    if (key)
        cache.delete(key);
    else
        cache.clear();
}
async function getMessage(key, params) {
    const entry = catalog_1.CATALOG_BY_KEY.get(key);
    const fallback = entry?.defaultText ?? key;
    const hit = cache.get(key);
    if (hit && Date.now() - hit.at < CACHE_MS) {
        return params ? (0, catalog_1.interpolate)(hit.text, params) : hit.text;
    }
    const snap = await db().collection("cmsMessages").doc(key).get();
    const text = snap.exists ? String(snap.data()?.text ?? fallback) : fallback;
    cache.set(key, { text, at: Date.now() });
    return params ? (0, catalog_1.interpolate)(text, params) : text;
}
async function getAllContentStrings() {
    const base = (0, catalog_1.defaultStringsRecord)();
    const snap = await db().collection("cmsMessages").get();
    for (const doc of snap.docs) {
        base[doc.id] = String(doc.data().text ?? base[doc.id] ?? "");
    }
    return base;
}
async function listAdminMessages() {
    const snap = await db().collection("cmsMessages").get();
    const overrides = new Map(snap.docs.map((d) => [d.id, String(d.data().text ?? "")]));
    return catalog_1.MESSAGE_CATALOG.map((entry) => {
        const override = overrides.get(entry.key);
        return {
            ...entry,
            text: override ?? entry.defaultText,
            isOverride: override !== undefined,
        };
    });
}
async function setAdminMessage(key, text, updatedBy) {
    if (!catalog_1.CATALOG_BY_KEY.has(key)) {
        throw new Error("Неизвестный ключ сообщения");
    }
    const trimmed = text.trim();
    if (!trimmed)
        throw new Error("Текст не может быть пустым");
    if (trimmed.length > 4000)
        throw new Error("Слишком длинный текст");
    await db()
        .collection("cmsMessages")
        .doc(key)
        .set({
        text: trimmed,
        updatedAt: firestore_1.FieldValue.serverTimestamp(),
        updatedBy,
    });
    invalidateMessageCache(key);
}
async function seedCmsMessagesIfEmpty(updatedBy) {
    const snap = await db().collection("cmsMessages").limit(1).get();
    if (!snap.empty)
        return 0;
    const batch = db().batch();
    for (const entry of catalog_1.MESSAGE_CATALOG) {
        const ref = db().collection("cmsMessages").doc(entry.key);
        batch.set(ref, {
            text: entry.defaultText,
            updatedAt: firestore_1.FieldValue.serverTimestamp(),
            updatedBy,
        });
    }
    await batch.commit();
    invalidateMessageCache();
    return catalog_1.MESSAGE_CATALOG.length;
}
//# sourceMappingURL=messages.js.map