"""Семейные правила (договорённости), которые видят обе роли."""

from __future__ import annotations

from dataclasses import dataclass, field
from types import MappingProxyType
from typing import TYPE_CHECKING, Mapping

from src.domain.constants import CATEGORY_MINIMUMS, DEFAULT_ALLOCATION, WEEKLY_BUDGET, Category

if TYPE_CHECKING:
    from src.domain.requests import RuleChangeRequest


def _frozen(mapping: Mapping[Category, int]) -> Mapping[Category, int]:
    return MappingProxyType(dict(mapping))


@dataclass(frozen=True)
class FamilyRules:
    """Действующие правила: недельный бюджет, минимумы и согласованный план по категориям."""

    weekly_budget: int = WEEKLY_BUDGET
    minimums: Mapping[Category, int] = field(default_factory=lambda: CATEGORY_MINIMUMS)
    agreed_allocation: Mapping[Category, int] = field(default_factory=lambda: DEFAULT_ALLOCATION)

    def __post_init__(self) -> None:
        # Копии только для чтения: правила не меняются «на месте».
        object.__setattr__(self, "minimums", _frozen(self.minimums))
        object.__setattr__(self, "agreed_allocation", _frozen(self.agreed_allocation))


DEFAULT_RULES = FamilyRules()


def apply_approved_request(rules: FamilyRules, request: RuleChangeRequest) -> FamilyRules:
    """Вернуть новые правила с одобренной суммой по категории запроса.

    До одобрения действуют старые правила, поэтому для запроса в любом
    другом статусе выбрасывается ValueError.
    """
    from src.domain.requests import RequestStatus

    if request.status is not RequestStatus.APPROVED:
        raise ValueError("Правила меняются только после одобрения запроса родителем")
    allocation = dict(rules.agreed_allocation)
    allocation[request.category] = request.proposed_amount
    return FamilyRules(
        weekly_budget=rules.weekly_budget,
        minimums=rules.minimums,
        agreed_allocation=allocation,
    )
