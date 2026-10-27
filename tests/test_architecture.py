"""Structural invariants (harness guardrails)."""

from __future__ import annotations

import ast
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def _python_files_under(relative: str) -> list[Path]:
    base = ROOT / relative
    if not base.exists():
        return []
    return sorted(p for p in base.rglob("*.py") if p.is_file())


def _imports_in_file(path: Path) -> set[str]:
    tree = ast.parse(path.read_text(encoding="utf-8"), filename=str(path))
    names: set[str] = set()
    for node in ast.walk(tree):
        if isinstance(node, ast.Import):
            for alias in node.names:
                names.add(alias.name.split(".")[0])
        elif isinstance(node, ast.ImportFrom) and node.module:
            names.add(node.module.split(".")[0])
    return names


def test_domain_and_quests_do_not_import_streamlit() -> None:
    forbidden = {"streamlit"}
    for folder in ("src/domain", "src/quests", "src/db"):
        for path in _python_files_under(folder):
            if path.name == "__init__.py" and path.stat().st_size < 80:
                continue
            imports = _imports_in_file(path)
            assert not (imports & forbidden), f"{path}: streamlit must stay in app/"


def test_app_does_not_embed_sql_strings() -> None:
    """UI must use src/db, not raw SQL in pages."""
    sql_markers = ("SELECT ", "INSERT ", "UPDATE ", "DELETE ", "CREATE TABLE")
    for path in _python_files_under("app"):
        text = path.read_text(encoding="utf-8")
        upper = text.upper()
        for marker in sql_markers:
            assert marker not in upper, f"{path}: move SQL to src/db"
