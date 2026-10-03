// Mints Twitch playback tokens from this Worker's region. Only the token is geo-gated,
// so usher playlists and video segments still load directly from the viewer's network.

const TWITCH_GQL_URL = "https://gql.twitch.tv/gql";
const TWITCH_ORIGIN = "https://www.twitch.tv";
const EXTENSION_ORIGIN_PREFIX = "chrome-extension://";
const TOKEN_OPERATION_PREFIX = "PlaybackAccessToken";
const FORWARDED_HEADERS = [
  "Authorization",
  "Client-ID",
  "Client-Integrity",
  "Client-Session-Id",
  "Client-Version",
  "Content-Type",
  "Device-ID",
];

function isAllowedOrigin(origin) {
  return origin === null || origin === TWITCH_ORIGIN || origin.startsWith(EXTENSION_ORIGIN_PREFIX);
}

function corsHeaders(request) {
  const origin = request.headers.get("Origin");
  if (origin === null) return {};
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    // Allows whatever headers Twitch starts sending so its preflight never fails. Only
    // FORWARDED_HEADERS are passed on to Twitch.
    "Access-Control-Allow-Headers": request.headers.get("Access-Control-Request-Headers") ?? FORWARDED_HEADERS.join(", "),
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

function isTokenOperation(operation) {
  return (
    typeof operation?.operationName === "string" &&
    operation.operationName.startsWith(TOKEN_OPERATION_PREFIX) &&
    !/\bmutation\b/.test(operation.query ?? "")
  );
}

export default {
  async fetch(request) {
    if (!isAllowedOrigin(request.headers.get("Origin"))) return new Response("origin not allowed", { status: 403 });

    const cors = corsHeaders(request);
    const reply = (status, text) => new Response(text, { status, headers: cors });
    const { pathname } = new URL(request.url);
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
    if (request.method !== "POST" || pathname !== "/gql") return reply(404, "not found");

    const body = await request.text();
    let parsed;
    try {
      parsed = JSON.parse(body);
    } catch (error) {
      return reply(400, `invalid json: ${error instanceof Error ? error.message : String(error)}`);
    }
    const operations = Array.isArray(parsed) ? parsed : [parsed];
    if (operations.length === 0 || !operations.every(isTokenOperation)) {
      return reply(403, "only PlaybackAccessToken operations are proxied");
    }

    const headers = new Headers();
    for (const name of FORWARDED_HEADERS) {
      const value = request.headers.get(name);
      if (value) headers.set(name, value);
    }

    const upstream = await fetch(TWITCH_GQL_URL, { method: "POST", headers, body });
    return new Response(upstream.body, {
      status: upstream.status,
      headers: { ...cors, "Content-Type": upstream.headers.get("Content-Type") ?? "application/json" },
    });
  },
};
