"""Dark mobile-first theme for teen screens. Injected only while a teen page renders."""

import streamlit as st

_CSS = """
@import url('https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700&family=Unbounded:wght@700;800&display=swap');

:root {
  --fb-bg: #0d1325;
  --fb-surface: #172340;
  --fb-surface-hi: #1c2a4c;
  --fb-line: #24325a;
  --fb-text: #eef1f8;
  --fb-muted: #8c9ab8;
  --fb-gold: #e8b04a;
  --fb-gold-bg: #3a3328;
  --fb-green: #4fbf8b;
  --fb-green-bg: #1e3a3a;
  --fb-blue: #5b8cff;
  --fb-blue-bg: #22356b;
  --fb-icon-bg: #2e3346;
  --fb-font: 'Manrope', system-ui, -apple-system, 'Segoe UI', sans-serif;
  --fb-display: 'Unbounded', 'Manrope', system-ui, sans-serif;
}

.stApp, [data-testid="stHeader"] { background: var(--fb-bg); }
[data-testid="stSidebar"] { background: var(--fb-surface); }
[data-testid="stSidebar"] * { color: var(--fb-text); }
[data-testid="stSidebarUserContent"] button {
  background: transparent; border: 1px solid var(--fb-line); border-radius: 999px;
}
[data-testid="stSidebarUserContent"] button:hover { border-color: var(--fb-muted); }
.stApp, .stApp p, .stApp button { font-family: var(--fb-font); color: var(--fb-text); }
/* Streamlit sets its own font on markdown blocks; display classes below override this. */
[class^="fb-"], [class*=" fb-"] { font-family: var(--fb-font); }

[data-testid="stMainBlockContainer"] {
  max-width: 420px;
  padding: 2.5rem 16px 3rem;
}

/* Header */
.fb-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px; }
.fb-logo { font-family: var(--fb-display); font-weight: 800; font-size: 20px; letter-spacing: -0.02em; }
.fb-who { display: flex; align-items: center; gap: 8px; color: var(--fb-muted); font-size: 14px; }
.fb-who::before { content: ""; width: 7px; height: 7px; border-radius: 50%; background: var(--fb-green); }

/* Level + budget card */
.fb-hero {
  border-radius: 28px;
  padding: 28px 22px 26px;
  background: radial-gradient(120% 90% at 0% 0%, #1d2a4d 0%, #121a32 60%, #0f1629 100%);
}
.fb-ring { position: relative; width: 104px; height: 104px; margin: 0 auto; }
.fb-ring svg { width: 100%; height: 100%; transform: rotate(-90deg); }
.fb-ring-label { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; }
.fb-ring-level { font-family: var(--fb-display); font-weight: 800; font-size: 28px; line-height: 1; }
.fb-ring-caption { color: var(--fb-muted); font-size: 11px; margin-top: 4px; }
.fb-xp { text-align: center; color: var(--fb-gold); font-weight: 600; font-size: 13px; margin: 14px 0 20px; }
.fb-hr { height: 1px; background: var(--fb-line); margin: 0 0 20px; }
.fb-budget-label { color: var(--fb-muted); font-size: 13px; }
.fb-budget { font-family: var(--fb-display); font-weight: 800; font-size: 40px; letter-spacing: -0.02em; line-height: 1.2; margin-top: 4px; }

.fb-section { font-weight: 700; font-size: 17px; margin: 18px 0 2px; }

/* Task list */
.st-key-teen_tasks {
  background: var(--fb-surface);
  border-radius: 24px;
  padding: 4px 16px;
}
/* Streamlit pulls markdown blocks up by -1rem, which makes rows overlap. */
.st-key-teen_tasks [data-testid="stMarkdownContainer"] { margin-bottom: 0 !important; }
.fb-row { display: flex; align-items: center; gap: 14px; padding: 16px 0; }
.fb-row-divider { border-bottom: 1px solid var(--fb-line); }
.fb-row-icon {
  flex: none; width: 40px; height: 40px; border-radius: 12px;
  display: flex; align-items: center; justify-content: center;
  background: var(--fb-icon-bg);
}
.fb-row-icon.fb-blue { background: var(--fb-blue-bg); }
.fb-row-text { flex: 1; min-width: 0; }
.fb-row-title { font-weight: 700; font-size: 15px; line-height: 1.3; }
.fb-row-sub { color: var(--fb-muted); font-size: 13px; line-height: 1.4; margin-top: 2px; }
.fb-row-gap { flex: none; width: 76px; }
.fb-chip { flex: none; border-radius: 999px; padding: 6px 12px; font-weight: 700; font-size: 13px; }
.fb-chip-wait { color: var(--fb-gold); background: var(--fb-gold-bg); }

/* Buttons layered over task rows */
.st-key-teen_row_week, .st-key-teen_row_agreements { position: relative; }
.st-key-teen_start_week {
  position: absolute; right: 0; top: 50%; transform: translateY(-50%); width: auto;
}
.st-key-teen_start_week button {
  border: none; border-radius: 999px; min-height: 0; padding: 6px 14px;
  background: var(--fb-green-bg); color: var(--fb-green);
}
.st-key-teen_start_week button:hover,
.st-key-teen_start_week button:focus:not(:active) { background: #24474a; color: var(--fb-green); }
.st-key-teen_start_week button p { font-weight: 700; font-size: 13px; color: var(--fb-green); }
.st-key-teen_open_agreements { position: absolute; inset: 0; }
.st-key-teen_open_agreements button {
  width: 100%; height: 100%; opacity: 0; cursor: pointer;
}

/* Stub screens */
.fb-stub {
  background: var(--fb-surface); border-radius: 24px; padding: 22px; margin-top: 18px;
}
.fb-stub-title { font-weight: 700; font-size: 18px; }
.fb-stub-text { color: var(--fb-muted); font-size: 14px; line-height: 1.5; margin-top: 8px; }
.st-key-teen_back { margin-top: 8px; }
.st-key-teen_back button {
  border: 1px solid var(--fb-line); border-radius: 999px; background: transparent; color: var(--fb-text);
}
.st-key-teen_back button:hover { border-color: var(--fb-muted); color: var(--fb-text); }
"""


def inject_styles() -> None:
    st.markdown(f"<style>{_CSS}</style>", unsafe_allow_html=True)
