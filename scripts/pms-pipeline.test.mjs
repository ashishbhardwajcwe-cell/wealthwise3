#!/usr/bin/env node
/**
 * Self-test for the parts of the monthly PMS pipeline that fail silently.
 *
 *   node scripts/pms-pipeline.test.mjs      (or: npm run test:pms)
 *
 * No dependencies, no network, no Sanity. Three things are covered, all of
 * them invisible in a normal run and expensive to get wrong:
 *
 *  - Document identity (./pms-matching.mjs). Re-running the import must not
 *    change the _id of a document that already matches. A changed id doesn't
 *    error — it quietly forks a second copy of ~1,700 documents.
 *  - Month-end dates (./import-shared.mjs). A hardcoded day of 30 imports
 *    perfectly happily and puts the wrong date on the whole site.
 *  - The pins file (./pms-pins.mjs). A pin that silently fails to load takes
 *    the import down with an ambiguity abort a month later.
 *
 * The manager names below are the shape APMI actually publishes: full legal
 * names carrying a "(formerly known as …)" suffix, long enough on their own
 * to fill the old 96-character id budget.
 */

import { strict as assert } from "node:assert";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  buildExistingIndex,
  legacyStrategyId,
  newStrategyId,
  resolveImportTarget,
  pairKey,
} from "./pms-matching.mjs";
import { lastDayOfMonth, monthEndIso } from "./import-shared.mjs";
import { loadPins } from "./pms-pins.mjs";

let passed = 0;
const failures = [];
const test = (name, fn) => {
  try {
    fn();
    passed++;
  } catch (err) {
    failures.push({ name, err });
  }
};

const LONG_MANAGER =
  "360 ONE PORTFOLIO MANAGERS LIMITED (FORMERLY KNOWN AS IIFL WEALTH PORTFOLIO MANAGERS LIMITED)";
const row = (manager, strategyName) => ({ manager, strategyName });
const resolve = (r, docs) => resolveImportTarget(r, buildExistingIndex(docs));

/* ---------- the bug ---------- */

test("legacy ids collide once the manager name fills the slug budget", () => {
  const a = legacyStrategyId(LONG_MANAGER, "Multicap Advantage");
  const b = legacyStrategyId(LONG_MANAGER, "Multicap Opportunities");
  assert.equal(a, b, "expected the old scheme to collide (this test documents the bug)");

  // Only the first few characters of the strategy name survive the manager's
  // 93 characters, so any two strategies sharing a short prefix are one id.
  const managerOnly = legacyStrategyId(LONG_MANAGER, "");
  const surviving = a.slice(managerOnly.length).replace(/^-/, "");
  assert.ok(surviving.length <= 5, `expected the strategy to be all but erased, got "${surviving}"`);
});

/* ---------- the new id ---------- */

test("new ids stay distinct for the same colliding strategies", () => {
  const ids = new Set(
    ["Multicap Advantage", "Multicap Opportunities", "Phoenix Portfolio"].map((s) =>
      newStrategyId(LONG_MANAGER, s),
    ),
  );
  assert.equal(ids.size, 3);
});

test("new ids carry both fields and fit Sanity's 128-character id limit", () => {
  const id = newStrategyId(LONG_MANAGER, "Multicap Advantage Growth Approach Series Two");
  assert.ok(id.length <= 128, `id is ${id.length} chars: ${id}`);
  assert.ok(id.includes("360-one"), `manager missing from ${id}`);
  assert.ok(id.includes("multicap"), `strategy missing from ${id}`);
  assert.ok(/-[0-9a-f]{8}$/.test(id), `no hash suffix on ${id}`);
});

test("new ids are deterministic — re-running the same CSV creates the document once", () => {
  assert.equal(
    newStrategyId(LONG_MANAGER, "Multicap Advantage"),
    newStrategyId(LONG_MANAGER, "Multicap Advantage"),
  );
});

test("a strategy name is never truncated away entirely", () => {
  const short = newStrategyId(LONG_MANAGER, "A");
  const other = newStrategyId(LONG_MANAGER, "B");
  assert.notEqual(short, other);
});

/* ---------- the constraint: existing ids must not move ---------- */

test("a row matching an existing document keeps that document's _id, whatever its shape", () => {
  const existing = [
    { _id: "pmsStrategy-hand-made-in-the-studio", manager: "Stallion Asset", strategyName: "Core Fund" },
    { _id: newStrategyId("Neo Asset Management", "Alpha"), manager: "Neo Asset Management", strategyName: "Alpha" },
    {
      _id: legacyStrategyId("Motilal Oswal Asset Management", "Value Migration"),
      manager: "Motilal Oswal Asset Management",
      strategyName: "Value Migration",
    },
  ];
  for (const doc of existing) {
    const target = resolve(row(doc.manager, doc.strategyName), existing);
    assert.equal(target.matchType, "exact", `${doc._id} did not match exactly`);
    assert.equal(target.id, doc._id, `${doc._id} would have been re-pointed to ${target.id}`);
  }
});

test("a whole existing universe resolves to itself — no id moves, nothing is created", () => {
  const managers = [LONG_MANAGER, "Spark Private Wealth Management Limited", "HDFC Asset Management Company Limited"];
  const strategies = ["Multicap Advantage", "Multicap Opportunities", "Phoenix Portfolio", "Contra PMS"];
  // Seeded the way a healthy dataset looks: one document per (manager, strategy).
  const existing = managers.flatMap((m) =>
    strategies.map((s) => ({ _id: newStrategyId(m, s), manager: m, strategyName: s })),
  );
  for (const doc of existing) {
    const target = resolve(row(doc.manager, doc.strategyName), existing);
    assert.equal(target.matchType, "exact");
    assert.equal(target.id, doc._id);
  }
});

test("cosmetic name drift still lands on the same document (no duplicate minted)", () => {
  const existing = [{ _id: "pmsStrategy-self-1234abcd", manager: "Sundaram Alternates", strategyName: "S.E.L.F" }];
  for (const [manager, strategy] of [
    ["Sundaram Alternate Asset Management", "SELF"],
    ["Sundaram Alternates", "PMS SELF Strategy"],
  ]) {
    const target = resolve(row(manager, strategy), existing);
    assert.ok(["exact", "renamed"].includes(target.matchType), `got ${target.matchType}`);
    assert.equal(target.id, existing[0]._id);
  }
});

/* ---------- collision victims ---------- */

test("the strategy holding a collided legacy document keeps it; its siblings get fresh ids", () => {
  // What earlier imports left behind: ONE document under the collided id,
  // holding whichever row was written last. Every one of these strategies
  // derives that same legacy id.
  const siblings = ["Multicap Advantage", "Multicap Opportunities", "Multicap Select"];
  const victimId = legacyStrategyId(LONG_MANAGER, siblings[1]);
  for (const s of siblings) assert.equal(legacyStrategyId(LONG_MANAGER, s), victimId);
  const existing = [{ _id: victimId, manager: LONG_MANAGER, strategyName: siblings[1] }];

  const keeps = resolve(row(LONG_MANAGER, siblings[1]), existing);
  assert.equal(keeps.matchType, "exact");
  assert.equal(keeps.id, victimId, "the strategy the document actually holds must keep it");

  const ids = new Set([victimId]);
  for (const strategy of [siblings[0], siblings[2]]) {
    const target = resolve(row(LONG_MANAGER, strategy), existing);
    assert.equal(target.matchType, "new", `${strategy} should not claim someone else's document`);
    assert.notEqual(target.id, victimId);
    assert.ok(!ids.has(target.id), `${strategy} collided with an id already taken`);
    ids.add(target.id);
  }
});

/* ---------- the ambiguity backstop ---------- */

test("two existing near-duplicates and no exact pair still abort as ambiguous", () => {
  // A pluralised copy and a typo'd copy of the same strategy: both are close
  // enough to the CSV row to be plausible, neither is the row's exact name.
  const existing = [
    { _id: "pmsStrategy-a", manager: "Motilal Oswal Asset Management", strategyName: "Value Migrations" },
    { _id: "pmsStrategy-b", manager: "Motilal Oswal AMC", strategyName: "Value Migraton" },
  ];
  const target = resolve(row("Motilal Oswal Asset Management", "Value Migration"), existing);
  assert.equal(target.matchType, "ambiguous");
  assert.equal(target.candidates.length, 2);
});

test("an exact name pair wins over a merely-similar sibling instead of aborting", () => {
  const existing = [
    { _id: "pmsStrategy-exact", manager: "Trivantage Capital Management India Private Limited", strategyName: "Financial Services Fund" },
    { _id: "pmsStrategy-similar", manager: "Trivantage Capital", strategyName: "Financial Services" },
  ];
  const target = resolve(row("Trivantage Capital Management India Private Limited", "Financial Services Fund"), existing);
  assert.equal(target.matchType, "exact");
  assert.equal(target.id, "pmsStrategy-exact");
});

test("duplicate documents under one name pair are reported, never picked at random", () => {
  const existing = [
    { _id: "pmsStrategy-one", manager: "Neo Asset Management", strategyName: "Alpha" },
    { _id: "pmsStrategy-two", manager: "Neo Asset Management", strategyName: "Alpha" },
  ];
  const target = resolve(row("Neo Asset Management", "Alpha"), existing);
  assert.equal(target.matchType, "ambiguous");
});

/* ---------- pair key ---------- */

test("the pair key cannot be confused across the manager/strategy boundary", () => {
  assert.notEqual(pairKey("Alpha Beta", "Gamma"), pairKey("Alpha", "Beta Gamma"));
});

test("an unmatched row is created under a new id, never the legacy one", () => {
  const target = resolve(row(LONG_MANAGER, "Multicap Advantage"), []);
  assert.equal(target.matchType, "new");
  assert.notEqual(target.id, legacyStrategyId(LONG_MANAGER, "Multicap Advantage"));
});

/* ---------- month-end dates ---------- */

test("month-end is the real last day, in every month and every February", () => {
  const expected = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  expected.forEach((d, i) => assert.equal(lastDayOfMonth(2026, i + 1), d, `month ${i + 1}`));
  assert.equal(lastDayOfMonth(2024, 2), 29, "leap year");
  assert.equal(lastDayOfMonth(2000, 2), 29, "400-year leap rule");
  assert.equal(lastDayOfMonth(1900, 2), 28, "100-year non-leap rule");
});

test("the CSV date is always zero-padded YYYY-MM-DD", () => {
  // The two the old hardcoded `-30` got wrong, and the padding the importer
  // rejects the run over.
  assert.equal(monthEndIso(2026, 7), "2026-07-31");
  assert.equal(monthEndIso(2026, 2), "2026-02-28");
  assert.equal(monthEndIso(2026, 6), "2026-06-30");
  for (let m = 1; m <= 12; m++) assert.match(monthEndIso(2026, m), /^\d{4}-\d{2}-\d{2}$/);
  // argv gives strings, not numbers
  assert.equal(monthEndIso("2026", "7"), "2026-07-31");
});

/* ---------- pins ---------- */

const withPinsFile = (contents, fn) => {
  const dir = mkdtempSync(join(tmpdir(), "pms-pins-"));
  const path = join(dir, "pins.json");
  writeFileSync(path, typeof contents === "string" ? contents : JSON.stringify(contents));
  return fn(loadPins(new URL(`file://${path}`)));
};

test("a pin is found by the normalised name pair, through drift", () => {
  withPinsFile(
    { pins: [{ manager: "Neo Asset Management Private Limited", strategyName: "Club Moderately Conservative", sanityId: "pmsStrategy-neo-cmc" }] },
    (pins) => {
      assert.equal(pins.errors.length, 0);
      assert.equal(pins.resolved.length, 1);
      // Same strategy as APMI might spell it next month.
      const drifted = pairKey("Neo Asset Management Private Limited", "PMS Club Moderately Conservative Strategy");
      assert.equal(pins.byKey.get(drifted)?.sanityId, "pmsStrategy-neo-cmc");
    },
  );
});

test("a pin with no sanityId is reported, never applied", () => {
  withPinsFile(
    { pins: [{ manager: "HDFC Asset Management Company Limited", strategyName: "MF Select", sanityId: "" }] },
    (pins) => {
      assert.equal(pins.resolved.length, 0, "an empty id must not become a pin");
      assert.equal(pins.unresolved.length, 1);
      assert.equal(pins.byKey.size, 0);
    },
  );
});

test("two pins claiming one strategy is an error, not a silent last-wins", () => {
  withPinsFile(
    { pins: [
      { manager: "Neo Asset Management", strategyName: "Club Moderate", sanityId: "pmsStrategy-a" },
      { manager: "Neo Asset Management", strategyName: "PMS Club Moderate Fund", sanityId: "pmsStrategy-b" },
    ] },
    (pins) => {
      assert.equal(pins.errors.length, 1);
      assert.match(pins.errors[0], /duplicates pins\[0\]/);
    },
  );
});

test("a malformed pins file fails loudly instead of importing unpinned", () => {
  withPinsFile("{ not json", (pins) => {
    assert.equal(pins.errors.length, 1);
    assert.match(pins.errors[0], /not valid JSON/);
  });
  withPinsFile({ pins: "nope" }, (pins) => assert.match(pins.errors[0], /must have a "pins" array/));
  withPinsFile({ pins: [{ manager: "Only A Manager", sanityId: "x" }] }, (pins) => {
    assert.match(pins.errors[0], /both required/);
  });
});

test("a missing pins file is fine — not every project has ambiguous rows", () => {
  const pins = loadPins(new URL("file:///nonexistent/pms-pins.json"));
  assert.equal(pins.errors.length, 0);
  assert.equal(pins.resolved.length, 0);
});

test("the committed pins file parses and every entry is well-formed", () => {
  const pins = loadPins();
  assert.deepEqual(pins.errors, [], "scripts/pms-pins.json is broken");
  for (const p of [...pins.resolved, ...pins.unresolved]) {
    assert.ok(p.manager && p.strategyName, "every entry needs both names");
  }
});

/* ---------- report ---------- */

for (const f of failures) {
  console.error(`  ✗ ${f.name}`);
  console.error(`      ${f.err.message.split("\n")[0]}`);
}
console.log(`${passed} passed, ${failures.length} failed`);
process.exit(failures.length ? 1 : 0);
