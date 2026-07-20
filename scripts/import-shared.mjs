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

/** createOrReplace all docs via the Sanity HTTP mutate API. */
export async function sanityUpsert(env, docs) {
  const mutations = docs.map((doc) => ({ createOrReplace: doc }));
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
