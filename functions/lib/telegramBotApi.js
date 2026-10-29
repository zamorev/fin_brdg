"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.telegramApi = telegramApi;
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
//# sourceMappingURL=telegramBotApi.js.map