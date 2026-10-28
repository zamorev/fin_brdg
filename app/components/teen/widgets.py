"""Building blocks of teen screens: header, level card, task rows, stub screen."""

from collections.abc import Callable
from html import escape

import streamlit as st

_ICON_ATTRS = (
    'width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="{color}" '
    'stroke-width="2" stroke-linecap="round" stroke-linejoin="round"'
)
ICON_BRIEFCASE = (
    f"<svg {_ICON_ATTRS}>"
    '<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>'
    "</svg>"
)
ICON_CLOCK = f'<svg {_ICON_ATTRS}><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>'
ICON_CHECK = f'<svg {_ICON_ATTRS}><circle cx="12" cy="12" r="9"/><path d="m8.5 12 2.5 2.5 4.5-5"/></svg>'

_GOLD = "#e8b04a"
_BLUE = "#5b8cff"


def _html(markup: str) -> None:
    # Markdown treats indented lines as code blocks, so flatten the markup first.
    st.markdown("".join(line.strip() for line in markup.splitlines()), unsafe_allow_html=True)


def header(name: str) -> None:
    _html(
        f"""
        <div class="fb-header">
          <div class="fb-logo">Fin Bridge</div>
          <div class="fb-who">{escape(name)}, подросток</div>
        </div>
        """
    )


def level_card(level: int, progress: float, xp_to_next: int, budget_text: str) -> None:
    radius = 44
    circumference = 2 * 3.14159 * radius
    dash = circumference * max(0.0, min(progress, 1.0))
    _html(
        f"""
        <div class="fb-hero">
          <div class="fb-ring">
            <svg viewBox="0 0 104 104">
              <circle cx="52" cy="52" r="{radius}" fill="none" stroke="#26345c" stroke-width="8"/>
              <circle cx="52" cy="52" r="{radius}" fill="none" stroke="{_GOLD}" stroke-width="8"
                stroke-linecap="round" stroke-dasharray="{dash:.1f} {circumference:.1f}"/>
            </svg>
            <div class="fb-ring-label">
              <div class="fb-ring-level">{level}</div>
              <div class="fb-ring-caption">уровень</div>
            </div>
          </div>
          <div class="fb-xp">{xp_to_next} XP до уровня {level + 1}</div>
          <div class="fb-hr"></div>
          <div class="fb-budget-label">бюджет на эту неделю</div>
          <div class="fb-budget">{escape(budget_text)}</div>
        </div>
        """
    )


def section_title(text: str) -> None:
    _html(f'<div class="fb-section">{escape(text)}</div>')


def task_row(
    icon: str,
    title: str,
    subtitle: str,
    *,
    blue_icon: bool = False,
    chip: str | None = None,
    reserve_right: bool = False,
    divider: bool = True,
) -> None:
    """One row of the task list; clickable parts are separate st.button widgets."""
    icon_cls = "fb-row-icon fb-blue" if blue_icon else "fb-row-icon"
    icon_svg = icon.format(color=_BLUE if blue_icon else _GOLD)
    right = ""
    if chip:
        right = f'<div class="fb-chip fb-chip-wait">{escape(chip)}</div>'
    elif reserve_right:
        right = '<div class="fb-row-gap"></div>'
    row_cls = "fb-row fb-row-divider" if divider else "fb-row"
    _html(
        f"""
        <div class="{row_cls}">
          <div class="{icon_cls}">{icon_svg}</div>
          <div class="fb-row-text">
            <div class="fb-row-title">{escape(title).replace(" ₽", "&nbsp;₽")}</div>
            <div class="fb-row-sub">{escape(subtitle)}</div>
          </div>
          {right}
        </div>
        """
    )


def stub_screen(title: str, text: str, on_back: Callable[[], None]) -> None:
    _html(
        f"""
        <div class="fb-stub">
          <div class="fb-stub-title">{escape(title)}</div>
          <div class="fb-stub-text">{escape(text)}</div>
        </div>
        """
    )
    st.button("← Назад", key="teen_back", on_click=on_back)
