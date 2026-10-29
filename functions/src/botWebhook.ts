import { botStartDeepLink, normalizeInviteParam, parseInviterTelegramId } from "./inviteParam";
import { savePendingInvite } from "./pendingInvite";
import { resolveInviterDisplayName } from "./store";
import { getMessage } from "./cms/messages";

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

import { telegramApi } from "./telegramBotApi";

async function sendWelcome(chatId: number, botToken: string): Promise<void> {
  const text = await getMessage("bot.welcome");
  await telegramApi(botToken, "sendMessage", {
    chat_id: chatId,
    text,
  });
}

export async function handleTelegramUpdate(update: TelegramUpdate, botToken: string): Promise<void> {
  const message = update.message;
  if (!message?.text || !message.from?.id) return;

  const chatId = message.chat.id;
  const userId = message.from.id;
  const text = message.text.trim();

  const startPayload = extractStartPayload(text);
  const isStart = startPayload !== undefined || /^\/start(?:@\w+)?/i.test(text);

  if (/^\/help(?:@\w+)?/i.test(text)) {
    const helpText = await getMessage("bot.help");
    await telegramApi(botToken, "sendMessage", {
      chat_id: chatId,
      text: helpText,
    });
    return;
  }

  if (/^\/(open|about)(?:@\w+)?/i.test(text)) {
    await sendWelcome(chatId, botToken);
    return;
  }

  if (!isStart) return;

  if (!startPayload) {
    await sendWelcome(chatId, botToken);
    return;
  }
  const inviteParam = normalizeInviteParam(startPayload);
  if (inviteParam) {
    await savePendingInvite(userId, inviteParam);
    const inviterId = parseInviterTelegramId(startPayload);
    const inviterName = await resolveInviterDisplayName(inviteParam, inviterId);
    const headline = inviterName
      ? await getMessage("bot.invite.headline_named", { name: inviterName })
      : await getMessage("bot.invite.headline_generic");
    const body = await getMessage("bot.invite.body");
    const button = await getMessage("bot.invite.button");
    await telegramApi(botToken, "sendMessage", {
      chat_id: chatId,
      text: `${headline}\n\n${body}`,
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: button,
              web_app: { url: WEBAPP_URL },
            },
          ],
        ],
      },
    });
    return;
  }

  const unknown = await getMessage("bot.invite.unknown");
  await telegramApi(botToken, "sendMessage", {
    chat_id: chatId,
    text: unknown,
  });
}

export function inviteDeepLinkFromParam(inviteParam: string): string {
  return botStartDeepLink(inviteParam);
}
