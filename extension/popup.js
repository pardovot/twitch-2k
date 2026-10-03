import { STATES, classifyTokenResponse, errorMessage, normalizeWorkerUrl, tabKey } from "./shared.js";

// Twitch's public web client ID, the same one twitch.tv sends.
const TWITCH_CLIENT_ID = "kimne78kx3ncx6brgo4mv6wki5h1ko";
const TEST_CHANNEL = "twitch";

const input = document.getElementById("worker-url");
const message = document.getElementById("message");

function showMessage(text, kind) {
  message.textContent = text;
  message.dataset.kind = kind;
}

function showError(error) {
  showMessage(errorMessage(error), "error");
}

function readWorkerUrl() {
  try {
    return normalizeWorkerUrl(input.value);
  } catch (error) {
    showError(error);
    return null;
  }
}

async function renderTabStatus() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab?.id === undefined) return;
  const { [tabKey(tab.id)]: status } = await chrome.storage.session.get(tabKey(tab.id));
  if (!status) return;

  const state = STATES[status.state];
  document.getElementById("status").dataset.state = status.state;
  document.getElementById("status-title").textContent = state.title;
  document.getElementById("status-detail").textContent = status.detail ? `${status.detail}. ${state.hint}` : state.hint;
}

async function testWorker(workerUrl) {
  const query = `query PlaybackAccessToken { streamPlaybackAccessToken(channelName: "${TEST_CHANNEL}", params: {platform: "web", playerBackend: "mediaplayer", playerType: "site"}) { value signature } }`;
  const response = await fetch(`${workerUrl}/gql`, {
    method: "POST",
    headers: { "Client-ID": TWITCH_CLIENT_ID },
    body: JSON.stringify({ operationName: "PlaybackAccessToken", query }),
  });
  if (!response.ok) throw new Error(`Worker returned HTTP ${response.status}`);
  return classifyTokenResponse(await response.text());
}

document.getElementById("settings").addEventListener("submit", async (event) => {
  event.preventDefault();
  const workerUrl = readWorkerUrl();
  if (!workerUrl) return;
  input.value = workerUrl;
  try {
    await chrome.storage.local.set({ workerUrl });
    showMessage("Saved. Reload Twitch tabs to apply.", "ok");
  } catch (error) {
    showError(error);
  }
});

document.getElementById("test").addEventListener("click", async () => {
  const workerUrl = readWorkerUrl();
  if (!workerUrl) return;
  showMessage("Testing...", "pending");
  try {
    const result = await testWorker(workerUrl);
    if (result.state === "failed") showMessage(result.detail, "error");
    else if (result.state === "geo") showMessage(`${STATES.geo.title}. ${STATES.geo.hint}`, "error");
    else showMessage("Worker works and its region is unrestricted.", "ok");
  } catch (error) {
    showError(error);
  }
});

chrome.storage.local
  .get("workerUrl")
  .then(({ workerUrl = "" }) => (input.value = workerUrl))
  .catch(showError);
renderTabStatus().catch(showError);
