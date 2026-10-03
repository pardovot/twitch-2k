import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { describe, it } from "node:test";
import { runInNewContext } from "node:vm";

const INJECT_SOURCE = await readFile(new URL("../extension/inject.js", import.meta.url), "utf8");
const WORKER_URL = "https://twitch-2k-token.example.workers.dev";
const GQL_URL = "https://gql.twitch.tv/gql";
const TOKEN_BODY = JSON.stringify({ operationName: "PlaybackAccessToken", variables: { login: "eslcs" } });

/** Runs inject.js against a fake page window with a stub bridge that answers config requests. */
function loadInject({ workerUrl = WORKER_URL, network }) {
  const listeners = [];
  const messages = [];
  const calls = [];
  const window = {
    location: { origin: "https://www.twitch.tv" },
    fetch: async (input, init) => {
      const url = input instanceof Request ? input.url : String(input);
      calls.push({ url, init });
      return network(url, init);
    },
    addEventListener: (type, listener) => listeners.push(listener),
    postMessage: (data) => {
      messages.push(data);
      setImmediate(() => listeners.forEach((listener) => listener({ source: window, data })));
      if (data.type === "config-request") window.postMessage({ source: "twitch-2k", type: "config", workerUrl });
    },
  };
  runInNewContext(INJECT_SOURCE, { window, Request, Headers, Response, setTimeout, clearTimeout, console });
  const statuses = () => messages.filter((message) => message.type === "status");
  return { window, calls, statuses };
}

const ok = (body = '{"data":{}}') => new Response(body, { status: 200 });

describe("inject.js fetch hook", () => {
  it("routes token requests to the Worker and reports the response", async () => {
    const page = loadInject({ network: () => ok("token") });
    const response = await page.window.fetch(GQL_URL, { method: "POST", headers: { Authorization: "OAuth abc" }, body: TOKEN_BODY });

    assert.equal(await response.text(), "token");
    assert.equal(page.calls.length, 1);
    assert.equal(page.calls[0].url, `${WORKER_URL}/gql`);
    assert.equal(page.calls[0].init.headers.get("Authorization"), "OAuth abc");
    assert.equal(page.statuses().length, 1);
    assert.deepEqual({ ...page.statuses()[0] }, { source: "twitch-2k", type: "status", outcome: "proxied", body: "token" });
  });

  it("handles Request objects", async () => {
    const page = loadInject({ network: () => ok() });
    await page.window.fetch(new Request(GQL_URL, { method: "POST", body: TOKEN_BODY }));
    assert.equal(page.calls[0].url, `${WORKER_URL}/gql`);
    assert.equal(page.calls[0].init.body, TOKEN_BODY);
  });

  it("leaves other requests alone", async () => {
    const page = loadInject({ network: () => ok() });
    await page.window.fetch(GQL_URL, { method: "POST", body: JSON.stringify({ operationName: "ChatList" }) });
    await page.window.fetch("https://usher.ttvnw.net/api/channel/hls/eslcs.m3u8");

    assert.deepEqual(
      page.calls.map((call) => call.url),
      [GQL_URL, "https://usher.ttvnw.net/api/channel/hls/eslcs.m3u8"],
    );
    assert.deepEqual(page.statuses(), []);
  });

  it("falls back to Twitch when the Worker errors", async () => {
    const page = loadInject({
      network: (url) => (url.startsWith(WORKER_URL) ? new Response("nope", { status: 502 }) : ok("direct")),
    });
    const response = await page.window.fetch(GQL_URL, { method: "POST", body: TOKEN_BODY });

    assert.equal(await response.text(), "direct");
    assert.deepEqual(
      page.calls.map((call) => call.url),
      [`${WORKER_URL}/gql`, GQL_URL],
    );
    assert.equal(page.statuses()[0].outcome, "failed");
    assert.match(page.statuses()[0].detail, /502/);
  });

  it("falls back to Twitch when the Worker is unreachable", async () => {
    const page = loadInject({
      network: (url) => {
        if (url.startsWith(WORKER_URL)) throw new TypeError("Failed to fetch");
        return ok("direct");
      },
    });
    const response = await page.window.fetch(GQL_URL, { method: "POST", body: TOKEN_BODY });

    assert.equal(await response.text(), "direct");
    assert.match(page.statuses()[0].detail, /Failed to fetch/);
  });

  it("goes direct and reports unconfigured without a Worker URL", async () => {
    const page = loadInject({ workerUrl: "", network: () => ok("direct") });
    const response = await page.window.fetch(GQL_URL, { method: "POST", body: TOKEN_BODY });

    assert.equal(await response.text(), "direct");
    assert.deepEqual(
      page.calls.map((call) => call.url),
      [GQL_URL],
    );
    assert.equal(page.statuses()[0].outcome, "unconfigured");
  });
});
