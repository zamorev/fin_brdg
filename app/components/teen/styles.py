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
  --fb-red: #e8665a;
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

/* Quest 1: back link, card, sliders, total, result */
.st-key-quest_week_nav .st-key-teen_back { margin: 0 0 4px; }
.st-key-quest_week_nav .st-key-teen_back button {
  border: none; background: transparent; padding: 4px 0; min-height: 0;
}
.st-key-quest_week_nav .st-key-teen_back button p { font-weight: 700; font-size: 17px; }
.st-key-quest_week_card {
  background: var(--fb-surface); border-radius: 28px; padding: 26px 20px 24px; gap: 0;
}
.st-key-quest_week_card [data-testid="stMarkdownContainer"] { margin-bottom: 0 !important; }
.fb-quest-title { font-family: var(--fb-display); font-weight: 800; font-size: 26px; letter-spacing: -0.02em; line-height: 1.2; }
.fb-quest-text { color: var(--fb-muted); font-size: 15px; line-height: 1.55; margin: 12px 0 14px; }
.fb-amount { display: flex; justify-content: space-between; align-items: baseline; margin-top: 12px; font-size: 16px; }
.fb-amount-value { font-family: var(--fb-display); font-weight: 800; font-size: 15px; white-space: nowrap; }
.st-key-quest_week_card [data-testid="stSlider"] { padding: 0 8px; }
/* Thumb: the positioned div that wraps the hidden range input. */
.st-key-quest_week_card [data-testid="stSlider"] div:has(> div > input[type="range"]) {
  background: #1a7cff; box-shadow: none; width: 22px; height: 22px;
}
/* Track: plain line as in the mockup instead of the theme-colored fill. */
.st-key-quest_week_card [data-testid="stSlider"] div[style*="position: relative"] > div:first-child {
  background: var(--fb-line) !important;
}
.st-key-quest_week_card [data-testid="stSliderThumbValue"],
.st-key-quest_week_card [data-testid="stSliderTickBar"] { display: none; }
.fb-total { border-top: 1px solid var(--fb-line); margin-top: 18px; padding-top: 18px; }
.fb-total-row { display: flex; flex-wrap: wrap; justify-content: space-between; align-items: baseline; gap: 4px 12px; }
.fb-total-label { color: var(--fb-muted); font-size: 16px; }
.fb-total-value { font-family: var(--fb-display); font-weight: 800; font-size: 15px; color: var(--fb-gold); white-space: nowrap; }
.fb-total-value.fb-ok { color: var(--fb-green); }
.fb-total-value.fb-over { color: var(--fb-red); }
.fb-total-hint { color: var(--fb-muted); font-size: 13px; text-align: right; margin-top: 4px; }
.st-key-quest_week_check { margin-top: 18px; }
.st-key-quest_week_check button {
  border: none; border-radius: 999px; min-height: 56px; background: #2f6fed; color: #fff;
}
.st-key-quest_week_check button:hover,
.st-key-quest_week_check button:focus:not(:active) { background: #3b7bf5; color: #fff; }
.st-key-quest_week_check button p { font-weight: 700; font-size: 17px; color: #fff; }
.fb-result { border-radius: 18px; padding: 16px 18px; margin-top: 16px; font-size: 14px; line-height: 1.5; }
.fb-result-title { font-weight: 700; font-size: 16px; margin-bottom: 4px; }
.fb-result ul { margin: 0; padding-left: 18px; }
.fb-result-error { background: var(--fb-gold-bg); }
.fb-result-error .fb-result-title { color: var(--fb-gold); }
.fb-result-ok { background: var(--fb-green-bg); }
.fb-result-ok .fb-result-title { color: var(--fb-green); }

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
