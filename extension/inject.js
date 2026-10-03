// Runs in the page world before Twitch's scripts and reroutes PlaybackAccessToken GQL calls to the
// user's Worker. Any failure falls back to the direct request, so playback stays at 1080p at worst.
(() => {
  const TWITCH_GQL_URL = "https://gql.twitch.tv/gql";
  const TOKEN_OPERATION_PREFIX = "PlaybackAccessToken";
  const MESSAGE_SOURCE = "twitch-2k";
  const CONFIG_TIMEOUT_MS = 2000;
  const originalFetch = window.fetch;

  let workerUrl = "";
  let resolveConfig;
  const configReady = new Promise((resolve) => (resolveConfig = resolve));
  const configTimeout = setTimeout(() => resolveConfig(), CONFIG_TIMEOUT_MS);

  function post(message) {
    window.postMessage({ source: MESSAGE_SOURCE, ...message }, window.location.origin);
  }

  window.addEventListener("message", (event) => {
    if (event.source !== window || event.data?.source !== MESSAGE_SOURCE || event.data.type !== "config") return;
    workerUrl = event.data.workerUrl ?? "";
    clearTimeout(configTimeout);
    resolveConfig();
  });
  post({ type: "config-request" });

  function isTokenRequestBody(body) {
    if (typeof body !== "string" || !body.includes(TOKEN_OPERATION_PREFIX)) return false;
    try {
      const parsed = JSON.parse(body);
      const operations = Array.isArray(parsed) ? parsed : [parsed];
      return operations.length > 0 && operations.every((operation) => operation?.operationName?.startsWith(TOKEN_OPERATION_PREFIX));
    } catch (error) {
      console.warn("[twitch-2k] could not parse GQL body", error);
      return false;
    }
  }

  async function readRequest(input, init) {
    if (input instanceof Request) {
      const headers = new Headers(input.headers);
      new Headers(init?.headers).forEach((value, name) => headers.set(name, value));
      return { headers, body: init?.body ?? (await input.clone().text()) };
    }
    return { headers: new Headers(init?.headers), body: init?.body };
  }

  window.fetch = async function (input, init) {
    const url = input instanceof Request ? input.url : String(input);
    if (!url.startsWith(TWITCH_GQL_URL)) return originalFetch.call(this, input, init);

    const request = await readRequest(input, init);
    if (!isTokenRequestBody(request.body)) return originalFetch.call(this, input, init);

    await configReady;
    if (!workerUrl) {
      post({ type: "status", outcome: "unconfigured" });
      return originalFetch.call(this, input, init);
    }

    try {
      const response = await originalFetch(`${workerUrl}/gql`, { method: "POST", headers: request.headers, body: request.body });
      if (response.ok) {
        post({ type: "status", outcome: "proxied", body: await response.clone().text() });
        return response;
      }
      post({ type: "status", outcome: "failed", detail: `Worker returned HTTP ${response.status}` });
    } catch (error) {
      post({ type: "status", outcome: "failed", detail: `Worker unreachable: ${error instanceof Error ? error.message : String(error)}` });
    }
    return originalFetch.call(this, input, init);
  };
})();
