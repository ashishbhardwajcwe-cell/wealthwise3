#!/usr/bin/env node
/**
 * Every lib/newsletters.ts entry must point at a real file in public/.
 *
 *   node scripts/newsletters.test.mjs      (or: npm run test:newsletters)
 *
 * Runs as `prebuild`, so a manifest entry whose PDF was never committed fails
 * `npm run build` instead of shipping a dead "Download PDF" link on
 * /resources/newsletter. Also checks the fields the page relies on: newest
 * first, zero-padded asOfDate, unique slugs.
 *
 * No new dependencies: the manifest is transpiled with the project's own
 * `typescript` devDependency, which is why lib/newsletters.ts has no imports.
 */

import { strict as assert } from "node:assert";
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import ts from "typescript";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const source = readFileSync(join(root, "lib/newsletters.ts"), "utf8");
const { outputText } = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 },
});
const tmp = join(mkdtempSync(join(tmpdir(), "newsletters-")), "newsletters.mjs");
writeFileSync(tmp, outputText);
const { NEWSLETTERS } = await import(pathToFileURL(tmp).href);

assert.ok(Array.isArray(NEWSLETTERS), "NEWSLETTERS must be an array");

const failures = [];
const slugs = new Set();
let prev = null;
for (const n of NEWSLETTERS) {
  const id = n.slug ?? JSON.stringify(n);
  for (const k of ["slug", "label", "asOfDate", "title", "summary", "file"]) {
    if (typeof n[k] !== "string" || !n[k].trim()) failures.push(`${id}: missing ${k}`);
  }
  if (!Number.isInteger(n.pages) || n.pages < 1) failures.push(`${id}: pages must be a positive integer`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(n.asOfDate ?? "")) failures.push(`${id}: asOfDate must be YYYY-MM-DD, got "${n.asOfDate}"`);
  if (slugs.has(n.slug)) failures.push(`${id}: duplicate slug`);
  slugs.add(n.slug);
  if (prev && n.asOfDate >= prev) failures.push(`${id}: manifest must be newest first`);
  prev = n.asOfDate;

  if (typeof n.file !== "string" || !n.file.startsWith("/") || n.file.includes("..")) {
    failures.push(`${id}: file must be an absolute public path, got "${n.file}"`);
  } else if (!existsSync(join(root, "public", n.file))) {
    failures.push(`${id}: public${n.file} does not exist`);
  }
}

if (failures.length) {
  console.error("✗ lib/newsletters.ts:\n  " + failures.join("\n  "));
  process.exit(1);
}
console.log(`✓ newsletters manifest: ${NEWSLETTERS.length} issue(s), every file present in public/`);
