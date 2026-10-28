#!/usr/bin/env node
/**
 * Seed Firestore demo family + optional members.
 * Usage:
 *   TEEN_TELEGRAM_ID=123 PARENT_TELEGRAM_ID=456 node scripts/seed-v2-firestore.mjs
 * Requires: gcloud auth application-default login  OR  GOOGLE_APPLICATION_CREDENTIALS
 */
import { initializeApp, applicationDefault } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const projectId = process.env.FIREBASE_PROJECT ?? "fin-brdg";
const teenId = process.env.TEEN_TELEGRAM_ID;
const parentId = process.env.PARENT_TELEGRAM_ID;

initializeApp({
  credential: applicationDefault(),
  projectId,
});

const db = getFirestore();

const family = {
  allocation: {
    transport: 300,
    food: 500,
    entertainment: 400,
    savings: 200,
    reserve: 100,
  },
  questWeekBudgetCompleted: false,
  questUnplannedCompleted: false,
  level: 3,
  xpToNext: 140,
  skills: ["Планирование бюджета"],
};

await db.collection("families").doc("demo").set(family, { merge: true });
console.log("families/demo OK");

if (teenId) {
  await db
    .collection("members")
    .doc(String(teenId))
    .set({
      familyId: "demo",
      role: "teen",
      displayName: "Подросток",
    });
  console.log(`members/${teenId} (teen) OK`);
}

if (parentId) {
  await db
    .collection("members")
    .doc(String(parentId))
    .set({
      familyId: "demo",
      role: "parent",
      displayName: "Родитель",
    });
  console.log(`members/${parentId} (parent) OK`);
}

if (!teenId && !parentId) {
  console.log(
    "Подсказка: задайте TEEN_TELEGRAM_ID и PARENT_TELEGRAM_ID для привязки аккаунтов.",
  );
}
