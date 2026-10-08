import { STATES, statusFromReport, statusIconPaths, tabKey } from "./shared.js";

function logError(error) {
  console.warn("[twitch-2k]", error);
}

chrome.runtime.onMessage.addListener((message, sender) => {
  const tabId = sender.tab?.id;
  if (message.type !== "token-status" || tabId === undefined) return;

  const status = statusFromReport(message);
  const { icon, title } = STATES[status.state];
  Promise.all([
    chrome.action.setIcon({ tabId, path: statusIconPaths(icon) }),
    chrome.action.setTitle({ tabId, title: `${chrome.runtime.getManifest().name}: ${title}` }),
    chrome.storage.session.set({ [tabKey(tabId)]: status }),
  ]).catch(logError);
});

chrome.tabs.onRemoved.addListener((tabId) => {
  chrome.storage.session.remove(tabKey(tabId)).catch(logError);
});
