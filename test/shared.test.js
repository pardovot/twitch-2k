import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { classifyTokenResponse, normalizeWorkerUrl, statusFromReport } from "../extension/shared.js";

function tokenResponse(token, field = "streamPlaybackAccessToken") {
  return JSON.stringify({ data: { [field]: { value: JSON.stringify(token), signature: "sig" } } });
}

describe("classifyTokenResponse", () => {
  it("reports unlocked when nothing restricts 1440p", () => {
    const result = classifyTokenResponse(tokenResponse({ maximum_resolution: "ULTRA_HD", maximum_resolution_reasons: {} }));
    assert.deepEqual(result, { state: "unlocked" });
  });

  it("reports geo when the region is restricted, even if also logged out", () => {
    const reasons = { QUAD_HD: ["AUTHZ_GEO", "AUTHZ_NOT_LOGGED_IN"] };
    const result = classifyTokenResponse(tokenResponse({ maximum_resolution: "FULL_HD", maximum_resolution_reasons: reasons }));
    assert.equal(result.state, "geo");
  });

  it("reports login when only the login requirement remains", () => {
    const reasons = { QUAD_HD: ["AUTHZ_NOT_LOGGED_IN"] };
    const result = classifyTokenResponse(tokenResponse({ maximum_resolution: "FULL_HD", maximum_resolution_reasons: reasons }));
    assert.equal(result.state, "login");
  });

  it("reads batched and VOD responses", () => {
    const batched = `[${tokenResponse({ maximum_resolution: "ULTRA_HD" })}]`;
    assert.equal(classifyTokenResponse(batched).state, "unlocked");
    const vod = tokenResponse({ maximum_resolution: "ULTRA_HD" }, "videoPlaybackAccessToken");
    assert.equal(classifyTokenResponse(vod).state, "unlocked");
  });

  it("reports failed for unreadable responses", () => {
    assert.equal(classifyTokenResponse("not json").state, "failed");
    assert.equal(classifyTokenResponse('{"errors":[{"message":"bad"}]}').state, "failed");
  });
});

describe("statusFromReport", () => {
  it("maps each outcome to a state", () => {
    const body = tokenResponse({ maximum_resolution: "ULTRA_HD" });
    assert.equal(statusFromReport({ outcome: "proxied", body }).state, "unlocked");
    assert.deepEqual(statusFromReport({ outcome: "unconfigured" }), { state: "unconfigured" });
    assert.deepEqual(statusFromReport({ outcome: "failed", detail: "boom" }), { state: "failed", detail: "boom" });
  });
});

describe("normalizeWorkerUrl", () => {
  it("trims whitespace and trailing slashes", () => {
    assert.equal(normalizeWorkerUrl("  https://a.workers.dev/ "), "https://a.workers.dev");
    assert.equal(normalizeWorkerUrl("https://example.com/proxy//"), "https://example.com/proxy");
  });

  it("rejects non-https and malformed URLs", () => {
    assert.throws(() => normalizeWorkerUrl("http://a.workers.dev"), /https/);
    assert.throws(() => normalizeWorkerUrl("a.workers.dev"));
  });
});
