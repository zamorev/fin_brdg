"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CATALOG_BY_KEY = exports.MESSAGE_CATALOG = void 0;
exports.defaultStringsRecord = defaultStringsRecord;
exports.interpolate = interpolate;
exports.MESSAGE_CATALOG = [
    {
        key: "bot.welcome",
        group: "Bot",
        label: "Привет без invite",
        defaultText: "Привет 👋\n\nКвесты про бюджет — в Mini App. Жми кнопку «Fin Bridge» внизу или приходи по ссылке от семьи.",
        multiline: true,
    },
    {
        key: "bot.help",
        group: "Bot",
        label: "/help",
        defaultText: "Подключаетесь вдвоём, каждый со своего аккаунта. Квесты общие.\n\n" +
            "В семью — по ссылке от близких из Fin Bridge. Потом жми кнопку Fin Bridge внизу.",
        multiline: true,
    },
    {
        key: "bot.invite.headline_named",
        group: "Bot",
        label: "Invite: заголовок с именем ({name})",
        defaultText: "{name} приглашает тебя в семью 🎒",
    },
    {
        key: "bot.invite.headline_generic",
        group: "Bot",
        label: "Invite: заголовок без имени",
        defaultText: "Тебя приглашают в семью 🎒",
    },
    {
        key: "bot.invite.body",
        group: "Bot",
        label: "Invite: текст под заголовком",
        defaultText: "Жми «Войти в семью» — или кнопку Fin Bridge внизу.",
    },
    {
        key: "bot.invite.button",
        group: "Bot",
        label: "Invite: кнопка Web App",
        defaultText: "Войти в семью",
    },
    {
        key: "bot.invite.unknown",
        group: "Bot",
        label: "Неизвестный /start",
        defaultText: "Не узнал приглашение. Попроси отправить ссылку ещё раз из раздела «Семья» в Fin Bridge.",
        multiline: true,
    },
    {
        key: "bot.scenario.notify.suffix",
        group: "Bot",
        label: "Пуш сценария: хвост",
        defaultText: "Открой Fin Bridge — там ждёт твой выбор.",
    },
    {
        key: "bot.scenario.notify.button",
        group: "Bot",
        label: "Пуш сценария: кнопка",
        defaultText: "Ответить в Fin Bridge",
    },
    {
        key: "ui.loading",
        group: "Mini App",
        label: "Загрузка",
        defaultText: "Загружаем…",
    },
    {
        key: "ui.error.title",
        group: "Mini App",
        label: "Ошибка: заголовок",
        defaultText: "Не получилось",
    },
    {
        key: "ui.openViaBot.title",
        group: "Mini App",
        label: "Без сессии: заголовок",
        defaultText: "Открой через бота",
    },
    {
        key: "ui.openViaBot.sub",
        group: "Mini App",
        label: "Без сессии: подпись",
        defaultText: "@fin_brdg_bot → кнопка «Начать»",
    },
    {
        key: "ui.parent.home.title",
        group: "Mini App",
        label: "Родитель: заголовок",
        defaultText: "Fin Bridge",
    },
    {
        key: "ui.parent.home.sub",
        group: "Mini App",
        label: "Родитель: подпись",
        defaultText: "Когда подросток предложит новое правило — увидишь его здесь, со своего Telegram.",
        multiline: true,
    },
    {
        key: "ui.teen.levelLabel",
        group: "Mini App",
        label: "Level Up",
        defaultText: "Level Up",
    },
    {
        key: "ui.teen.roleSuffix",
        group: "Mini App",
        label: "роль подросток",
        defaultText: "подросток",
    },
    {
        key: "ui.teen.weeklyBudgetLabel",
        group: "Mini App",
        label: "бюджет на неделю",
        defaultText: "бюджет на эту неделю",
    },
    {
        key: "ui.teen.tasksHeading",
        group: "Mini App",
        label: "Задания",
        defaultText: "Задания",
    },
    {
        key: "ui.teen.questWeek.title",
        group: "Mini App",
        label: "Квест 1: название",
        defaultText: "Неделя на 1 500 ₽",
    },
    {
        key: "ui.teen.questWeek.sub",
        group: "Mini App",
        label: "Квест 1: подпись",
        defaultText: "Разложи бюджет по категориям, 5 минут",
    },
    {
        key: "ui.teen.questWeek.start",
        group: "Mini App",
        label: "Квест 1: Начать",
        defaultText: "Начать",
    },
    {
        key: "ui.teen.questWeek.again",
        group: "Mini App",
        label: "Квест 1: Снова",
        defaultText: "Снова",
    },
    {
        key: "ui.teen.cinema.title",
        group: "Mini App",
        label: "Сценарий кино",
        defaultText: "Ой, кино",
    },
    {
        key: "ui.teen.family.title",
        group: "Mini App",
        label: "Семья",
        defaultText: "Семья",
    },
    {
        key: "ui.teen.agreements.title",
        group: "Mini App",
        label: "Мои договорённости",
        defaultText: "Мои договорённости",
    },
    {
        key: "ui.teen.mainButton",
        group: "Mini App",
        label: "MainButton квест",
        defaultText: "Начать квест",
    },
    {
        key: "validation.explanation_required",
        group: "Validation",
        label: "Запрос: объяснение",
        defaultText: "Расскажи, зачем тебе это важно",
    },
    {
        key: "validation.amount_positive",
        group: "Validation",
        label: "Запрос: сумма",
        defaultText: "Укажи сумму больше нуля",
    },
    {
        key: "validation.amount_weekly_cap",
        group: "Validation",
        label: "Запрос: лимит недели ({budget})",
        defaultText: "На неделю не больше {budget} ₽ — это учебный бюджет",
    },
    {
        key: "validation.amount_same",
        group: "Validation",
        label: "Запрос: та же сумма",
        defaultText: "Нужна другая сумма, не как сейчас",
    },
];
exports.CATALOG_BY_KEY = new Map(exports.MESSAGE_CATALOG.map((e) => [e.key, e]));
function defaultStringsRecord() {
    const out = {};
    for (const e of exports.MESSAGE_CATALOG) {
        out[e.key] = e.defaultText;
    }
    return out;
}
function interpolate(template, params) {
    let s = template;
    for (const [k, v] of Object.entries(params)) {
        s = s.split(`{${k}}`).join(String(v));
    }
    return s;
}
//# sourceMappingURL=catalog.js.map