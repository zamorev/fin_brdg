"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleTelegramUpdate = handleTelegramUpdate;
exports.inviteDeepLinkFromParam = inviteDeepLinkFromParam;
const inviteParam_1 = require("./inviteParam");
const pendingInvite_1 = require("./pendingInvite");
const store_1 = require("./store");
const messages_1 = require("./cms/messages");
const WEBAPP_URL = process.env.WEBAPP_URL ?? "https://fin-brdg.web.app";
function extractStartPayload(text) {
    const trimmed = text.trim();
    const match = trimmed.match(/^\/start(?:@[\w_]+)?(?:\s+(.+))?$/i);
    return match?.[1]?.trim();
}
const telegramBotApi_1 = require("./telegramBotApi");
async function sendWelcome(chatId, botToken) {
    const text = await (0, messages_1.getMessage)("bot.welcome");
    await (0, telegramBotApi_1.telegramApi)(botToken, "sendMessage", {
        chat_id: chatId,
        text,
    });
}
async function handleTelegramUpdate(update, botToken) {
    const message = update.message;
    if (!message?.text || !message.from?.id)
        return;
    const chatId = message.chat.id;
    const userId = message.from.id;
    const text = message.text.trim();
    const startPayload = extractStartPayload(text);
    const isStart = startPayload !== undefined || /^\/start(?:@\w+)?/i.test(text);
    if (/^\/help(?:@\w+)?/i.test(text)) {
        const helpText = await (0, messages_1.getMessage)("bot.help");
        await (0, telegramBotApi_1.telegramApi)(botToken, "sendMessage", {
            chat_id: chatId,
            text: helpText,
        });
        return;
    }
    if (/^\/(open|about)(?:@\w+)?/i.test(text)) {
        await sendWelcome(chatId, botToken);
        return;
    }
    if (!isStart)
        return;
    if (!startPayload) {
        await sendWelcome(chatId, botToken);
        return;
    }
    const inviteParam = (0, inviteParam_1.normalizeInviteParam)(startPayload);
    if (inviteParam) {
        await (0, pendingInvite_1.savePendingInvite)(userId, inviteParam);
        const inviterId = (0, inviteParam_1.parseInviterTelegramId)(startPayload);
        const inviterName = await (0, store_1.resolveInviterDisplayName)(inviteParam, inviterId);
        const headline = inviterName
            ? await (0, messages_1.getMessage)("bot.invite.headline_named", { name: inviterName })
            : await (0, messages_1.getMessage)("bot.invite.headline_generic");
        const body = await (0, messages_1.getMessage)("bot.invite.body");
        const button = await (0, messages_1.getMessage)("bot.invite.button");
        await (0, telegramBotApi_1.telegramApi)(botToken, "sendMessage", {
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
    const unknown = await (0, messages_1.getMessage)("bot.invite.unknown");
    await (0, telegramBotApi_1.telegramApi)(botToken, "sendMessage", {
        chat_id: chatId,
        text: unknown,
    });
}
function inviteDeepLinkFromParam(inviteParam) {
    return (0, inviteParam_1.botStartDeepLink)(inviteParam);
}
//# sourceMappingURL=botWebhook.js.map