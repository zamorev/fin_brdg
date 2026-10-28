(function () {
  const tg = window.Telegram && window.Telegram.WebApp;
  const cfg = window.FIN_BRIDGE_CONFIG || {};
  const shell = document.getElementById("shell");
  const statusEl = document.getElementById("status");
  const frame = document.getElementById("backend-frame");

  function showStatus(message) {
    if (!statusEl) return;
    statusEl.hidden = false;
    statusEl.textContent = message;
  }

  function applyTelegramChrome() {
    if (!tg) {
      showStatus("Откройте через @fin_brdg_bot в Telegram — так задумано.");
      return;
    }
    tg.ready();
    tg.expand();
    if (typeof tg.disableVerticalSwipes === "function") {
      tg.disableVerticalSwipes();
    }
    document.documentElement.style.setProperty(
      "--tg-theme-bg-color",
      tg.themeParams.bg_color || ""
    );
  }

  function mountBackend(url) {
    if (!frame || !shell) return;
    shell.classList.add("shell--hidden");
    frame.hidden = false;
    frame.src = url;
  }

  applyTelegramChrome();

  const backendUrl = (cfg.backendUrl || "").trim();
  if (backendUrl) {
    try {
      const parsed = new URL(backendUrl);
      if (parsed.protocol !== "https:") {
        showStatus("backendUrl должен быть HTTPS.");
        return;
      }
      mountBackend(parsed.toString());
    } catch {
      showStatus("backendUrl в config.js некорректен.");
    }
  } else if (tg) {
    showStatus(
      "Интерфейс квестов подключим на сервере Streamlit. Пока бот и тексты уже живут — жмите «Поехали»."
    );
  }
})();
