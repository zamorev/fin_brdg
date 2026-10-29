"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.scenarioStepScheduler = void 0;
const scheduler_1 = require("firebase-functions/v2/scheduler");
const params_1 = require("firebase-functions/params");
const scenarioRuns_1 = require("./scenarioRuns");
const telegramBotToken = (0, params_1.defineString)("TELEGRAM_BOT_TOKEN");
exports.scenarioStepScheduler = (0, scheduler_1.onSchedule)({
    schedule: "every 5 minutes",
    region: "europe-west1",
}, async () => {
    const token = telegramBotToken.value();
    const count = await (0, scenarioRuns_1.processDueScenarioSteps)(token);
    if (count > 0) {
        console.log("scenario steps ready", count);
    }
});
//# sourceMappingURL=scenarioScheduler.js.map