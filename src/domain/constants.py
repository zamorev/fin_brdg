"""Константы учебного бюджета — единственный источник чисел (docs/PRODUCT.md).

UI и квесты только импортируют отсюда, не дублируют значения.
"""

from __future__ import annotations

from enum import Enum
from types import MappingProxyType
from typing import Mapping


class Category(str, Enum):
    """Категория недельного бюджета; значение — стабильный ключ для БД и форм."""

    TRANSPORT = "transport"
    FOOD = "food"
    ENTERTAINMENT = "entertainment"
    SAVINGS = "savings"
    RESERVE = "reserve"

    @property
    def label(self) -> str:
        """Название категории для интерфейса."""
        return _CATEGORY_LABELS[self]


_CATEGORY_LABELS: Mapping[Category, str] = MappingProxyType(
    {
        Category.TRANSPORT: "Транспорт",
        Category.FOOD: "Обеды и перекусы",
        Category.ENTERTAINMENT: "Развлечения",
        Category.SAVINGS: "Накопления",
        Category.RESERVE: "Резерв",
    }
)

CURRENCY = "₽"

WEEKLY_BUDGET = 1500

# Исходный бюджет квеста 1 и демо-договорённость по умолчанию.
DEFAULT_ALLOCATION: Mapping[Category, int] = MappingProxyType(
    {
        Category.TRANSPORT: 300,
        Category.FOOD: 500,
        Category.ENTERTAINMENT: 400,
        Category.SAVINGS: 200,
        Category.RESERVE: 100,
    }
)

# Минимумы квеста 1; у развлечений минимума нет.
CATEGORY_MINIMUMS: Mapping[Category, int] = MappingProxyType(
    {
        Category.TRANSPORT: 300,
        Category.FOOD: 500,
        Category.SAVINGS: 200,
        Category.RESERVE: 100,
    }
)

# «Минимум на обязательные расходы — 800 ₽» из правил родителя.
MANDATORY_CATEGORIES: tuple[Category, ...] = (Category.TRANSPORT, Category.FOOD)
MIN_MANDATORY_EXPENSES = 800


def format_rub(amount: int) -> str:
    """Сумма в рублях для сообщений: 1500 -> «1 500 ₽»."""
    return f"{amount:,}".replace(",", " ") + f" {CURRENCY}"
