/**
 * Скопируйте в config.local.js и подключите в index.html перед config.js,
 * либо правьте backendUrl прямо в config.js локально (не коммитьте URL staging, если не нужно).
 */
window.FIN_BRIDGE_CONFIG = {
  backendUrl: "https://your-streamlit-host.example.com",
};
