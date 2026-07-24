/**
 * Shared plumbing for the CSV → Sanity importers (import-pms.mjs /
 * import-aif.mjs): .env.local loading, CSV parsing, coercion helpers,
 * and the Sanity mutate call. No dependencies beyond Node 18+.
 */

import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

export function loadDotEnvLocal() {
  const p = resolve(process.cwd(), ".env.local");
  if (!existsSync(p)) return;
  for (const line of readFileSync(p, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (m && process.env[m[1]] === undefined) {
      process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  }
}

export function requireSanityEnv() {
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
  return { projectId, dataset, apiVersion, token };
}

/** CSV parser that handles quoted fields with commas/newlines. */
export function parseCsv(text) {
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

/** "12.5%", "₹1,234", " 8 " → number; blank/garbage → undefined. */
export const num = (v) => {
  if (v === undefined || v === null || String(v).trim() === "") return undefined;
  const n = Number(String(v).replace(/[%,₹\s]/g, ""));
  return Number.isFinite(n) ? n : undefined;
};

export const slugify = (s) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 96);

const MONTHS3 = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12 };

/**
 * Coerce a human date into ISO "YYYY-MM-DD".
 * Accepts "YYYY-MM-DD", "DD-MMM-YYYY" / "DD Mon YYYY", and "DD/MM/YYYY".
 * Returns undefined for blank, null when present-but-unparseable, else the
 * normalized string.
 */
export function normalizeIsoDate(v) {
  if (v == null) return undefined;
  const s = String(v).trim();
  if (s === "") return undefined;
  let m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  m = s.match(/^(\d{1,2})[-/ ]([A-Za-z]{3,})[-/ ](\d{4})$/);
  if (m && MONTHS3[m[2].slice(0, 3).toLowerCase()]) {
    return `${m[3]}-${String(MONTHS3[m[2].slice(0, 3).toLowerCase()]).padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  }
  m = s.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  if (m) return `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  return null;
}

/** Drop undefined entries; return undefined when nothing remains. */
export const prune = (o) => {
  const out = Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined));
  return Object.keys(out).length ? out : undefined;
};

/** Run a GROQ query via the Sanity HTTP query API. */
export async function sanityQuery(env, query) {
  const url = `https://${env.projectId}.api.sanity.io/v${env.apiVersion}/data/query/${env.dataset}?query=${encodeURIComponent(query)}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${env.token}` } });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    console.error(`Sanity query failed (HTTP ${res.status}):\n${JSON.stringify(body, null, 2)}`);
    process.exit(1);
  }
  return body.result;
}

/** Run raw mutations (create/patch/…) via the Sanity HTTP mutate API. */
export async function sanityMutate(env, mutations) {
  const url = `https://${env.projectId}.api.sanity.io/v${env.apiVersion}/data/mutate/${env.dataset}?returnIds=true`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${env.token}` },
    body: JSON.stringify({ mutations }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    console.error(`Sanity mutate failed (HTTP ${res.status}):\n${JSON.stringify(body, null, 2)}\n` +
      "Most common cause: SANITY_API_TOKEN lacks write (Editor) permission.");
    process.exit(1);
  }
}

/** createOrReplace all docs via the Sanity HTTP mutate API. */
export async function sanityUpsert(env, docs) {
  await sanityMutate(env, docs.map((doc) => ({ createOrReplace: doc })));
}

/**
 * Upload raw image bytes as a Sanity image asset and return the asset document
 * ({ _id, url, ... }). Callers reference it as
 *   { _type: "image", asset: { _type: "reference", _ref: doc._id } }.
 * Sanity dedupes by content hash, so re-uploading the same bytes is cheap and
 * returns the existing asset.
 */
export async function sanityUploadImage(env, bytes, { filename = "logo.png", contentType = "image/png" } = {}) {
  const url = `https://${env.projectId}.api.sanity.io/v${env.apiVersion}/assets/images/${env.dataset}?filename=${encodeURIComponent(filename)}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": contentType, Authorization: `Bearer ${env.token}` },
    body: bytes,
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    console.error(`Sanity asset upload failed (HTTP ${res.status}):\n${JSON.stringify(body, null, 2)}\n` +
      "Most common cause: SANITY_API_TOKEN lacks write (Editor) permission.");
    process.exit(1);
  }
  return body.document;
}

/** Read the CSV given on argv, validate it has a header + data rows. */
export function readCsvArg(templateName) {
  const csvPath = process.argv[2];
  if (!csvPath) {
    console.error(`Usage: node ${process.argv[1].split("/").pop()} <path-to-csv>\nTemplate: scripts/${templateName}`);
    process.exit(1);
  }
  const rows = parseCsv(readFileSync(resolve(csvPath), "utf8"));
  if (rows.length < 2) {
    console.error(`CSV has no data rows. Fill in scripts/${templateName} and pass it as the argument.`);
    process.exit(1);
  }
  return rows;
}
