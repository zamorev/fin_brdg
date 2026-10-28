"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleTelegramUpdate = handleTelegramUpdate;
exports.inviteDeepLinkFromParam = inviteDeepLinkFromParam;
const inviteParam_1 = require("./inviteParam");
const pendingInvite_1 = require("./pendingInvite");
const store_1 = require("./store");
const WEBAPP_URL = process.env.WEBAPP_URL ?? "https://fin-brdg.web.app";
function extractStartPayload(text) {
    const trimmed = text.trim();
    const match = trimmed.match(/^\/start(?:@[\w_]+)?(?:\s+(.+))?$/i);
    return match?.[1]?.trim();
}
async function telegramApi(botToken, method, body) {
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
async function sendWelcome(chatId, botToken) {
    await telegramApi(botToken, "sendMessage", {
        chat_id: chatId,
        text: "Привет 👋\n\nКвесты про бюджет — в Mini App. Жми кнопку «Fin Bridge» внизу или приходи по ссылке от семьи.",
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
        await telegramApi(botToken, "sendMessage", {
            chat_id: chatId,
            text: "Подключаетесь вдвоём, каждый со своего аккаунта. Квесты общие.\n\n" +
                "В семью — по ссылке от близких из Fin Bridge. Потом жми кнопку Fin Bridge внизу.",
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
            ? `${inviterName} приглашает тебя в семью 🎒`
            : "Тебя приглашают в семью 🎒";
        await telegramApi(botToken, "sendMessage", {
            chat_id: chatId,
            text: `${headline}\n\nЖми «Войти в семью» — или кнопку Fin Bridge внизу.`,
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
function inviteDeepLinkFromParam(inviteParam) {
    return (0, inviteParam_1.botStartDeepLink)(inviteParam);
}
//# sourceMappingURL=botWebhook.js.map