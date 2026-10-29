"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CINEMA_CHAIN_V1 = void 0;
const TWO_HOURS_MS = 2 * 60 * 60 * 1000;
const THIRTY_MIN_MS = 30 * 60 * 1000;
exports.CINEMA_CHAIN_V1 = {
    id: "cinema_chain_v1",
    version: 1,
    title: "Ой, кино",
    startNodeId: "invite",
    nodes: {
        invite: {
            id: "invite",
            prompt: "Друзья приглашают тебя в кино. Билет — 300 ₽.\n\nПойдёшь?",
            options: [
                { id: "go", label: "Пойду", nextNodeId: "box_office", delayMs: TWO_HOURS_MS },
                {
                    id: "no_go",
                    label: "Не пойду",
                    nextNodeId: "friends_pay",
                    delayMs: THIRTY_MIN_MS,
                },
            ],
        },
        box_office: {
            id: "box_office",
            prompt: "Ты в кассе кино. Билет стоит 250 ₽.\n\nВозьмёшь ещё попкорн с напитком за 350 ₽?",
            options: [
                {
                    id: "yes",
                    label: "Да",
                    terminal: true,
                    effects: [
                        { type: "spend", category: "entertainment", amount: 250 },
                        { type: "spend", category: "entertainment", amount: 350 },
                    ],
                },
                {
                    id: "no",
                    label: "Нет",
                    terminal: true,
                    effects: [{ type: "spend", category: "entertainment", amount: 250 }],
                },
            ],
        },
        friends_pay: {
            id: "friends_pay",
            prompt: "Друзья говорят, что заплатят сами за тебя.\n\nПойдёшь?",
            options: [
                { id: "go", label: "Пойду", nextNodeId: "box_office", delayMs: TWO_HOURS_MS },
                { id: "no_go", label: "Не пойду", terminal: true },
            ],
        },
    },
};
//# sourceMappingURL=cinema_chain_v1.js.map