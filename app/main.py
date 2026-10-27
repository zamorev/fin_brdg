"""Fin Bridge — Streamlit entry (scaffold). See tasks/T01."""

import streamlit as st

st.set_page_config(page_title="Fin Bridge", layout="wide")

ROLE_TEEN = "teen"
ROLE_PARENT = "parent"


def _pick_role() -> str | None:
    if "role" in st.session_state and st.session_state["role"]:
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


def main() -> None:
    role = _pick_role()
    if role is None:
        return

    if st.sidebar.button("Сменить роль"):
        st.session_state.pop("role", None)
        st.rerun()

    if role == ROLE_TEEN:
        st.header("Подросток")
        st.info("Заглушка главной. Задача T03.")
    else:
        st.header("Родитель")
        st.info("Заглушка дашборда. Задача T07.")


if __name__ == "__main__":
    main()
