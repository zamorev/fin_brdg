import { telegramApi } from "./telegramBotApi";

const WEBAPP_URL = process.env.WEBAPP_URL ?? "https://fin-brdg.web.app";

export async function notifyScenarioStepReady(
  botToken: string,
  teenTelegramId: number,
  runId: string,
  promptSnippet: string,
): Promise<void> {
  const url = `${WEBAPP_URL}?run=${encodeURIComponent(runId)}`;
  await telegramApi(botToken, "sendMessage", {
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
