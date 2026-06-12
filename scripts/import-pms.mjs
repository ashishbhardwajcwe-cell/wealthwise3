#!/usr/bin/env node
/**
 * PMS data importer — populates the `pmsStrategy` documents in Sanity from a
 * CSV of monthly PMS performance data.
 *
 * Data source (official, free, SEBI-mandated): APMI — Association of
 * Portfolio Managers in India (https://www.apmiindia.org). Every SEBI-
 * registered portfolio manager must publish standardized monthly performance
 * there. Download / copy the figures for the strategies you want to feature
 * into a CSV (template: scripts/pms-template.csv), then run:
 *
 *   node scripts/import-pms.mjs scripts/pms-data.csv
 *
 * Required env vars (read from the environment or a .env.local file):
 *   NEXT_PUBLIC_SANITY_PROJECT_ID   e.g. fhpazm9i
 *   NEXT_PUBLIC_SANITY_DATASET      e.g. production
 *   SANITY_API_TOKEN                token with Editor (write) access
 *
 * CSV columns (header row required, order doesn't matter):
 *   strategyName*  manager*  category  aumCr  minInvestmentL
 *   returns1y  returns3y  returns5y  sinceInception
 *   feesFixed  feesPerformance  feesHurdle
 *   asOfDate*  (YYYY-MM-DD)   source*   notes
 *   (* = required — every published figure must carry its as-of date and
 *    source, per the SEBI-compliance rules in this project.)
 *
 * The Sanity document _id is derived from manager + strategy name, so
 * re-running the import next month UPDATES the same records instead of
 * duplicating them. Documents created manually in the Studio are untouched.
 */

import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

// ---------- env (.env.local fallback for local runs) ----------
function loadDotEnvLocal() {
  const p = resolve(process.cwd(), ".env.local");
  if (!existsSync(p)) return;
  for (const line of readFileSync(p, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (m && process.env[m[1]] === undefined) {
      process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  }
}
loadDotEnvLocal();

const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID;
const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET || "production";
const apiVersion = process.env.NEXT_PUBLIC_SANITY_API_VERSION || "2024-09-01";
const token = process.env.SANITY_API_TOKEN;

if (!projectId || !token) {
  console.error(
    "Missing env vars. Need NEXT_PUBLIC_SANITY_PROJECT_ID and SANITY_API_TOKEN\n" +
    "(set them in the environment or in .env.local). The token must have write access.",
  );
  process.exit(1);
}

// ---------- CSV parsing (handles quoted fields with commas) ----------
function parseCsv(text) {
  const rows = [];
  let row = [], field = "", inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') inQuotes = false;
      else field += c;
    } else if (c === '"') inQuotes = true;
    else if (c === ",") { row.push(field); field = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field); field = "";
      if (row.some((f) => f.trim() !== "")) rows.push(row);
      row = [];
    } else field += c;
  }
  row.push(field);
  if (row.some((f) => f.trim() !== "")) rows.push(row);
  return rows;
}

const num = (v) => {
  if (v === undefined || v === null || String(v).trim() === "") return undefined;
  const n = Number(String(v).replace(/[%,₹\s]/g, ""));
  return Number.isFinite(n) ? n : undefined;
};

const slugify = (s) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 96);

const VALID_CATEGORIES = ["Multicap", "Largecap", "Midcap", "Smallcap", "Thematic", "Quant", "Hybrid"];

// ---------- read + validate ----------
const csvPath = process.argv[2];
if (!csvPath) {
  console.error("Usage: node scripts/import-pms.mjs <path-to-csv>\nTemplate: scripts/pms-template.csv");
  process.exit(1);
}
const rows = parseCsv(readFileSync(resolve(csvPath), "utf8"));
if (rows.length < 2) {
  console.error("CSV has no data rows. Fill in scripts/pms-template.csv and pass it as the argument.");
  process.exit(1);
}
const header = rows[0].map((h) => h.trim());
const idx = (name) => header.indexOf(name);
for (const required of ["strategyName", "manager", "asOfDate", "source"]) {
  if (idx(required) === -1) {
    console.error(`CSV is missing the required column "${required}". Expected header:\n` +
      "strategyName,manager,category,aumCr,minInvestmentL,returns1y,returns3y,returns5y,sinceInception,feesFixed,feesPerformance,feesHurdle,asOfDate,source,notes");
    process.exit(1);
  }
}

const docs = [];
const errors = [];
rows.slice(1).forEach((r, i) => {
  const get = (name) => (idx(name) >= 0 ? (r[idx(name)] ?? "").trim() : "");
  const line = i + 2;
  const strategyName = get("strategyName");
  const manager = get("manager");
  const asOfDate = get("asOfDate");
  const source = get("source");

  if (!strategyName || !manager) return errors.push(`line ${line}: strategyName and manager are required`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(asOfDate)) return errors.push(`line ${line}: asOfDate must be YYYY-MM-DD (got "${asOfDate}")`);
  if (!source) return errors.push(`line ${line}: source is required (e.g. "APMI monthly report, May 2026")`);
  const category = get("category");
  if (category && !VALID_CATEGORIES.includes(category)) {
    return errors.push(`line ${line}: category "${category}" must be one of ${VALID_CATEGORIES.join(", ")} (or empty)`);
  }

  const returns = {
    y1: num(get("returns1y")),
    y3: num(get("returns3y")),
    y5: num(get("returns5y")),
    sinceInception: num(get("sinceInception")),
  };
  const fees = {
    fixed: num(get("feesFixed")),
    performance: num(get("feesPerformance")),
    hurdle: num(get("feesHurdle")),
  };
  const prune = (o) => {
    const out = Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined));
    return Object.keys(out).length ? out : undefined;
  };

  docs.push({
    _id: `pmsStrategy-${slugify(`${manager}-${strategyName}`)}`,
    _type: "pmsStrategy",
    strategyName,
    manager,
    ...(category ? { category } : {}),
    ...(num(get("aumCr")) !== undefined ? { aumCr: num(get("aumCr")) } : {}),
    ...(num(get("minInvestmentL")) !== undefined ? { minInvestmentL: num(get("minInvestmentL")) } : {}),
    ...(prune(returns) ? { returns: prune(returns) } : {}),
    ...(prune(fees) ? { fees: prune(fees) } : {}),
    asOfDate,
    source,
    ...(get("notes") ? { notes: get("notes") } : {}),
  });
});

if (errors.length) {
  console.error(`Validation failed — nothing imported:\n  ${errors.join("\n  ")}`);
  process.exit(1);
}
if (!docs.length) {
  console.error("No valid data rows found — nothing to import.");
  process.exit(1);
}

// ---------- upsert via Sanity HTTP mutate API (no extra dependencies) ----------
const mutations = docs.map((doc) => ({ createOrReplace: doc }));
const url = `https://${projectId}.api.sanity.io/v${apiVersion}/data/mutate/${dataset}?returnIds=true`;

const res = await fetch(url, {
  method: "POST",
  headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
  body: JSON.stringify({ mutations }),
});
const body = await res.json().catch(() => ({}));
if (!res.ok) {
  console.error(`Sanity mutate failed (HTTP ${res.status}):\n${JSON.stringify(body, null, 2)}\n` +
    "Most common cause: SANITY_API_TOKEN lacks write (Editor) permission.");
  process.exit(1);
}

console.log(`Imported ${docs.length} PMS strategies into Sanity (${projectId}/${dataset}):`);
for (const d of docs) console.log(`  • ${d.manager} — ${d.strategyName} (as of ${d.asOfDate})`);
console.log("\nThe /investment-products/pms page will show them after the next revalidation/deploy.");
