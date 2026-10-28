import type { Response } from "express";
import { getFirestore } from "firebase-admin/firestore";
import type { TelegramUser } from "./telegram";
import type { UserDoc } from "./store";

const db = () => getFirestore();

type TelegramApi<T> = { ok: boolean; result?: T; description?: string };

type PhotoSize = { file_id: string; file_unique_id: string; width: number; height: number };

async function botGet<T>(botToken: string, method: string, query: Record<string, string>): Promise<T | null> {
  if (!botToken) return null;
  const qs = new URLSearchParams(query).toString();
  const res = await fetch(`https://api.telegram.org/bot${botToken}/${method}?${qs}`);
  const data = (await res.json()) as TelegramApi<T>;
  if (!data.ok) return null;
  return data.result ?? null;
}

export async function fetchProfilePhotoFilePath(
  telegramId: number,
  botToken: string,
): Promise<string | undefined> {
  const photos = await botGet<{ photos: PhotoSize[][] }>(botToken, "getUserProfilePhotos", {
    user_id: String(telegramId),
    limit: "1",
  });
  const sizes = photos?.photos?.[0];
  if (!sizes?.length) return undefined;
  const largest = sizes[sizes.length - 1];
  const file = await botGet<{ file_path: string }>(botToken, "getFile", {
    file_id: largest.file_id,
  });
  return file?.file_path;
}

/** Обновить фото в users/{id}: photo_url из Mini App или file_path через Bot API. */
export async function syncUserProfilePhoto(
  telegramId: number,
  tg: TelegramUser,
  botToken: string,
): Promise<void> {
  const ref = db().collection("users").doc(String(telegramId));
  const patch: Record<string, string> = {};

  if (tg.photo_url?.startsWith("https://")) {
    patch.photoUrl = tg.photo_url;
  }

  const existing = (await ref.get()).data() as UserDoc | undefined;
  if (!patch.photoUrl && !existing?.photoFilePath && botToken) {
    const filePath = await fetchProfilePhotoFilePath(telegramId, botToken);
    if (filePath) patch.photoFilePath = filePath;
  }

  if (Object.keys(patch).length === 0) return;
  await ref.set(patch, { merge: true });
}

export async function refreshFamilyPhotos(
  familyId: string,
  botToken: string,
  selfTg: TelegramUser,
): Promise<void> {
  await syncUserProfilePhoto(selfTg.id, selfTg, botToken);

  const q = await db().collection("users").where("familyId", "==", familyId).get();
  await Promise.all(
    q.docs.map(async (doc) => {
      const id = Number(doc.id);
      if (Number.isNaN(id) || id === selfTg.id) return;
      const data = doc.data() as UserDoc;
      if (data.photoUrl || data.photoFilePath) return;
      const filePath = await fetchProfilePhotoFilePath(id, botToken);
      if (!filePath) return;
      await doc.ref.set({ photoFilePath: filePath }, { merge: true });
    }),
  );
}

export async function serveFamilyMemberAvatar(
  viewerFamilyId: string,
  targetTelegramId: number,
  botToken: string,
  res: Response,
): Promise<void> {
  const ref = db().collection("users").doc(String(targetTelegramId));
  const doc = await ref.get();
  if (!doc.exists) {
    res.status(404).end();
    return;
  }
  const data = doc.data() as UserDoc;
  if (data.familyId !== viewerFamilyId) {
    res.status(403).json({ error: "Нет доступа" });
    return;
  }

  if (data.photoUrl?.startsWith("https://")) {
    const img = await fetch(data.photoUrl);
    if (!img.ok) {
      res.status(404).end();
      return;
    }
    res.setHeader("Content-Type", img.headers.get("content-type") ?? "image/jpeg");
    res.setHeader("Cache-Control", "private, max-age=86400");
    res.send(Buffer.from(await img.arrayBuffer()));
    return;
  }

  let filePath = data.photoFilePath;
  if (!filePath && botToken) {
    filePath = await fetchProfilePhotoFilePath(targetTelegramId, botToken);
    if (filePath) {
      await ref.set({ photoFilePath: filePath }, { merge: true });
    }
  }

  if (!filePath || !botToken) {
    res.status(404).end();
    return;
  }

  const fileUrl = `https://api.telegram.org/file/bot${botToken}/${filePath}`;
  const img = await fetch(fileUrl);
  if (!img.ok) {
    res.status(404).end();
    return;
  }
  res.setHeader("Content-Type", img.headers.get("content-type") ?? "image/jpeg");
  res.setHeader("Cache-Control", "private, max-age=86400");
  res.send(Buffer.from(await img.arrayBuffer()));
}

/** Fire-and-forget: не блокируем ответ API. */
export function schedulePhotoRefresh(
  familyId: string,
  botToken: string,
  tg: TelegramUser,
): void {
  if (!botToken) return;
  void refreshFamilyPhotos(familyId, botToken, tg).catch(() => {
    /* фото необязательны */
  });
}
