#!/usr/bin/env node
/**
 * Seed Firestore demo family + optional members.
 *
 * По умолчанию — ТОЛЬКО эмулятор (demo-fin-brdg, 127.0.0.1:8080):
 *   TEEN_TELEGRAM_ID=123 PARENT_TELEGRAM_ID=456 node scripts/seed-v2-firestore.mjs
 *
 * Prod — лишь явно, с подтверждением (вводом имени проекта):
 *   TEEN_TELEGRAM_ID=123 node scripts/seed-v2-firestore.mjs --prod
 *   Requires: gcloud auth application-default login  OR  GOOGLE_APPLICATION_CREDENTIALS
 */
import { createRequire } from "node:module";
import { createInterface } from "node:readline/promises";

// firebase-admin стоит в functions/node_modules.
const require = createRequire(new URL("../functions/package.json", import.meta.url));
const { initializeApp, applicationDefault } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");

const PROD_PROJECT = "fin-brdg";
const prod = process.argv.includes("--prod");
const teenId = process.env.TEEN_TELEGRAM_ID;
const parentId = process.env.PARENT_TELEGRAM_ID;

let projectId;
if (prod) {
  projectId = PROD_PROJECT;
  delete process.env.FIRESTORE_EMULATOR_HOST;
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const answer = await rl.question(
    `⚠️  Запись в PROD Firestore (${PROD_PROJECT}). Для подтверждения введи имя проекта: `,
  );
  rl.close();
  if (answer.trim() !== PROD_PROJECT) {
    console.error("Отменено.");
    process.exit(1);
  }
  initializeApp({ credential: applicationDefault(), projectId });
} else {
  projectId = "demo-fin-brdg";
  process.env.FIRESTORE_EMULATOR_HOST ??= "127.0.0.1:8080";
  console.log(`Эмулятор Firestore ${process.env.FIRESTORE_EMULATOR_HOST} (${projectId})`);
  initializeApp({ projectId });
}

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
