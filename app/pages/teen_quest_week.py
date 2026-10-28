"""Teen quest 1 «Неделя на 1 500 ₽»: a slider per category, checked by src/quests. UI only."""

from collections.abc import Callable

import streamlit as st

from app.components.teen import widgets
from src.domain.budget import BudgetAllocation
from src.domain.constants import Category, format_rub
from src.domain.rules import DEFAULT_RULES
from src.quests.week_budget import (
    QuestResult,
    check_week_budget,
    clamp_amount,
    remaining,
    save_result,
    slider_scale,
    starting_allocation,
)

SLIDER_STEP = 50
CHECK_KEY = "quest_week_check"


def _slider_key(category: Category) -> str:
    return f"quest_week_{category.value}"


def _init_sliders() -> None:
    # Quest starts from minimums; the free remainder is the teen's to place.
    start = starting_allocation(DEFAULT_RULES)
    for category in Category:
        st.session_state.setdefault(_slider_key(category), start.amount(category))


def _snap_to_minimum(category: Category) -> None:
    # Common 0..budget scale, but a slider can't be left below its category minimum.
    key = _slider_key(category)
    st.session_state[key] = clamp_amount(category, st.session_state[key], DEFAULT_RULES)


def _sliders() -> dict[Category, int]:
    low, high = slider_scale(DEFAULT_RULES)
    values: dict[Category, int] = {}
    for category in Category:
        key = _slider_key(category)
        widgets.amount_label(category.label, format_rub(st.session_state[key]))
        values[category] = st.slider(
            category.label,
            low,
            high,
            step=SLIDER_STEP,
            key=key,
            on_change=_snap_to_minimum,
            args=(category,),
            label_visibility="collapsed",
        )
    return values


def _total(allocation: BudgetAllocation) -> None:
    left = remaining(allocation, DEFAULT_RULES)
    if left > 0:
        hint, tone = f"Осталось распределить {format_rub(left)}", widgets.TONE_UNDER
    elif left < 0:
        hint, tone = f"Перебор {format_rub(-left)}", widgets.TONE_OVER
    else:
        hint, tone = "Всё распределено", widgets.TONE_OK
    widgets.quest_total(
        f"{format_rub(allocation.total)} из {format_rub(DEFAULT_RULES.weekly_budget)}",
        hint,
        tone=tone,
    )


def _result(result: QuestResult) -> None:
    if result.passed:
        widgets.quest_success(
            "Квест пройден!",
            "План на неделю сохранён — родитель увидит твоё распределение бюджета.",
        )
    else:
        widgets.quest_errors("Пока не сходится", [error.message for error in result.errors])


def render(on_back: Callable[[], None]) -> None:
    _init_sliders()
    with st.container(key="quest_week_nav"):
        st.button("←  Квест 1 из 1", key="teen_back", on_click=on_back)

    budget = format_rub(DEFAULT_RULES.weekly_budget)
    with st.container(key="quest_week_card"):
        widgets.quest_intro(
            f"Неделя на {budget}",
            f"У тебя есть {budget} на неделю. Обязательные расходы уже заложены по минимуму — "
            "распредели остаток так, чтобы хватило на развлечения, цель и непредвиденное.",
        )
        values = _sliders()
        _total(BudgetAllocation.from_dict(values))
        if st.button("Проверить мой бюджет", key=CHECK_KEY, use_container_width=True):
            result = check_week_budget(values, DEFAULT_RULES)
            save_result(st.session_state, result)
            _result(result)
