"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.savePendingInvite = savePendingInvite;
exports.consumePendingInvite = consumePendingInvite;
const firestore_1 = require("firebase-admin/firestore");
const COL = "pendingInvites";
const TTL_MS = 48 * 60 * 60 * 1000;
const db = () => (0, firestore_1.getFirestore)();
async function savePendingInvite(telegramId, inviteParam) {
    await db()
        .collection(COL)
        .doc(String(telegramId))
        .set({
        inviteParam,
        createdAt: firestore_1.FieldValue.serverTimestamp(),
        expiresAt: firestore_1.Timestamp.fromMillis(Date.now() + TTL_MS),
    });
}
async function consumePendingInvite(telegramId) {
    const ref = db().collection(COL).doc(String(telegramId));
    const doc = await ref.get();
    if (!doc.exists)
        return undefined;
    const data = doc.data();
    const expiresAt = data.expiresAt?.toMillis() ?? 0;
    if (expiresAt < Date.now()) {
        await ref.delete();
        return undefined;
    }
    const param = data.inviteParam?.trim();
    await ref.delete();
    return param || undefined;
}
//# sourceMappingURL=pendingInvite.js.map