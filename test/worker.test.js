import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import worker from "../worker/src/index.js";

const WORKER_URL = "https://twitch-2k-token.example.workers.dev";
const TOKEN_BODY = JSON.stringify({ operationName: "PlaybackAccessToken", query: "query PlaybackAccessToken { x }" });

function workerRequest({ method = "POST", path = "/gql", origin = "https://www.twitch.tv", headers = {}, body } = {}) {
  const allHeaders = origin ? { Origin: origin, ...headers } : headers;
  return new Request(`${WORKER_URL}${path}`, { method, headers: allHeaders, body });
}

describe("worker", () => {
  const originalFetch = globalThis.fetch;
  let upstreamCalls;

  beforeEach(() => {
    upstreamCalls = [];
    globalThis.fetch = async (url, init) => {
      upstreamCalls.push({ url, init });
      return new Response('{"data":{}}', { headers: { "Content-Type": "application/json" } });
    };
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("forwards token requests to Twitch GQL with only the allowed headers", async () => {
    const response = await worker.fetch(
      workerRequest({ body: TOKEN_BODY, headers: { Authorization: "OAuth abc", "Client-ID": "id", Cookie: "secret=1" } }),
    );

    assert.equal(response.status, 200);
    assert.equal(response.headers.get("Access-Control-Allow-Origin"), "https://www.twitch.tv");
    assert.equal(upstreamCalls.length, 1);
    assert.equal(upstreamCalls[0].url, "https://gql.twitch.tv/gql");
    assert.equal(upstreamCalls[0].init.body, TOKEN_BODY);
    assert.equal(upstreamCalls[0].init.headers.get("Authorization"), "OAuth abc");
    assert.equal(upstreamCalls[0].init.headers.get("Client-ID"), "id");
    assert.equal(upstreamCalls[0].init.headers.get("Cookie"), null);
  });

  it("accepts batched token operations", async () => {
    const body = JSON.stringify([JSON.parse(TOKEN_BODY), JSON.parse(TOKEN_BODY)]);
    const response = await worker.fetch(workerRequest({ body }));
    assert.equal(response.status, 200);
  });

  it("rejects other GQL operations", async () => {
    for (const body of [
      JSON.stringify({ operationName: "ChatList", query: "{ x }" }),
      JSON.stringify([JSON.parse(TOKEN_BODY), { operationName: "ChatList" }]),
      JSON.stringify({ operationName: "PlaybackAccessToken", query: "mutation { x }" }),
      "[]",
    ]) {
      const response = await worker.fetch(workerRequest({ body }));
      assert.equal(response.status, 403, body);
    }
    assert.equal(upstreamCalls.length, 0);
  });

  it("rejects invalid JSON", async () => {
    const response = await worker.fetch(workerRequest({ body: "{" }));
    assert.equal(response.status, 400);
  });

  it("rejects foreign origins but allows the extension and non-browser clients", async () => {
    const foreign = await worker.fetch(workerRequest({ body: TOKEN_BODY, origin: "https://evil.example" }));
    assert.equal(foreign.status, 403);

    const extension = await worker.fetch(workerRequest({ body: TOKEN_BODY, origin: "chrome-extension://abc" }));
    assert.equal(extension.headers.get("Access-Control-Allow-Origin"), "chrome-extension://abc");

    const cli = await worker.fetch(workerRequest({ body: TOKEN_BODY, origin: null }));
    assert.equal(cli.status, 200);
    assert.equal(cli.headers.get("Access-Control-Allow-Origin"), null);
  });

  it("answers CORS preflight", async () => {
    const response = await worker.fetch(workerRequest({ method: "OPTIONS" }));
    assert.equal(response.status, 204);
    assert.match(response.headers.get("Access-Control-Allow-Headers"), /Authorization/);
  });

  it("allows any headers a preflight asks for", async () => {
    const response = await worker.fetch(
      workerRequest({ method: "OPTIONS", headers: { "Access-Control-Request-Headers": "authorization,x-new-header" } }),
    );
    assert.equal(response.headers.get("Access-Control-Allow-Headers"), "authorization,x-new-header");
  });

  it("returns 404 for other paths and methods", async () => {
    assert.equal((await worker.fetch(workerRequest({ path: "/", body: TOKEN_BODY }))).status, 404);
    assert.equal((await worker.fetch(workerRequest({ method: "GET" }))).status, 404);
  });
});
