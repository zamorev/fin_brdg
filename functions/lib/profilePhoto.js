"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetchProfilePhotoFilePath = fetchProfilePhotoFilePath;
exports.syncUserProfilePhoto = syncUserProfilePhoto;
exports.refreshFamilyPhotos = refreshFamilyPhotos;
exports.serveFamilyMemberAvatar = serveFamilyMemberAvatar;
exports.schedulePhotoRefresh = schedulePhotoRefresh;
const firestore_1 = require("firebase-admin/firestore");
const db = () => (0, firestore_1.getFirestore)();
async function botGet(botToken, method, query) {
    if (!botToken)
        return null;
    const qs = new URLSearchParams(query).toString();
    const res = await fetch(`https://api.telegram.org/bot${botToken}/${method}?${qs}`);
    const data = (await res.json());
    if (!data.ok)
        return null;
    return data.result ?? null;
}
async function fetchProfilePhotoFilePath(telegramId, botToken) {
    const photos = await botGet(botToken, "getUserProfilePhotos", {
        user_id: String(telegramId),
        limit: "1",
    });
    const sizes = photos?.photos?.[0];
    if (!sizes?.length)
        return undefined;
    const largest = sizes[sizes.length - 1];
    const file = await botGet(botToken, "getFile", {
        file_id: largest.file_id,
    });
    return file?.file_path;
}
/** Обновить фото в users/{id}: photo_url из Mini App или file_path через Bot API. */
async function syncUserProfilePhoto(telegramId, tg, botToken) {
    const ref = db().collection("users").doc(String(telegramId));
    const patch = {};
    if (tg.photo_url?.startsWith("https://")) {
        patch.photoUrl = tg.photo_url;
    }
    const existing = (await ref.get()).data();
    if (!patch.photoUrl && !existing?.photoFilePath && botToken) {
        const filePath = await fetchProfilePhotoFilePath(telegramId, botToken);
        if (filePath)
            patch.photoFilePath = filePath;
    }
    if (Object.keys(patch).length === 0)
        return;
    await ref.set(patch, { merge: true });
}
async function refreshFamilyPhotos(familyId, botToken, selfTg) {
    await syncUserProfilePhoto(selfTg.id, selfTg, botToken);
    const q = await db().collection("users").where("familyId", "==", familyId).get();
    await Promise.all(q.docs.map(async (doc) => {
        const id = Number(doc.id);
        if (Number.isNaN(id) || id === selfTg.id)
            return;
        const data = doc.data();
        if (data.photoUrl || data.photoFilePath)
            return;
        const filePath = await fetchProfilePhotoFilePath(id, botToken);
        if (!filePath)
            return;
        await doc.ref.set({ photoFilePath: filePath }, { merge: true });
    }));
}
async function serveFamilyMemberAvatar(viewerFamilyId, targetTelegramId, botToken, res) {
    const ref = db().collection("users").doc(String(targetTelegramId));
    const doc = await ref.get();
    if (!doc.exists) {
        res.status(404).end();
        return;
    }
    const data = doc.data();
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
function schedulePhotoRefresh(familyId, botToken, tg) {
    if (!botToken)
        return;
    void refreshFamilyPhotos(familyId, botToken, tg).catch(() => {
        /* фото необязательны */
    });
}
//# sourceMappingURL=profilePhoto.js.map