#!/usr/bin/env node
/**
 * Eyeball what isInstitutionalMandate() catches, before it changes what a
 * visitor sees.
 *
 *   npm run list:mandates              # counts only
 *   npm run list:mandates -- --list    # every matched strategy name
 *   npm run list:mandates -- --list --near-misses
 *   npm run list:mandates -- --csv scripts/archive/pms-2026-06-30.csv --list
 *
 * READ ONLY. It queries Sanity (or reads an archive CSV) and prints. It writes
 * nothing, patches nothing, and is not part of the monthly pipeline.
 *
 * WHY IT EXISTS
 * -------------
 * The filter hides rows from /compare. A token that is too greedy hides a real
 * strategy and no one finds out, because the page looks fine either way — the
 * strategy is simply absent. So the list has to be readable on demand.
 *
 * ONE DEFINITION
 * --------------
 * The token list is not repeated here. It is parsed out of lib/pms.ts at run
 * time, so this tool can only ever report what the site actually applies. If
 * the parse fails the script aborts rather than falling back to a stale copy —
 * a second copy of a filter list is how the reported list and the shipped
 * behaviour drift apart.
 *
 * Env: NEXT_PUBLIC_SANITY_PROJECT_ID (the dataset reads publicly, no token
 * needed). Not required with --csv.
 */

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { requireSanityEnv, sanityQuery, parseCsv } from "./import-shared.mjs";

const argv = process.argv.slice(2);
const LIST = argv.includes("--list");
const NEAR_MISSES = argv.includes("--near-misses");
const csvFlag = argv.indexOf("--csv");
const CSV_PATH = csvFlag !== -1 ? argv[csvFlag + 1] : null;

/* ---------- the token list, read from the source of truth ---------- */

const PMS_TS = new URL("../lib/pms.ts", import.meta.url);

function loadTokens() {
  const src = readFileSync(PMS_TS, "utf8");
  const block = src.match(/const INSTITUTIONAL_TOKENS\s*=\s*\[([\s\S]*?)\]\s*;/);
  if (!block) {
    console.error(
      "Could not find INSTITUTIONAL_TOKENS in lib/pms.ts.\n" +
      "It was renamed or reshaped — update the regex in this script rather than\n" +
      "pasting a copy of the list here, or the two will drift.",
    );
    process.exit(1);
  }
  const tokens = [...block[1].matchAll(/"([^"]+)"/g)].map((m) => m[1]);
  if (tokens.length === 0) {
    console.error("INSTITUTIONAL_TOKENS parsed as empty — refusing to report a filter that matches nothing.");
    process.exit(1);
  }
  return tokens;
}

const TOKENS = loadTokens();

/** Mirrors isInstitutionalMandate()'s normalisation exactly. */
const normalize = (s) =>
  ` ${String(s ?? "").toLowerCase().replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim()} `;

const matchOf = (strategyName) => {
  const name = normalize(strategyName);
  return TOKENS.find((t) => name.includes(` ${t} `)) ?? null;
};

/**
 * Names that contain a token as a SUBSTRING but not as a whole word. These are
 * the rows the word-boundary rule deliberately spares ("Alpha PFC Portfolio"
 * vs " pf "), and the ones to check if a strategy goes missing.
 */
const nearMissOf = (strategyName) => {
  if (matchOf(strategyName)) return null;
  const flat = normalize(strategyName).replace(/ /g, "");
  return TOKENS.find((t) => flat.includes(t.replace(/ /g, ""))) ?? null;
};

/* ---------- input ---------- */

async function readRows() {
  if (CSV_PATH) {
    const rows = parseCsv(readFileSync(resolve(CSV_PATH), "utf8"));
    const header = rows[0].map((h) => h.trim());
    const iName = header.indexOf("strategyName");
    const iMgr = header.indexOf("manager");
    const iAum = header.indexOf("aumCr");
    if (iName === -1) {
      console.error(`${CSV_PATH} has no "strategyName" column.`);
      process.exit(1);
    }
    return rows.slice(1).map((r) => ({
      strategyName: r[iName],
      manager: iMgr === -1 ? "" : r[iMgr],
      aumCr: iAum === -1 ? null : Number(r[iAum]) || null,
    }));
  }
  const env = requireSanityEnv({ write: false });
  const docs = await sanityQuery(
    env,
    `*[_type == "pmsStrategy" && !(_id in path("drafts.**"))]{
       strategyName, manager, aumCr
     } | order(aumCr desc)`,
  );
  if (!Array.isArray(docs) || docs.length === 0) {
    console.error(`No pmsStrategy documents in ${env.projectId}/${env.dataset}.`);
    process.exit(1);
  }
  return docs;
}

/* ---------- report ---------- */

const rows = await readRows();
const matched = rows
  .map((r) => ({ ...r, token: matchOf(r.strategyName) }))
  .filter((r) => r.token)
  // Largest first whichever source the rows came from — the CSV arrives in
  // whatever order it was written, and the biggest mandates are the ones worth
  // reading before this changes what a visitor sees.
  .sort((a, b) => (b.aumCr ?? -1) - (a.aumCr ?? -1));

const aum = (v) => (v == null ? "" : v >= 100000 ? `₹${(v / 100000).toFixed(2)} L Cr` : `₹${Math.round(v).toLocaleString("en-IN")} Cr`);

console.log(`Strategies           ${rows.length}`);
console.log(`Institutional        ${matched.length}  (${((matched.length / rows.length) * 100).toFixed(1)}%)`);
console.log(`Tokens               ${TOKENS.length} — from lib/pms.ts`);

const byToken = new Map();
for (const m of matched) byToken.set(m.token, (byToken.get(m.token) ?? 0) + 1);
console.log("");
console.log("Matches per token (a token matching 0 is dead weight; one matching hundreds is suspect):");
for (const t of TOKENS) console.log(`  ${t.padEnd(22)} ${byToken.get(t) ?? 0}`);

if (LIST) {
  console.log("");
  console.log("Matched strategies, largest AUM first:");
  for (const m of matched) {
    console.log(`  [${(m.token ?? "").padEnd(18)}] ${aum(m.aumCr).padStart(12)}  ${m.strategyName}${m.manager ? `  — ${m.manager}` : ""}`);
  }
}

if (NEAR_MISSES) {
  const near = rows.map((r) => ({ ...r, token: nearMissOf(r.strategyName) })).filter((r) => r.token);
  console.log("");
  console.log(`Near misses (${near.length}) — contain a token but not as a whole word, so they are NOT filtered:`);
  for (const n of near) console.log(`  [${n.token}] ${n.strategyName}`);
}

console.log("");
console.log("Nothing was written. This tool only reads.");
