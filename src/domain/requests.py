"""Запрос подростка на изменение правил и решение родителя."""

from __future__ import annotations

from dataclasses import dataclass, field, replace
from datetime import datetime, timezone
from enum import Enum

from src.domain.constants import WEEKLY_BUDGET, Category, format_rub


class RequestStatus(str, Enum):
    """Статус запроса; значение — стабильный ключ для БД."""

    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"
    NEEDS_CLARIFICATION = "needs_clarification"

    @property
    def label(self) -> str:
        """Статус для интерфейса обеих ролей."""
        return _STATUS_LABELS[self]

    @property
    def is_final(self) -> bool:
        """Решение окончательное и больше не меняется."""
        return self in (RequestStatus.APPROVED, RequestStatus.REJECTED)


_STATUS_LABELS = {
    RequestStatus.PENDING: "На рассмотрении",
    RequestStatus.APPROVED: "Одобрено",
    RequestStatus.REJECTED: "Отклонено",
    RequestStatus.NEEDS_CLARIFICATION: "Нужно уточнение",
}


def _now() -> datetime:
    return datetime.now(timezone.utc)


@dataclass(frozen=True)
class RuleChangeRequest:
    """Предложение изменить сумму категории с объяснением; id задаёт слой БД."""

    category: Category
    current_amount: int
    proposed_amount: int
    explanation: str
    status: RequestStatus = RequestStatus.PENDING
    parent_comment: str = ""
    id: int | None = None
    created_at: datetime = field(default_factory=_now)

    @property
    def delta(self) -> int:
        """На сколько рублей меняется сумма категории."""
        return self.proposed_amount - self.current_amount

    @property
    def is_final(self) -> bool:
        """Родитель уже окончательно одобрил или отклонил запрос."""
        return self.status.is_final


def validate_rule_change(
    category: Category,
    current_amount: int,
    proposed_amount: int,
    explanation: str,
) -> list[str]:
    """Проверить поля запроса; вернуть список ошибок на русском (пустой — ок)."""
    errors: list[str] = []
    if not isinstance(category, Category):
        errors.append("Выберите категорию бюджета")
    if not explanation or not explanation.strip():
        errors.append("Добавьте объяснение, зачем нужно изменение")
    if proposed_amount <= 0:
        errors.append("Новая сумма должна быть больше нуля")
    elif proposed_amount > WEEKLY_BUDGET:
        errors.append(f"Новая сумма не может превышать недельный бюджет {format_rub(WEEKLY_BUDGET)}")
    elif proposed_amount == current_amount:
        errors.append("Новая сумма должна отличаться от текущей")
    return errors


def create_rule_change_request(
    category: Category,
    current_amount: int,
    proposed_amount: int,
    explanation: str,
) -> RuleChangeRequest:
    """Создать запрос со статусом «На рассмотрении»; ValueError при неверных полях."""
    errors = validate_rule_change(category, current_amount, proposed_amount, explanation)
    if errors:
        raise ValueError("; ".join(errors))
    return RuleChangeRequest(
        category=category,
        current_amount=current_amount,
        proposed_amount=proposed_amount,
        explanation=explanation.strip(),
    )


def decide_request(
    request: RuleChangeRequest, status: RequestStatus, comment: str = ""
) -> RuleChangeRequest:
    """Решение родителя: одобрить, отклонить или попросить уточнить.

    Возвращает новый объект; исходный запрос не меняется. После одобрения
    или отклонения решение менять нельзя.
    """
    if status is RequestStatus.PENDING:
        raise ValueError("Решение родителя не может вернуть статус «На рассмотрении»")
    if request.is_final:
        raise ValueError(f"По запросу уже принято решение: {request.status.label}")
    return replace(request, status=status, parent_comment=comment.strip())
