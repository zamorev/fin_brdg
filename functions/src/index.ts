import { initializeApp } from "firebase-admin/app";
import { defineString } from "firebase-functions/params";
import { onRequest } from "firebase-functions/v2/https";
import { createApp, setBotTokenProvider } from "./app";

initializeApp();

const telegramBotToken = defineString("TELEGRAM_BOT_TOKEN");
const expressApp = createApp();

setBotTokenProvider(() => telegramBotToken.value());

export const api = onRequest(
  {
    region: "europe-west1",
    cors: true,
  },
  expressApp,
);

export { scenarioStepScheduler } from "./scenarioScheduler";
