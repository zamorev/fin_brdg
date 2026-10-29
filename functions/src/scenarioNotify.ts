import { telegramApi } from "./telegramBotApi";
import { getMessage } from "./cms/messages";

const WEBAPP_URL = process.env.WEBAPP_URL ?? "https://fin-brdg.web.app";

export async function notifyScenarioStepReady(
  botToken: string,
  teenTelegramId: number,
  runId: string,
  promptSnippet: string,
): Promise<void> {
  const suffix = await getMessage("bot.scenario.notify.suffix");
  const button = await getMessage("bot.scenario.notify.button");
  const url = `${WEBAPP_URL}?run=${encodeURIComponent(runId)}`;
  await telegramApi(botToken, "sendMessage", {
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
