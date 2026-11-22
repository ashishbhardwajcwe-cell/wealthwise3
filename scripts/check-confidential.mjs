#!/usr/bin/env node
/**
 * Repo guard: fails if anything that looks like a DEALER (cost) price appears
 * in the unlisted data pipeline's files.
 *
 *   npm run check:confidential            scan the data/config/template paths below
 *   npm run check:confidential -- --staged   also scan staged changes (run before committing)
 *
 * Scans JSON keys, CSV headers, and the text of every file for the term "dealer".
 * Prints file + key/line only — never a value.
 */
import { execSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { parseCsv } from "./import-shared.mjs";
import { CONFIDENTIAL_KEY_RE, CONFIDENTIAL_TEXT_RE, assertNoConfidentialKeys } from "./unlisted-fundamentals-lib.mjs";

const ROOTS = ["data/unlisted-snapshots", "data/unlisted-fundamentals", "_templates", "_incoming", "config/unlisted-scorecard.json"];
const root = process.cwd();
const failures = [];

const walk = (p) => {
  if (!existsSync(p)) return [];
  if (statSync(p).isFile()) return [p];
  return readdirSync(p).flatMap((f) => walk(join(p, f)));
};

for (const file of ROOTS.flatMap((r) => walk(join(root, r)))) {
  const rel = relative(root, file);
  if (!/\.(json|csv)$/i.test(file)) continue;
  const text = readFileSync(file, "utf8");
  text.split("\n").forEach((line, i) => { if (CONFIDENTIAL_TEXT_RE.test(line)) failures.push(`${rel}:${i + 1}: contains a confidential term`); });
  try {
    if (/\.json$/i.test(file)) assertNoConfidentialKeys(JSON.parse(text), rel);
    else for (const h of parseCsv(text)[0] ?? []) if (CONFIDENTIAL_KEY_RE.test(h)) failures.push(`${rel}: confidential column "${h.trim()}"`);
  } catch (e) { failures.push(e.message.split(". Aborting")[0]); }
}

if (process.argv.includes("--staged")) {
  const diff = execSync(`git diff --cached -U0 --no-color -- ${ROOTS.join(" ")}`, { encoding: "utf8", maxBuffer: 512 * 1024 * 1024 });
  let file = null;
  for (const line of diff.split("\n")) {
    if (line.startsWith("+++ b/")) file = line.slice(6);
    else if (line.startsWith("+") && !line.startsWith("+++") && file && /\.(json|csv)$/i.test(file) && CONFIDENTIAL_TEXT_RE.test(line)) {
      failures.push(`staged ${file}: adds a line with a confidential term`);
    }
  }
}

if (failures.length) {
  console.error(`check:confidential FAILED (${failures.length}):\n  ${failures.join("\n  ")}`);
  process.exit(1);
}
console.log("check:confidential: no dealer/cost price fields or terms found.");
