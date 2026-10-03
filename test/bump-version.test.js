import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { bumpVersion } from "../scripts/bump-version.mjs";

describe("bumpVersion", () => {
  it("bumps the requested part and resets the lower ones", () => {
    assert.equal(bumpVersion("1.2.3", "patch"), "1.2.4");
    assert.equal(bumpVersion("1.2.3", "minor"), "1.3.0");
    assert.equal(bumpVersion("1.2.3", "major"), "2.0.0");
  });

  it("rejects unknown parts and non major.minor.patch versions", () => {
    assert.throws(() => bumpVersion("1.2.3", "build"), /major, minor, patch/);
    assert.throws(() => bumpVersion("1.2", "patch"), /major.minor.patch/);
    assert.throws(() => bumpVersion("1.2.3.4", "patch"), /major.minor.patch/);
  });
});
