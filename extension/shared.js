const GEO_REASON = "AUTHZ_GEO";
const LOGIN_REASON = "AUTHZ_NOT_LOGGED_IN";
const STATUS_ICON_SIZES = [16, 32];

export const STATES = {
  unlocked: { icon: "unlocked", title: "1440p unlocked", hint: "Twitch issued an unrestricted token." },
  login: { icon: "warning", title: "Log in to Twitch", hint: "Twitch only serves 1440p to logged-in viewers." },
  geo: {
    icon: "warning",
    title: "Worker region is restricted",
    hint: "Change placement.region in worker/wrangler.jsonc and redeploy.",
  },
  failed: { icon: "error", title: "Worker failed", hint: "Fell back to the direct request (1080p)." },
  unconfigured: { icon: "unconfigured", title: "Worker URL not set", hint: "Paste your Worker URL below." },
};

export function errorMessage(error) {
  return error instanceof Error ? error.message : String(error);
}

export function tabKey(tabId) {
  return `tab:${tabId}`;
}

export function statusIconPaths(icon) {
  return Object.fromEntries(STATUS_ICON_SIZES.map((size) => [size, `icons/${icon}-${size}.png`]));
}

/** Reads Twitch's 1440p verdict from a PlaybackAccessToken GQL response body. */
export function classifyTokenResponse(body) {
  let token;
  try {
    const parsed = JSON.parse(body);
    const data = (Array.isArray(parsed) ? parsed[0] : parsed)?.data;
    const accessToken = data?.streamPlaybackAccessToken ?? data?.videoPlaybackAccessToken;
    if (!accessToken) throw new Error("no access token in response");
    token = JSON.parse(accessToken.value);
  } catch (error) {
    return { state: "failed", detail: `Unreadable token response: ${errorMessage(error)}` };
  }

  const reasons = token.maximum_resolution_reasons?.QUAD_HD ?? [];
  if (reasons.includes(GEO_REASON)) return { state: "geo" };
  if (reasons.includes(LOGIN_REASON)) return { state: "login" };
  return { state: "unlocked" };
}

export function statusFromReport({ outcome, detail, body }) {
  if (outcome === "proxied") return classifyTokenResponse(body);
  if (outcome === "unconfigured") return { state: "unconfigured" };
  return { state: "failed", detail: detail ?? "Unknown error" };
}

export function normalizeWorkerUrl(value) {
  const url = new URL(value.trim());
  if (url.protocol !== "https:") throw new Error("Worker URL must start with https://");
  return url.origin + url.pathname.replace(/\/+$/, "");
}
