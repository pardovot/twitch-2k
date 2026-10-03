// Uploads a zip to the Chrome Web Store (API v2) and submits it for review.
// Usage: CWS_ACCESS_TOKEN=... CWS_PUBLISHER_ID=... CWS_EXTENSION_ID=... node scripts/publish-chrome-web-store.mjs <zip>
import { readFile } from "node:fs/promises";

const API_BASE = "https://chromewebstore.googleapis.com";
const POLL_INTERVAL_MS = 5000;
const POLL_TIMEOUT_MS = 5 * 60 * 1000;

const zipPath = process.argv[2];
const { CWS_ACCESS_TOKEN, CWS_PUBLISHER_ID, CWS_EXTENSION_ID } = process.env;
if (!zipPath || !CWS_ACCESS_TOKEN || !CWS_PUBLISHER_ID || !CWS_EXTENSION_ID) {
  console.error("Set CWS_ACCESS_TOKEN, CWS_PUBLISHER_ID and CWS_EXTENSION_ID and pass the zip path");
  process.exit(1);
}

const itemPath = `publishers/${CWS_PUBLISHER_ID}/items/${CWS_EXTENSION_ID}`;
const authorization = { Authorization: `Bearer ${CWS_ACCESS_TOKEN}` };

async function call(url, init) {
  const response = await fetch(url, { ...init, headers: { ...authorization, ...init.headers } });
  const text = await response.text();
  if (!response.ok) throw new Error(`${init.method} ${url} failed with HTTP ${response.status}: ${text}`);
  return JSON.parse(text);
}

async function waitForUpload() {
  const deadline = Date.now() + POLL_TIMEOUT_MS;
  while (Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
    const status = await call(`${API_BASE}/v2/${itemPath}:fetchStatus`, { method: "GET" });
    if (status.lastAsyncUploadState !== "IN_PROGRESS") return status.lastAsyncUploadState;
  }
  throw new Error("Timed out waiting for the upload to finish processing");
}

const upload = await call(`${API_BASE}/upload/v2/${itemPath}:upload`, {
  method: "POST",
  headers: { "Content-Type": "application/zip" },
  body: await readFile(zipPath),
});
const uploadState = upload.uploadState === "IN_PROGRESS" ? await waitForUpload() : upload.uploadState;
if (uploadState !== "SUCCEEDED") throw new Error(`Upload ended in state ${uploadState}: ${JSON.stringify(upload)}`);
console.log(`Uploaded version ${upload.crxVersion ?? "(processing)"}`);

const publish = await call(`${API_BASE}/v2/${itemPath}:publish`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ publishType: "DEFAULT_PUBLISH" }),
});
console.log(`Submitted, item state: ${publish.state}`);
