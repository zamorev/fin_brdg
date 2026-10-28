"""Teen home: level, weekly budget, tasks. UI only; quest 1 lives in teen_quest_week, agreements are a stub (T06)."""

import streamlit as st

from app.components.teen import widgets
from app.components.teen.styles import inject_styles
from app.pages import teen_quest_week
from src.domain.constants import DEFAULT_ALLOCATION, WEEKLY_BUDGET, Category, format_rub
from src.quests.week_budget import QUEST_COMPLETED_KEY

VIEW_KEY = "teen_view"
VIEW_HOME = "home"
VIEW_QUEST_WEEK = "quest_week"
VIEW_AGREEMENTS = "agreements"

# Demo data until T08 (persistence) and the progress model exist.
DEMO_NAME = "Соня"
DEMO_LEVEL = 3
DEMO_LEVEL_PROGRESS = 0.65
DEMO_XP_TO_NEXT = 140
DEMO_REQUEST_CATEGORY = Category.ENTERTAINMENT
DEMO_REQUEST_AMOUNT = 500


def _go(view: str) -> None:
    st.session_state[VIEW_KEY] = view


def _home() -> None:
    widgets.level_card(DEMO_LEVEL, DEMO_LEVEL_PROGRESS, DEMO_XP_TO_NEXT, format_rub(WEEKLY_BUDGET))
    widgets.section_title("Задания")

    with st.container(key="teen_tasks", gap=None):
        with st.container(key="teen_row_week", gap=None):
            widgets.task_row(
                widgets.ICON_BRIEFCASE,
                f"Неделя на {format_rub(WEEKLY_BUDGET)}",
                "Пройден — план сохранён"
                if st.session_state.get(QUEST_COMPLETED_KEY)
                else "Разложи бюджет по категориям, 5 минут",
                reserve_right=True,
            )
            st.button("Начать", key="teen_start_week", on_click=_go, args=(VIEW_QUEST_WEEK,))

        # Demo of a teen's budget change proposal; real ones come with T06/T08.
        current = DEFAULT_ALLOCATION[DEMO_REQUEST_CATEGORY]
        widgets.task_row(
            widgets.ICON_CLOCK,
            # Non-breaking spaces keep "400 → 500 ₽" on one line.
            f"{DEMO_REQUEST_CATEGORY.label}: {current} → {format_rub(DEMO_REQUEST_AMOUNT)}",
            "Ждёт решения родителя",
            chip="Ждёт",
        )

        with st.container(key="teen_row_agreements", gap=None):
            widgets.task_row(
                widgets.ICON_CHECK,
                "Мои договорённости",
                "Правила и запросы родителю",
                blue_icon=True,
                divider=False,
            )
            st.button("Открыть договорённости", key="teen_open_agreements", on_click=_go, args=(VIEW_AGREEMENTS,))


def render() -> None:
    inject_styles()
    widgets.header(DEMO_NAME)

    view = st.session_state.get(VIEW_KEY, VIEW_HOME)
    if view == VIEW_QUEST_WEEK:
        teen_quest_week.render(on_back=lambda: _go(VIEW_HOME))
    elif view == VIEW_AGREEMENTS:
        widgets.stub_screen(
            "Мои договорённости",
            "Скоро здесь будут правила, о которых вы договорились, и твои предложения родителям.",
            on_back=lambda: _go(VIEW_HOME),
        )
    else:
        _home()
