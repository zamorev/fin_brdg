import { botStartDeepLink, normalizeInviteParam } from "./inviteParam";
import { savePendingInvite } from "./pendingInvite";

const WEBAPP_URL = process.env.WEBAPP_URL ?? "https://fin-brdg.web.app";

type TelegramUser = { id: number; first_name?: string };
type TelegramMessage = {
  message_id: number;
  from?: TelegramUser;
  chat: { id: number };
  text?: string;
};
type TelegramUpdate = { update_id: number; message?: TelegramMessage };

function extractStartPayload(text: string): string | undefined {
  const trimmed = text.trim();
  const match = trimmed.match(/^\/start(?:@[\w_]+)?(?:\s+(.+))?$/i);
  return match?.[1]?.trim();
}

async function telegramApi(botToken: string, method: string, body: object): Promise<void> {
  const res = await fetch(`https://api.telegram.org/bot${botToken}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.text();
    console.error("telegram api error", method, err);
  }
}

export async function handleTelegramUpdate(update: TelegramUpdate, botToken: string): Promise<void> {
  const message = update.message;
  if (!message?.text || !message.from?.id) return;

  const payload = extractStartPayload(message.text);
  if (payload === undefined && !message.text.startsWith("/start")) return;

  const chatId = message.chat.id;
  const userId = message.from.id;

  if (!payload) {
    await telegramApi(botToken, "sendMessage", {
      chat_id: chatId,
      text: "Привет 👋\n\nКвесты про бюджет — в Mini App. Жми кнопку «Fin Bridge» внизу или приходи по ссылке от семьи.",
    });
    return;
  }

  const inviteParam = normalizeInviteParam(payload);
  if (inviteParam) {
    await savePendingInvite(userId, inviteParam);
    await telegramApi(botToken, "sendMessage", {
      chat_id: chatId,
      text:
        "Тебя ждут в семье 🎒\n\nЖми «Войти в семью» — или кнопку Fin Bridge внизу. Связка уже сохранена на пару дней.",
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: "Войти в семью",
              web_app: { url: WEBAPP_URL },
            },
          ],
        ],
      },
    });
    return;
  }

  await telegramApi(botToken, "sendMessage", {
    chat_id: chatId,
    text: "Не узнал приглашение. Попроси отправить ссылку ещё раз из раздела «Семья» в Fin Bridge.",
  });
}

export function inviteDeepLinkFromParam(inviteParam: string): string {
  return botStartDeepLink(inviteParam);
}
