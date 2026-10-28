"""Fin Bridge — Streamlit entry: role pick and routing to app/pages. See tasks/T01."""

import sys
from collections.abc import Callable
from pathlib import Path

# `streamlit run app/main.py` puts only app/ on sys.path; pages import app.* and src.*.
ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

import streamlit as st  # noqa: E402

from app.pages import parent_home, teen_home  # noqa: E402

ROLE_TEEN = "teen"
ROLE_PARENT = "parent"

# New screens: add a module in app/pages/ with render() and register it here.
PAGES: dict[str, Callable[[], None]] = {
    ROLE_TEEN: teen_home.render,
    ROLE_PARENT: parent_home.render,
}


def _pick_role() -> str | None:
    if st.session_state.get("role") in PAGES:
        return st.session_state["role"]
    st.title("Fin Bridge")
    st.caption("Прототип хакатона — выберите роль")
    col1, col2 = st.columns(2)
    with col1:
        if st.button("Я подросток", use_container_width=True):
            st.session_state["role"] = ROLE_TEEN
            st.rerun()
    with col2:
        if st.button("Я родитель", use_container_width=True):
            st.session_state["role"] = ROLE_PARENT
            st.rerun()
    return None


def _router() -> None:
    role = _pick_role()
    if role is None:
        return

    if st.sidebar.button("Сменить роль"):
        st.session_state.pop("role", None)
        st.rerun()

    PAGES[role]()


def main() -> None:
    st.set_page_config(page_title="Fin Bridge", layout="wide")
    # Explicit navigation disables auto-discovery of app/pages/ as multipage
    # entries, so a teen can't open parent screens from the sidebar.
    st.navigation([st.Page(_router, title="Fin Bridge", default=True)], position="hidden").run()


if __name__ == "__main__":
    main()
