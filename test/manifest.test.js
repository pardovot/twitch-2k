import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { describe, it } from "node:test";
import { STATES, statusIconPaths } from "../extension/shared.js";

const EXTENSION_DIR = new URL("../extension/", import.meta.url);
const MAX_NAME_LENGTH = 75;
const MAX_DESCRIPTION_LENGTH = 132;

const manifest = JSON.parse(await readFile(new URL("manifest.json", EXTENSION_DIR), "utf8"));

function assertPackaged(path) {
  assert.ok(existsSync(new URL(path, EXTENSION_DIR)), `extension/${path} is missing`);
}

describe("manifest.json", () => {
  it("meets Chrome Web Store limits", () => {
    assert.equal(manifest.manifest_version, 3);
    // Chrome versions are one to four dot-separated integers.
    assert.match(manifest.version, /^\d+(\.\d+){0,3}$/);
    assert.ok(manifest.name.length <= MAX_NAME_LENGTH, "name too long");
    assert.ok(manifest.description.length <= MAX_DESCRIPTION_LENGTH, "description too long");
  });

  it("references only files that exist", () => {
    const paths = [
      manifest.background.service_worker,
      manifest.action.default_popup,
      ...Object.values(manifest.action.default_icon),
      ...Object.values(manifest.icons),
      ...manifest.content_scripts.flatMap((script) => script.js),
    ];
    paths.forEach(assertPackaged);
  });

  it("has a 128px store icon", () => {
    assert.equal(manifest.icons["128"], "icons/128.png");
  });
});

describe("packaged assets", () => {
  it("includes every file popup.html loads", async () => {
    const html = await readFile(new URL("popup.html", EXTENSION_DIR), "utf8");
    // Captures the value of every src="..." and href="..." attribute.
    const references = [...html.matchAll(/\b(?:src|href)="([^"]+)"/g)].map((match) => match[1]);
    assert.ok(references.length > 0);
    references.forEach(assertPackaged);
  });

  it("includes a status icon for every state", () => {
    for (const { icon } of Object.values(STATES)) Object.values(statusIconPaths(icon)).forEach(assertPackaged);
  });
});
