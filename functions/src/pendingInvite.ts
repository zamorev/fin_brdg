import { FieldValue, getFirestore, Timestamp } from "firebase-admin/firestore";

const COL = "pendingInvites";
const TTL_MS = 48 * 60 * 60 * 1000;

const db = () => getFirestore();

export async function savePendingInvite(telegramId: number, inviteParam: string): Promise<void> {
  await db()
    .collection(COL)
    .doc(String(telegramId))
    .set({
      inviteParam,
      createdAt: FieldValue.serverTimestamp(),
      expiresAt: Timestamp.fromMillis(Date.now() + TTL_MS),
    });
}

export async function consumePendingInvite(telegramId: number): Promise<string | undefined> {
  const ref = db().collection(COL).doc(String(telegramId));
  const doc = await ref.get();
  if (!doc.exists) return undefined;
  const data = doc.data() as { inviteParam?: string; expiresAt?: Timestamp };
  const expiresAt = data.expiresAt?.toMillis() ?? 0;
  if (expiresAt < Date.now()) {
    await ref.delete();
    return undefined;
  }
  const param = data.inviteParam?.trim();
  await ref.delete();
  return param || undefined;
}
