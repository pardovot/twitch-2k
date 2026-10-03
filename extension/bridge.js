// Connects inject.js (page world, no extension APIs) to storage and the background worker.
(() => {
  const MESSAGE_SOURCE = "twitch-2k";

  function postConfig(workerUrl) {
    window.postMessage({ source: MESSAGE_SOURCE, type: "config", workerUrl }, window.location.origin);
  }

  async function sendStoredConfig() {
    const { workerUrl = "" } = await chrome.storage.local.get("workerUrl");
    postConfig(workerUrl);
  }

  function logError(error) {
    console.warn("[twitch-2k]", error);
  }

  window.addEventListener("message", (event) => {
    if (event.source !== window || event.data?.source !== MESSAGE_SOURCE) return;
    const { type, outcome, detail, body } = event.data;
    if (type === "config-request") sendStoredConfig().catch(logError);
    if (type === "status") chrome.runtime.sendMessage({ type: "token-status", outcome, detail, body }).catch(logError);
  });

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === "local" && changes.workerUrl) postConfig(changes.workerUrl.newValue ?? "");
  });

  sendStoredConfig().catch(logError);
})();
