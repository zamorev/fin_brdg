#!/usr/bin/env node
/**
 * Демо-семья для локальной разработки — ТОЛЬКО эмулятор Firestore (demo-fin-brdg).
 *   node scripts/seed-demo-family.mjs
 *
 * Подросток 100001 «Dev Teen» (квест 1 пройден) + родитель 200002 «Dev Parent»,
 * ожидающий запрос на развлечения. Повторный запуск сбрасывает демо к исходному виду.
 * Вход за роль: см. docs/LOCAL_DEV.md (VITE_DEV_TG_USER).
 */
import { createRequire } from "node:module";

// firebase-admin стоит в functions/node_modules.
const require = createRequire(new URL("../functions/package.json", import.meta.url));
const { initializeApp } = require("firebase-admin/app");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");

const PROJECT_ID = "demo-fin-brdg";
const emulatorHost = (process.env.FIRESTORE_EMULATOR_HOST ??= "127.0.0.1:8080");
if (!/^(127\.0\.0\.1|localhost|\[::1\]):\d+$/.test(emulatorHost)) {
  console.error(`FIRESTORE_EMULATOR_HOST=${emulatorHost} — не локальный эмулятор. Останавливаюсь.`);
  process.exit(1);
}

initializeApp({ projectId: PROJECT_ID });
const db = getFirestore();

const FAMILY_ID = "demo-family";
const TEEN_ID = 100001;
const PARENT_ID = 200002;
const REQUEST_ID = "demo-request";

// Распределение после квеста 1: сумма 1500, минимумы CATEGORY_MINIMUMS (functions/src/domain.ts) соблюдены.
const allocation = {
  transport: 300,
  food: 500,
  entertainment: 300,
  savings: 300,
  reserve: 100,
};

await db.collection("families").doc(FAMILY_ID).set({
  inviteCode: "DEMOPA",
  inviteCodeParent: "DEMOPA",
  inviteCodeTeen: "DEMOTE",
  allocation,
  questWeekBudgetCompleted: true,
  questUnplannedCompleted: false,
  level: 3,
  xpToNext: 140,
  skills: ["Планирование бюджета"],
  teenWeeklyBudgets: { [String(TEEN_ID)]: 1500 },
});
console.log(`families/${FAMILY_ID} OK (квест 1 пройден)`);

for (const [id, userType, displayName] of [
  [TEEN_ID, "teen", "Dev Teen"],
  [PARENT_ID, "parent", "Dev Parent"],
]) {
  await db.collection("users").doc(String(id)).set({
    userType,
    familyId: FAMILY_ID,
    displayName,
    createdAt: FieldValue.serverTimestamp(),
  });
  console.log(`users/${id} (${userType}) OK`);
}

await db.collection("requests").doc(REQUEST_ID).set({
  familyId: FAMILY_ID,
  category: "entertainment",
  currentAmount: allocation.entertainment,
  proposedAmount: 400,
  explanation: "Хочу сходить с друзьями в кино в субботу",
  status: "pending",
  parentComment: "",
  createdAt: FieldValue.serverTimestamp(),
});
console.log(`requests/${REQUEST_ID} (pending) OK`);

console.log("\nГотово. Подросток — по умолчанию; родитель — VITE_DEV_TG_USER=\"200002:Dev Parent\".");
