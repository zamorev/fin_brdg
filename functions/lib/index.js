"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.scenarioStepScheduler = exports.api = void 0;
const app_1 = require("firebase-admin/app");
const params_1 = require("firebase-functions/params");
const https_1 = require("firebase-functions/v2/https");
const app_2 = require("./app");
(0, app_1.initializeApp)();
const telegramBotToken = (0, params_1.defineString)("TELEGRAM_BOT_TOKEN");
const expressApp = (0, app_2.createApp)();
(0, app_2.setBotTokenProvider)(() => telegramBotToken.value());
exports.api = (0, https_1.onRequest)({
    region: "europe-west1",
    cors: true,
}, expressApp);
var scenarioScheduler_1 = require("./scenarioScheduler");
Object.defineProperty(exports, "scenarioStepScheduler", { enumerable: true, get: function () { return scenarioScheduler_1.scenarioStepScheduler; } });
//# sourceMappingURL=index.js.map