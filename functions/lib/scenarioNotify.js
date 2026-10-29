"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.notifyScenarioStepReady = notifyScenarioStepReady;
const telegramBotApi_1 = require("./telegramBotApi");
const WEBAPP_URL = process.env.WEBAPP_URL ?? "https://fin-brdg.web.app";
async function notifyScenarioStepReady(botToken, teenTelegramId, runId, promptSnippet) {
    const url = `${WEBAPP_URL}?run=${encodeURIComponent(runId)}`;
    await (0, telegramBotApi_1.telegramApi)(botToken, "sendMessage", {
        chat_id: teenTelegramId,
        text: `${promptSnippet}\n\nОткрой Fin Bridge — там ждёт твой выбор.`,
        reply_markup: {
            inline_keyboard: [
                [
                    {
                        text: "Ответить в Fin Bridge",
                        web_app: { url },
                    },
                ],
            ],
        },
    });
}
//# sourceMappingURL=scenarioNotify.js.map