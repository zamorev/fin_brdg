"""T04: квест «Неделя на 1 500 ₽» — логика в src/quests и экран подростка.

Константы и базовые проверки validate_allocation покрыты в tests/test_domain.py;
здесь — только сценарий квеста поверх доменного контракта.
"""

from __future__ import annotations

import ast
from pathlib import Path

import pytest
from streamlit.testing.v1 import AppTest

from src.domain import (
    DEFAULT_RULES,
    BudgetAllocation,
    BudgetErrorCode,
    Category,
    FamilyRules,
    format_rub,
    validate_allocation,
)
from src.quests.week_budget import (
    QUEST_ALLOCATION_KEY,
    QUEST_COMPLETED_KEY,
    check_week_budget,
    clamp_amount,
    remaining,
    save_result,
    slider_scale,
    starting_allocation,
)

ROOT = Path(__file__).resolve().parents[1]
QUEST_PAGE = ROOT / "app" / "pages" / "teen_quest_week.py"


def _plan(**amounts: int) -> dict[str, int]:
    """Стартовый план квеста с точечными изменениями — как значения формы."""
    values = starting_allocation().as_dict()
    values.update(amounts)
    return values


# --- Стартовое состояние квеста ---------------------------------------------


def test_start_fills_minimums_and_leaves_400_free() -> None:
    start = starting_allocation()
    for category, minimum in DEFAULT_RULES.minimums.items():
        assert start.amount(category) == minimum
    assert start.total == 1100
    assert remaining(start) == 400


def test_entertainment_starts_at_zero() -> None:
    assert starting_allocation().amount(Category.ENTERTAINMENT) == 0


def test_start_is_not_yet_a_complete_plan() -> None:
    # Свободные 400 ₽ ещё надо распределить: проверка домена это видит.
    result = check_week_budget(starting_allocation().as_dict())
    assert not result.passed
    assert [e.code for e in result.errors] == [BudgetErrorCode.TOTAL_MISMATCH]


def test_start_follows_given_rules() -> None:
    rules = FamilyRules(weekly_budget=2000, minimums={Category.FOOD: 700})
    start = starting_allocation(rules)
    assert start.amount(Category.FOOD) == 700
    assert start.amount(Category.TRANSPORT) == 0
    assert remaining(start, rules) == 1300


def test_remaining_is_negative_when_over_budget() -> None:
    assert remaining(BudgetAllocation.from_dict(_plan(entertainment=500))) == -100


# --- Границы ползунков ---------------------------------------------------------


def test_slider_scale_is_zero_to_weekly_budget() -> None:
    assert slider_scale() == (0, DEFAULT_RULES.weekly_budget)


@pytest.mark.parametrize("category", list(DEFAULT_RULES.minimums))
def test_amount_cannot_go_below_category_minimum(category: Category) -> None:
    minimum = DEFAULT_RULES.minimums[category]
    assert clamp_amount(category, 0) == minimum
    assert clamp_amount(category, minimum - 50) == minimum
    assert clamp_amount(category, minimum) == minimum
    assert clamp_amount(category, minimum + 50) == minimum + 50


def test_entertainment_can_go_down_to_zero() -> None:
    assert clamp_amount(Category.ENTERTAINMENT, 0) == 0


def test_clamp_follows_given_rules() -> None:
    rules = FamilyRules(minimums={Category.ENTERTAINMENT: 150})
    assert clamp_amount(Category.ENTERTAINMENT, 0, rules) == 150
    assert clamp_amount(Category.TRANSPORT, 0, rules) == 0


# --- Проверка плана через домен ------------------------------------------------


def test_form_values_become_allocation() -> None:
    form = {category: amount for category, amount in _plan(entertainment=150, savings=450).items()}
    result = check_week_budget(form)
    assert result.allocation == BudgetAllocation.from_dict(form)


def test_check_accepts_category_keys() -> None:
    form = {Category(key): amount for key, amount in _plan(entertainment=400).items()}
    assert check_week_budget(form).passed


def test_check_returns_domain_errors_unchanged() -> None:
    form = _plan(transport=250, entertainment=200)
    result = check_week_budget(form)
    assert result.errors == validate_allocation(BudgetAllocation.from_dict(form))
    assert not result.passed


def test_check_uses_given_rules() -> None:
    rules = FamilyRules(weekly_budget=1100)
    assert check_week_budget(starting_allocation(rules).as_dict(), rules).passed


@pytest.mark.parametrize(
    "amounts",
    [
        {"entertainment": 400},
        {"entertainment": 0, "savings": 600},
        {"entertainment": 100, "reserve": 200, "food": 700},
    ],
)
def test_any_plan_of_exactly_1500_above_minimums_passes(amounts: dict[str, int]) -> None:
    result = check_week_budget(_plan(**amounts))
    assert result.passed
    assert result.errors == []
    assert result.allocation.total == 1500


# --- Сохранение результата -----------------------------------------------------


def test_success_is_saved_for_parent() -> None:
    state: dict[str, object] = {}
    form = _plan(entertainment=300, savings=300)
    save_result(state, check_week_budget(form))
    assert state[QUEST_COMPLETED_KEY] is True
    assert state[QUEST_ALLOCATION_KEY] == form


def test_failure_is_not_saved() -> None:
    state: dict[str, object] = {}
    save_result(state, check_week_budget(starting_allocation().as_dict()))
    assert QUEST_COMPLETED_KEY not in state
    assert QUEST_ALLOCATION_KEY not in state


def test_failed_retry_keeps_earlier_success() -> None:
    state: dict[str, object] = {}
    passed = _plan(entertainment=400)
    save_result(state, check_week_budget(passed))
    save_result(state, check_week_budget(_plan(entertainment=900)))
    assert state[QUEST_COMPLETED_KEY] is True
    assert state[QUEST_ALLOCATION_KEY] == passed


# --- Экран квеста (Streamlit AppTest) ------------------------------------------


def _teen_app() -> None:
    from app.pages import teen_home

    teen_home.render()


@pytest.fixture
def quest_app() -> AppTest:
    at = AppTest.from_function(_teen_app)
    at.session_state["teen_view"] = "quest_week"
    at.run()
    assert not at.exception
    return at


def _slider_key(category: Category) -> str:
    return f"quest_week_{category.value}"


def _screen_text(at: AppTest) -> str:
    return "\n".join(str(m.value) for m in at.markdown)


def _check(at: AppTest) -> None:
    at.button(key="quest_week_check").click()
    at.run()
    assert not at.exception


def test_screen_has_slider_per_category_on_common_scale(quest_app: AppTest) -> None:
    start = starting_allocation()
    for category in Category:
        slider = quest_app.slider(key=_slider_key(category))
        assert slider.value == start.amount(category)
        assert (slider.min, slider.max) == slider_scale()
        assert category.label in _screen_text(quest_app)


@pytest.mark.parametrize("category", list(DEFAULT_RULES.minimums))
def test_slider_snaps_back_to_minimum(quest_app: AppTest, category: Category) -> None:
    slider = quest_app.slider(key=_slider_key(category))
    slider.set_value(0).run()
    assert quest_app.slider(key=_slider_key(category)).value == DEFAULT_RULES.minimums[category]


def test_entertainment_slider_goes_back_to_zero(quest_app: AppTest) -> None:
    key = _slider_key(Category.ENTERTAINMENT)
    quest_app.slider(key=key).set_value(300).run()
    quest_app.slider(key=key).set_value(0).run()
    assert quest_app.slider(key=key).value == 0


def test_screen_shows_total_and_free_400(quest_app: AppTest) -> None:
    text = _screen_text(quest_app)
    start = starting_allocation()
    assert format_rub(start.total) in text
    assert format_rub(remaining(start)) in text
    assert format_rub(DEFAULT_RULES.weekly_budget) in text


def test_moving_slider_updates_remaining(quest_app: AppTest) -> None:
    quest_app.slider(key=_slider_key(Category.ENTERTAINMENT)).set_value(250).run()
    assert format_rub(150) in _screen_text(quest_app)


@pytest.mark.parametrize(
    ("entertainment", "tone"),
    [(0, "fb-under"), (400, "fb-ok"), (600, "fb-over")],
)
def test_total_tone_shows_under_exact_and_over(
    quest_app: AppTest, entertainment: int, tone: str
) -> None:
    quest_app.slider(key=_slider_key(Category.ENTERTAINMENT)).set_value(entertainment).run()
    assert f"fb-total-value {tone}" in _screen_text(quest_app)


def test_check_at_start_shows_russian_domain_error(quest_app: AppTest) -> None:
    _check(quest_app)
    expected = validate_allocation(starting_allocation())
    text = _screen_text(quest_app)
    for error in expected:
        assert error.message in text
    assert "меньше" in text
    assert QUEST_COMPLETED_KEY not in quest_app.session_state


def test_over_budget_shows_error(quest_app: AppTest) -> None:
    quest_app.slider(key=_slider_key(Category.ENTERTAINMENT)).set_value(600).run()
    _check(quest_app)
    text = _screen_text(quest_app)
    assert "больше" in text
    assert format_rub(200) in text
    assert QUEST_COMPLETED_KEY not in quest_app.session_state


def test_valid_plan_completes_quest(quest_app: AppTest) -> None:
    quest_app.slider(key=_slider_key(Category.ENTERTAINMENT)).set_value(300).run()
    quest_app.slider(key=_slider_key(Category.SAVINGS)).set_value(300).run()
    _check(quest_app)

    expected = _plan(entertainment=300, savings=300)
    assert quest_app.session_state[QUEST_COMPLETED_KEY] is True
    assert quest_app.session_state[QUEST_ALLOCATION_KEY] == expected
    assert "Квест пройден" in _screen_text(quest_app)


def test_back_returns_home(quest_app: AppTest) -> None:
    quest_app.button(key="teen_back").click().run()
    assert quest_app.session_state["teen_view"] == "home"


# --- Экран не дублирует числа домена -------------------------------------------


def test_quest_page_has_no_budget_literals() -> None:
    domain_numbers = {DEFAULT_RULES.weekly_budget, *DEFAULT_RULES.minimums.values(), 1100, 400}
    tree = ast.parse(QUEST_PAGE.read_text(encoding="utf-8"), filename=str(QUEST_PAGE))
    literals = {
        node.value
        for node in ast.walk(tree)
        if isinstance(node, ast.Constant) and isinstance(node.value, int)
    }
    assert not literals & domain_numbers
