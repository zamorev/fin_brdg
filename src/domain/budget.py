"""Распределение недельного бюджета и его проверка (квест 1)."""

from __future__ import annotations

from dataclasses import asdict, dataclass
from enum import Enum
from typing import Mapping

from src.domain.constants import Category, format_rub
from src.domain.rules import DEFAULT_RULES, FamilyRules


@dataclass(frozen=True)
class BudgetAllocation:
    """Суммы в рублях по каждой категории бюджета."""

    transport: int
    food: int
    entertainment: int
    savings: int
    reserve: int

    @property
    def total(self) -> int:
        """Общая сумма распределения."""
        return sum(self.as_dict().values())

    def amount(self, category: Category) -> int:
        """Сумма по категории."""
        return getattr(self, category.value)

    def as_dict(self) -> dict[str, int]:
        """Словарь {ключ категории: сумма} — для форм и БД."""
        return asdict(self)

    @classmethod
    def from_dict(cls, data: Mapping[str, int] | Mapping[Category, int]) -> BudgetAllocation:
        """Собрать распределение из словаря с ключами-строками или Category."""
        return cls(**{Category(key).value: int(value) for key, value in data.items()})


class BudgetErrorCode(str, Enum):
    """Тип нарушения при проверке распределения."""

    TOTAL_MISMATCH = "total_mismatch"
    BELOW_MINIMUM = "below_minimum"
    NEGATIVE_AMOUNT = "negative_amount"


@dataclass(frozen=True)
class BudgetError:
    """Конкретная ошибка распределения с текстом для подростка."""

    code: BudgetErrorCode
    message: str
    category: Category | None = None


def validate_allocation(
    allocation: BudgetAllocation, rules: FamilyRules = DEFAULT_RULES
) -> list[BudgetError]:
    """Проверить распределение: сумма равна бюджету, минимумы соблюдены, нет минусов.

    Возвращает все нарушения сразу; пустой список — распределение валидно.
    """
    errors: list[BudgetError] = []

    diff = allocation.total - rules.weekly_budget
    if diff:
        direction = "больше" if diff > 0 else "меньше"
        errors.append(
            BudgetError(
                BudgetErrorCode.TOTAL_MISMATCH,
                f"Сумма должна быть {format_rub(rules.weekly_budget)}: "
                f"сейчас на {format_rub(abs(diff))} {direction}",
            )
        )

    for category in Category:
        amount = allocation.amount(category)
        if amount < 0:
            errors.append(
                BudgetError(
                    BudgetErrorCode.NEGATIVE_AMOUNT,
                    f"{category.label}: сумма не может быть отрицательной",
                    category,
                )
            )
            continue
        minimum = rules.minimums.get(category)
        if minimum is not None and amount < minimum:
            errors.append(
                BudgetError(
                    BudgetErrorCode.BELOW_MINIMUM,
                    f"{category.label}: нужно не меньше {format_rub(minimum)}, "
                    f"не хватает {format_rub(minimum - amount)}",
                    category,
                )
            )
    return errors


def is_valid_allocation(allocation: BudgetAllocation, rules: FamilyRules = DEFAULT_RULES) -> bool:
    """True, если распределение проходит все проверки квеста 1."""
    return not validate_allocation(allocation, rules)
