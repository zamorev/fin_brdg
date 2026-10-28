"""T02: доменные константы и контракты бюджета (src/domain).

Сценарии сверены с docs/PRODUCT.md: квест 1, правила родителя,
запрос на изменение правил.
"""

from __future__ import annotations

import ast
import dataclasses
import subprocess
import sys
from pathlib import Path

import pytest

from src.domain import (
    CATEGORY_MINIMUMS,
    DEFAULT_ALLOCATION,
    DEFAULT_RULES,
    MANDATORY_CATEGORIES,
    MIN_MANDATORY_EXPENSES,
    WEEKLY_BUDGET,
    BudgetAllocation,
    BudgetErrorCode,
    Category,
    FamilyRules,
    RequestStatus,
    RuleChangeRequest,
    apply_approved_request,
    create_rule_change_request,
    decide_request,
    is_valid_allocation,
    validate_allocation,
    validate_rule_change,
)

ROOT = Path(__file__).resolve().parents[1]


def _allocation(**overrides: int) -> BudgetAllocation:
    """Валидное распределение по умолчанию с точечными изменениями."""
    values = {category.value: amount for category, amount in DEFAULT_ALLOCATION.items()}
    values.update(overrides)
    return BudgetAllocation(**values)


def _pending_request() -> RuleChangeRequest:
    return create_rule_change_request(
        category=Category.ENTERTAINMENT,
        current_amount=400,
        proposed_amount=500,
        explanation="Хочу ходить в кино с друзьями раз в неделю",
    )


# --- AC1: константы совпадают с docs/PRODUCT.md ---------------------------


def test_weekly_budget_is_1500() -> None:
    assert WEEKLY_BUDGET == 1500


def test_categories_are_the_five_from_product_spec() -> None:
    assert {c.value for c in Category} == {
        "transport",
        "food",
        "entertainment",
        "savings",
        "reserve",
    }


def test_categories_have_russian_labels() -> None:
    assert Category.TRANSPORT.label == "Транспорт"
    assert Category.FOOD.label == "Обеды и перекусы"
    assert Category.ENTERTAINMENT.label == "Развлечения"
    assert Category.SAVINGS.label == "Накопления"
    assert Category.RESERVE.label == "Резерв"


def test_default_allocation_matches_quest_1_start() -> None:
    assert DEFAULT_ALLOCATION == {
        Category.TRANSPORT: 300,
        Category.FOOD: 500,
        Category.ENTERTAINMENT: 400,
        Category.SAVINGS: 200,
        Category.RESERVE: 100,
    }
    assert sum(DEFAULT_ALLOCATION.values()) == WEEKLY_BUDGET


def test_category_minimums_match_quest_1_checks() -> None:
    assert CATEGORY_MINIMUMS == {
        Category.TRANSPORT: 300,
        Category.FOOD: 500,
        Category.SAVINGS: 200,
        Category.RESERVE: 100,
    }
    # 400 на развлечения — значение по умолчанию, а не минимум.
    assert Category.ENTERTAINMENT not in CATEGORY_MINIMUMS


def test_mandatory_expenses_minimum_is_800() -> None:
    assert MIN_MANDATORY_EXPENSES == 800
    assert set(MANDATORY_CATEGORIES) == {Category.TRANSPORT, Category.FOOD}
    assert sum(CATEGORY_MINIMUMS[c] for c in MANDATORY_CATEGORIES) == MIN_MANDATORY_EXPENSES


def test_default_rules_use_domain_constants() -> None:
    assert DEFAULT_RULES.weekly_budget == WEEKLY_BUDGET
    assert dict(DEFAULT_RULES.minimums) == CATEGORY_MINIMUMS
    assert dict(DEFAULT_RULES.agreed_allocation) == DEFAULT_ALLOCATION


def test_default_rules_are_immutable() -> None:
    with pytest.raises(dataclasses.FrozenInstanceError):
        DEFAULT_RULES.weekly_budget = 2000  # type: ignore[misc]


# --- AC2: проверка суммы = 1500 и минимумов (квест 1) ---------------------


def test_allocation_total() -> None:
    assert _allocation().total == 1500
    assert _allocation(entertainment=0).total == 1100


def test_allocation_amount_by_category() -> None:
    allocation = _allocation(savings=250, entertainment=350)
    assert allocation.amount(Category.SAVINGS) == 250
    assert allocation.amount(Category.ENTERTAINMENT) == 350


def test_allocation_round_trip_dict() -> None:
    allocation = _allocation(savings=300, entertainment=300)
    assert BudgetAllocation.from_dict(allocation.as_dict()) == allocation


def test_default_allocation_is_valid() -> None:
    assert validate_allocation(_allocation()) == []
    assert is_valid_allocation(_allocation())


def test_valid_redistribution_above_minimums() -> None:
    allocation = _allocation(entertainment=0, savings=400, reserve=300)
    assert allocation.total == 1500
    assert validate_allocation(allocation) == []


@pytest.mark.parametrize(
    ("overrides", "expected_diff"),
    [
        ({"entertainment": 399}, -1),
        ({"entertainment": 500}, 100),
        ({"entertainment": 0}, -400),
    ],
)
def test_total_must_be_exactly_1500(overrides: dict[str, int], expected_diff: int) -> None:
    errors = validate_allocation(_allocation(**overrides))
    assert [e.code for e in errors] == [BudgetErrorCode.TOTAL_MISMATCH]
    error = errors[0]
    assert error.category is None
    assert "1500" in error.message.replace(" ", "")
    assert str(abs(expected_diff)) in error.message
    assert not is_valid_allocation(_allocation(**overrides))


@pytest.mark.parametrize(
    ("category", "below_minimum", "label"),
    [
        (Category.TRANSPORT, 299, "Транспорт"),
        (Category.FOOD, 499, "Обеды и перекусы"),
        (Category.SAVINGS, 199, "Накопления"),
        (Category.RESERVE, 99, "Резерв"),
    ],
)
def test_each_category_minimum_is_enforced(
    category: Category, below_minimum: int, label: str
) -> None:
    # Разницу кладём в развлечения, чтобы сумма осталась 1500.
    shortfall = CATEGORY_MINIMUMS[category] - below_minimum
    allocation = _allocation(
        **{category.value: below_minimum, "entertainment": 400 + shortfall}
    )
    assert allocation.total == 1500

    errors = validate_allocation(allocation)
    assert len(errors) == 1
    error = errors[0]
    assert error.code is BudgetErrorCode.BELOW_MINIMUM
    assert error.category is category
    assert label in error.message
    assert str(CATEGORY_MINIMUMS[category]) in error.message


def test_minimum_is_inclusive() -> None:
    allocation = _allocation(**{c.value: m for c, m in CATEGORY_MINIMUMS.items()}, entertainment=400)
    assert allocation.total == 1500
    assert validate_allocation(allocation) == []


def test_negative_amount_is_rejected() -> None:
    allocation = _allocation(entertainment=-100, savings=700)
    assert allocation.total == 1500
    codes = {(e.code, e.category) for e in validate_allocation(allocation)}
    assert (BudgetErrorCode.NEGATIVE_AMOUNT, Category.ENTERTAINMENT) in codes


def test_all_violations_are_reported_together() -> None:
    allocation = _allocation(transport=0, food=0, savings=0, reserve=0, entertainment=0)
    errors = validate_allocation(allocation)
    codes = [e.code for e in errors]
    assert codes.count(BudgetErrorCode.TOTAL_MISMATCH) == 1
    below = {e.category for e in errors if e.code is BudgetErrorCode.BELOW_MINIMUM}
    assert below == set(CATEGORY_MINIMUMS)


def test_validation_uses_given_rules() -> None:
    rules = FamilyRules(
        weekly_budget=2000,
        minimums=CATEGORY_MINIMUMS,
        agreed_allocation=DEFAULT_ALLOCATION,
    )
    assert validate_allocation(_allocation(entertainment=900), rules) == []
    assert [e.code for e in validate_allocation(_allocation(), rules)] == [
        BudgetErrorCode.TOTAL_MISMATCH
    ]


# --- AC3: модель запроса на изменение правил --------------------------------


def test_request_status_values_and_labels() -> None:
    assert {s.value for s in RequestStatus} == {
        "pending",
        "approved",
        "rejected",
        "needs_clarification",
    }
    assert RequestStatus.PENDING.label == "На рассмотрении"
    assert RequestStatus.APPROVED.label == "Одобрено"
    assert RequestStatus.REJECTED.label == "Отклонено"
    assert RequestStatus.NEEDS_CLARIFICATION.label == "Нужно уточнение"


def test_new_request_is_pending_with_given_fields() -> None:
    request = _pending_request()
    assert request.category is Category.ENTERTAINMENT
    assert request.current_amount == 400
    assert request.proposed_amount == 500
    assert request.explanation == "Хочу ходить в кино с друзьями раз в неделю"
    assert request.status is RequestStatus.PENDING
    assert request.parent_comment == ""
    assert request.id is None
    assert request.created_at is not None
    assert request.delta == 100


def test_request_explanation_is_stripped() -> None:
    request = create_rule_change_request(
        category=Category.ENTERTAINMENT,
        current_amount=400,
        proposed_amount=500,
        explanation="  нужно на кино  ",
    )
    assert request.explanation == "нужно на кино"


def test_request_is_immutable() -> None:
    with pytest.raises(dataclasses.FrozenInstanceError):
        _pending_request().status = RequestStatus.APPROVED  # type: ignore[misc]


@pytest.mark.parametrize(
    ("kwargs", "fragment"),
    [
        ({"explanation": ""}, "объяснение"),
        ({"explanation": "   "}, "объяснение"),
        ({"proposed_amount": 0}, "больше нуля"),
        ({"proposed_amount": -50}, "больше нуля"),
        ({"proposed_amount": 400}, "отличаться"),
        ({"proposed_amount": 1501}, "1500"),
    ],
)
def test_invalid_request_is_rejected(kwargs: dict[str, object], fragment: str) -> None:
    params: dict[str, object] = {
        "category": Category.ENTERTAINMENT,
        "current_amount": 400,
        "proposed_amount": 500,
        "explanation": "Хочу ходить в кино",
    }
    params.update(kwargs)

    errors = validate_rule_change(**params)  # type: ignore[arg-type]
    assert errors
    squash = lambda text: text.replace(" ", "").replace(" ", "")  # noqa: E731
    assert any(squash(fragment) in squash(e) for e in errors)

    with pytest.raises(ValueError):
        create_rule_change_request(**params)  # type: ignore[arg-type]


def test_valid_request_has_no_errors() -> None:
    assert (
        validate_rule_change(
            category=Category.ENTERTAINMENT,
            current_amount=400,
            proposed_amount=500,
            explanation="Хочу ходить в кино",
        )
        == []
    )


@pytest.mark.parametrize(
    "status",
    [RequestStatus.APPROVED, RequestStatus.REJECTED, RequestStatus.NEEDS_CLARIFICATION],
)
def test_parent_decision_sets_status_and_comment(status: RequestStatus) -> None:
    request = _pending_request()
    decided = decide_request(request, status, "  Давай попробуем месяц  ")
    assert decided.status is status
    assert decided.parent_comment == "Давай попробуем месяц"
    # Исходный объект не меняется: до решения действуют старые данные.
    assert request.status is RequestStatus.PENDING
    assert request.parent_comment == ""


def test_decision_cannot_return_to_pending() -> None:
    with pytest.raises(ValueError):
        decide_request(_pending_request(), RequestStatus.PENDING, "")


@pytest.mark.parametrize("final", [RequestStatus.APPROVED, RequestStatus.REJECTED])
def test_final_decision_cannot_be_changed(final: RequestStatus) -> None:
    decided = decide_request(_pending_request(), final, "")
    assert decided.is_final
    with pytest.raises(ValueError):
        decide_request(decided, RequestStatus.APPROVED, "")


def test_clarification_can_be_followed_by_decision() -> None:
    clarify = decide_request(_pending_request(), RequestStatus.NEEDS_CLARIFICATION, "Зачем?")
    assert not clarify.is_final
    approved = decide_request(clarify, RequestStatus.APPROVED, "Убедил")
    assert approved.status is RequestStatus.APPROVED


def test_rules_unchanged_until_approval() -> None:
    request = _pending_request()
    with pytest.raises(ValueError):
        apply_approved_request(DEFAULT_RULES, request)
    rejected = decide_request(request, RequestStatus.REJECTED, "Пока нет")
    with pytest.raises(ValueError):
        apply_approved_request(DEFAULT_RULES, rejected)


def test_approved_request_updates_agreed_allocation() -> None:
    approved = decide_request(_pending_request(), RequestStatus.APPROVED, "Ок")
    updated = apply_approved_request(DEFAULT_RULES, approved)
    assert updated.agreed_allocation[Category.ENTERTAINMENT] == 500
    assert updated.weekly_budget == DEFAULT_RULES.weekly_budget
    assert dict(updated.minimums) == dict(DEFAULT_RULES.minimums)
    # DEFAULT_RULES остаются нетронутыми.
    assert DEFAULT_RULES.agreed_allocation[Category.ENTERTAINMENT] == 400


# --- AC4: src/domain без Streamlit (и без SQL) ------------------------------


def _domain_modules() -> list[Path]:
    return sorted((ROOT / "src" / "domain").glob("*.py"))


def test_domain_package_is_not_empty() -> None:
    # Иначе архитектурные проверки проходят на пустой папке.
    names = {p.name for p in _domain_modules()}
    assert "__init__.py" in names
    assert len(names) > 1


@pytest.mark.parametrize("path", _domain_modules(), ids=lambda p: p.name)
def test_domain_module_has_no_ui_or_sql_imports(path: Path) -> None:
    tree = ast.parse(path.read_text(encoding="utf-8"), filename=str(path))
    imported: set[str] = set()
    for node in ast.walk(tree):
        if isinstance(node, ast.Import):
            imported.update(alias.name.split(".")[0] for alias in node.names)
        elif isinstance(node, ast.ImportFrom) and node.module:
            imported.add(node.module.split(".")[0])
    assert "streamlit" not in imported
    assert "sqlite3" not in imported


def test_importing_domain_does_not_load_streamlit() -> None:
    code = "import sys, src.domain; sys.exit('streamlit' in sys.modules)"
    result = subprocess.run([sys.executable, "-c", code], cwd=ROOT, check=False)
    assert result.returncode == 0


# --- AC5: публичные функции и классы задокументированы ----------------------


@pytest.mark.parametrize(
    "obj",
    [
        BudgetAllocation,
        FamilyRules,
        RuleChangeRequest,
        Category,
        RequestStatus,
        validate_allocation,
        is_valid_allocation,
        validate_rule_change,
        create_rule_change_request,
        decide_request,
        apply_approved_request,
    ],
    ids=lambda o: o.__name__,
)
def test_public_api_has_docstrings(obj: object) -> None:
    assert (obj.__doc__ or "").strip()
