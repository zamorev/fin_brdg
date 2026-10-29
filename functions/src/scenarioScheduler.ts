import { onSchedule } from "firebase-functions/v2/scheduler";
import { defineString } from "firebase-functions/params";
import { processDueScenarioSteps } from "./scenarioRuns";

const telegramBotToken = defineString("TELEGRAM_BOT_TOKEN");

export const scenarioStepScheduler = onSchedule(
  {
    schedule: "every 5 minutes",
    region: "europe-west1",
  },
  async () => {
    const token = telegramBotToken.value();
    const count = await processDueScenarioSteps(token);
    if (count > 0) {
      console.log("scenario steps ready", count);
    }
  },
);
