"""Квест 1 «Неделя на 1 500 ₽»: стартовый план, границы ползунков, проверка и итог.

Числа и проверка — из src/domain; здесь только сценарий квеста. Без Streamlit.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Mapping, MutableMapping

from src.domain.budget import BudgetAllocation, BudgetError, validate_allocation
from src.domain.constants import Category
from src.domain.rules import DEFAULT_RULES, FamilyRules

# Ключи session_state (до T08): родитель видит, что квест пройден и с каким планом.
QUEST_COMPLETED_KEY = "week_budget_quest_completed"
QUEST_ALLOCATION_KEY = "quest_1_allocation"


@dataclass(frozen=True)
class QuestResult:
    """Итог проверки плана: распределение и ошибки домена (пустой список — квест пройден)."""

    allocation: BudgetAllocation
    errors: list[BudgetError]

    @property
    def passed(self) -> bool:
        """Квест пройден: план прошёл все проверки домена."""
        return not self.errors


def starting_allocation(rules: FamilyRules = DEFAULT_RULES) -> BudgetAllocation:
    """Старт квеста: категории с минимумом заполнены минимумом, остальные — 0.

    Остаток до недельного бюджета подросток распределяет сам.
    """
    return BudgetAllocation.from_dict({c: rules.minimums.get(c, 0) for c in Category})


def remaining(allocation: BudgetAllocation, rules: FamilyRules = DEFAULT_RULES) -> int:
    """Сколько ещё не распределено; меньше нуля — перебор."""
    return rules.weekly_budget - allocation.total


def slider_scale(rules: FamilyRules = DEFAULT_RULES) -> tuple[int, int]:
    """Общая шкала ползунков: от 0 до недельного бюджета, одинаковая для всех категорий."""
    return 0, rules.weekly_budget


def clamp_amount(category: Category, amount: int, rules: FamilyRules = DEFAULT_RULES) -> int:
    """Сумма не ниже минимума категории; у категорий без минимума — не ниже 0."""
    return max(amount, rules.minimums.get(category, 0))


def check_week_budget(
    values: Mapping[str, int] | Mapping[Category, int], rules: FamilyRules = DEFAULT_RULES
) -> QuestResult:
    """Собрать план из значений формы и проверить его правилами домена."""
    allocation = BudgetAllocation.from_dict(values)
    return QuestResult(allocation, validate_allocation(allocation, rules))


def save_result(state: MutableMapping[str, object], result: QuestResult) -> None:
    """Сохранить пройденный квест в state (st.session_state); неудачная попытка ничего не меняет."""
    if not result.passed:
        return
    state[QUEST_COMPLETED_KEY] = True
    state[QUEST_ALLOCATION_KEY] = result.allocation.as_dict()
