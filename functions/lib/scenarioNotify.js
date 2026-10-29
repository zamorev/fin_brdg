"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.notifyScenarioStepReady = notifyScenarioStepReady;
const telegramBotApi_1 = require("./telegramBotApi");
const messages_1 = require("./cms/messages");
const WEBAPP_URL = process.env.WEBAPP_URL ?? "https://fin-brdg.web.app";
async function notifyScenarioStepReady(botToken, teenTelegramId, runId, promptSnippet) {
    const suffix = await (0, messages_1.getMessage)("bot.scenario.notify.suffix");
    const button = await (0, messages_1.getMessage)("bot.scenario.notify.button");
    const url = `${WEBAPP_URL}?run=${encodeURIComponent(runId)}`;
    await (0, telegramBotApi_1.telegramApi)(botToken, "sendMessage", {
        chat_id: teenTelegramId,
        text: `${promptSnippet}\n\n${suffix}`,
        reply_markup: {
            inline_keyboard: [
                [
                    {
                        text: button,
                        web_app: { url },
                    },
                ],
            ],
        },
    });
}
//# sourceMappingURL=scenarioNotify.js.map