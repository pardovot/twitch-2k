// Bumps the version in extension/manifest.json and prints the new one.
// Usage: node scripts/bump-version.mjs <major|minor|patch>
import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const MANIFEST_URL = new URL("../extension/manifest.json", import.meta.url);
const PARTS = ["major", "minor", "patch"];

export function bumpVersion(version, part) {
  // Matches a plain major.minor.patch version such as 1.0.0.
  if (!/^\d+\.\d+\.\d+$/.test(version)) throw new Error(`Expected a major.minor.patch version, got ${version}`);
  const index = PARTS.indexOf(part);
  if (index === -1) throw new Error(`Bump must be one of ${PARTS.join(", ")}, got ${part}`);

  const numbers = version.split(".").map(Number);
  numbers[index] += 1;
  numbers.fill(0, index + 1);
  return numbers.join(".");
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const text = await readFile(MANIFEST_URL, "utf8");
  const { version } = JSON.parse(text);
  const next = bumpVersion(version, process.argv[2]);
  // Replaces only the version value so the rest of the file keeps its formatting.
  await writeFile(MANIFEST_URL, text.replace(`"version": "${version}"`, `"version": "${next}"`));
  console.log(next);
}
