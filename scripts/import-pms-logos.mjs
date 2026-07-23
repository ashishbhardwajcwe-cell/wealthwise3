#!/usr/bin/env node
/**
 * PMS manager-logo seeder — one-time (safe to re-run). PMS logos are per
 * MANAGER (firm), not per strategy, and every manager is a real registered
 * AMC with a website — so we resolve each manager to a logo, upload it to
 * Sanity once, and set it on ALL of that manager's strategy documents. The
 * card then shows the firm's logo, falling back to our monogram where none
 * is set. Feed it once and the logos stay.
 *
 *   node scripts/import-pms-logos.mjs --template            # write pms-logos.csv of every manager to review/fill
 *   node scripts/import-pms-logos.mjs --dry-run             # show manager → resolved logo source, no writes
 *   node scripts/import-pms-logos.mjs                       # fetch, upload, attach (built-in domain map)
 *   node scripts/import-pms-logos.mjs pms-logos.csv         # …using your reviewed CSV (manager,source)
 *   node scripts/import-pms-logos.mjs pms-logos.csv --force # also replace logos already set
 *   npm run logos:pms -- --template
 *
 * Logo source per manager (first that applies):
 *   1. the `source` cell of the CSV you pass, when non-empty
 *   2. the built-in MANAGER_DOMAINS map below
 * A source may be a bare domain (→ https://logo.clearbit.com/<domain>), a full
 * https URL, or a local file path. Unknown managers are skipped and listed so
 * you can add them to the CSV — nothing is guessed. Always eyeball --dry-run
 * (or the CSV) before writing: a wrong logo is worse than our clean monogram.
 *
 * Env (dry-run/template excepted): NEXT_PUBLIC_SANITY_PROJECT_ID,
 * SANITY_API_TOKEN (Editor).
 */

import { readFileSync, existsSync, writeFileSync } from "node:fs";
import { resolve, extname } from "node:path";
import {
  loadDotEnvLocal, requireSanityEnv, parseCsv,
  sanityQuery, sanityMutate, sanityUploadImage,
} from "./import-shared.mjs";

/**
 * Curated manager → domain map (a starting point, NOT exhaustive). Keys are
 * normalised brand tokens matched as a whole-word run inside the manager name,
 * so legal suffixes ("… Asset Management Company Private Limited") don't need
 * to be spelled out. Only reasonably-confident domains are listed; complete
 * the long tail with `--template` → review pms-logos.csv → run. A wrong domain
 * simply 404s on the logo CDN and the card falls back to the monogram.
 */
const MANAGER_DOMAINS = {
  "aditya birla": "adityabirlacapital.com",
  "icici prudential": "icicipruamc.com",
  "axis": "axismf.com",
  "sbi": "sbimf.com",
  "kotak": "kotakmf.com",
  "nippon": "nipponindiaim.com",
  "hdfc": "hdfcfund.com",
  "dsp": "dspim.com",
  "tata": "tatamutualfund.com",
  "sundaram": "sundarammutual.com",
  "franklin": "franklintempletonindia.com",
  "mirae": "miraeassetmf.co.in",
  "edelweiss": "edelweissmf.com",
  "invesco": "invescomutualfund.com",
  "motilal oswal": "motilaloswal.com",
  "360 one": "360.one",
  "marcellus": "marcellus.in",
  "white oak": "whiteoakamc.com",
  "nuvama": "nuvama.com",
  "avendus": "avendus.com",
  "julius baer": "juliusbaer.com",
  "unifi": "unificap.com",
  "buoyant": "buoyantcap.com",
  "valuequest": "valuequestindia.com",
  "abakkus": "abakkusinvest.com",
  "alchemy": "alchemycapital.com",
  "girik": "girikcapital.com",
  "carnelian": "carneliancapital.com",
  "stallion": "stallionasset.com",
  "sameeksha": "sameekshacapital.com",
  "negen": "negencapital.com",
  "green portfolio": "greenportfolio.co",
  "sageone": "sageoneinvestments.com",
  "sage one": "sageoneinvestments.com",
  "ambit": "ambit.co",
  "ithought": "ithought.co.in",
  "helios": "helioscapital.in",
};

// ---------- args ----------
const args = { dryRun: false, force: false, template: false };
for (const a of process.argv.slice(2)) {
  if (a === "--dry-run") args.dryRun = true;
  else if (a === "--force") args.force = true;
  else if (a === "--template") args.template = true;
  else if (a === "--help" || a === "-h") { console.log("See the header of scripts/import-pms-logos.mjs for usage."); process.exit(0); }
  else if (!a.startsWith("--")) args.csv = a;
  else { console.error(`Unknown flag ${a}`); process.exit(1); }
}

/** Normalise a manager name to space-separated lowercase words (no punctuation). */
const normMgr = (m) => String(m ?? "").toLowerCase().replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim();
/** Does `key` appear as a whole-word run inside the normalised manager name? */
const keyMatches = (mgrNorm, key) => (" " + mgrNorm + " ").includes(" " + key + " ");

/** Resolve a manager to a logo source string (domain / url / path) or null. */
function resolveSource(manager, csvMap) {
  const norm = normMgr(manager);
  for (const [k, v] of Object.entries(csvMap)) if (v && keyMatches(norm, k)) return v;
  // Longest key first so "sbi" doesn't shadow a more specific brand.
  for (const k of Object.keys(MANAGER_DOMAINS).sort((a, b) => b.length - a.length)) {
    if (keyMatches(norm, k)) return MANAGER_DOMAINS[k];
  }
  return null;
}

/** A source → { kind: "url"|"file", value }. Bare domain becomes a Clearbit URL. */
function sourceToTarget(source) {
  const s = String(source).trim();
  if (/^https?:\/\//i.test(s)) return { kind: "url", value: s };
  if (existsSync(resolve(s))) return { kind: "file", value: resolve(s) };
  return { kind: "url", value: `https://logo.clearbit.com/${s.replace(/^\/+/, "")}` };
}

const CONTENT_TYPES = { ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".svg": "image/svg+xml", ".webp": "image/webp", ".gif": "image/gif" };

// ---------- env ----------
loadDotEnvLocal();
const needWrites = !args.dryRun; // template + dry-run don't write; template still needs to read managers
const hasEnv = !!(process.env.NEXT_PUBLIC_SANITY_PROJECT_ID && process.env.SANITY_API_TOKEN);
if (!hasEnv) requireSanityEnv(); // we always need to read the manager list from Sanity
const env = requireSanityEnv();

// ---------- distinct managers from Sanity ----------
const rows = await sanityQuery(
  env,
  `*[_type == "pmsStrategy" && !(_id in path("drafts.**"))]{ _id, manager, "hasLogo": defined(logo) }`,
);
const byManager = new Map(); // manager → { ids:[], hasLogo:bool }
for (const r of rows) {
  if (!r.manager) continue;
  const cur = byManager.get(r.manager) ?? { ids: [], hasLogo: false };
  cur.ids.push(r._id);
  if (r.hasLogo) cur.hasLogo = true;
  byManager.set(r.manager, cur);
}
const managers = [...byManager.keys()].sort();
console.log(`${managers.length} distinct managers across ${rows.length} strategies.\n`);

// ---------- CSV override map (manager,source) ----------
const csvMap = {}; // normalised-manager key → source
if (args.csv) {
  if (!existsSync(resolve(args.csv))) { console.error(`No such CSV: ${args.csv}`); process.exit(1); }
  const cells = parseCsv(readFileSync(resolve(args.csv), "utf8"));
  for (const row of cells.slice(1)) {
    const mgr = (row[0] ?? "").trim();
    const src = (row[1] ?? "").trim();
    if (mgr && src) csvMap[normMgr(mgr)] = src;
  }
}

// ---------- template mode ----------
if (args.template) {
  const lines = ["manager,source"];
  for (const m of managers) {
    const src = resolveSource(m, csvMap) ?? "";
    lines.push(`${/[",]/.test(m) ? `"${m.replace(/"/g, '""')}"` : m},${src}`);
  }
  const outPath = resolve("pms-logos.csv");
  writeFileSync(outPath, lines.join("\n") + "\n");
  const filled = lines.slice(1).filter((l) => l.split(",").pop().trim()).length;
  console.log(`Wrote ${outPath} — ${managers.length} managers (${filled} pre-filled from the built-in map).`);
  console.log("Fill in the blank `source` cells (a domain like acme.com, a full https URL, or a local file path),");
  console.log("then run: npm run logos:pms -- pms-logos.csv --dry-run   (review)   and without --dry-run to apply.");
  process.exit(0);
}

// ---------- resolve every manager ----------
const resolved = []; // { manager, ids, source, target }
const unresolved = [];
for (const m of managers) {
  const source = resolveSource(m, csvMap);
  if (!source) { unresolved.push(m); continue; }
  resolved.push({ manager: m, ids: byManager.get(m).ids, hasLogo: byManager.get(m).hasLogo, source, target: sourceToTarget(source) });
}

console.log(`${resolved.length} managers resolved to a logo source · ${unresolved.length} unresolved.\n`);
console.log("Resolved:");
for (const r of resolved) console.log(`  • ${r.manager}  →  ${r.target.value}${r.hasLogo ? "  (already has a logo)" : ""}`);
if (unresolved.length) {
  console.log("\nUnresolved (add them to pms-logos.csv — run with --template to scaffold it):");
  for (const m of unresolved) console.log(`  • ${m}`);
}

if (args.dryRun) { console.log("\n--dry-run: nothing fetched or written."); process.exit(0); }

// ---------- fetch + upload + attach ----------
const mutations = [];
let attached = 0, skipped = 0, failed = 0;
for (const r of resolved) {
  if (r.hasLogo && !args.force) { skipped++; continue; }
  try {
    let bytes, contentType;
    if (r.target.kind === "file") {
      bytes = readFileSync(r.target.value);
      contentType = CONTENT_TYPES[extname(r.target.value).toLowerCase()] ?? "image/png";
    } else {
      const res = await fetch(r.target.value, { headers: { Accept: "image/*" } });
      if (!res.ok) { console.log(`  ✗ ${r.manager} — logo fetch ${res.status} (${r.target.value})`); failed++; continue; }
      contentType = (res.headers.get("content-type") || "image/png").split(";")[0];
      if (!/^image\//.test(contentType)) { console.log(`  ✗ ${r.manager} — not an image (${contentType})`); failed++; continue; }
      bytes = Buffer.from(await res.arrayBuffer());
    }
    if (!bytes?.length) { console.log(`  ✗ ${r.manager} — empty logo`); failed++; continue; }

    const ext = contentType === "image/svg+xml" ? "svg" : contentType === "image/jpeg" ? "jpg" : contentType.split("/")[1] || "png";
    const asset = await sanityUploadImage(env, bytes, { filename: `${normMgr(r.manager).replace(/ /g, "-")}-logo.${ext}`, contentType });
    const logo = { _type: "image", asset: { _type: "reference", _ref: asset._id } };
    for (const id of r.ids) mutations.push({ patch: { id, set: { logo } } });
    attached++;
    console.log(`  ✓ ${r.manager}  (${r.ids.length} ${r.ids.length === 1 ? "strategy" : "strategies"})`);
  } catch (e) {
    console.log(`  ✗ ${r.manager} — ${e.message}`);
    failed++;
  }
}

console.log(`\n${attached} managers attached · ${skipped} already had a logo · ${failed} failed · ${unresolved.length} unresolved`);
if (mutations.length === 0) { console.log("Nothing to write."); process.exit(0); }
await sanityMutate(env, mutations);
console.log(`Wrote ${mutations.length} logo references to Sanity (${env.projectId}/${env.dataset}).`);
console.log("The PMS explorer shows the logos on its next revalidation (≤5 min) or deploy.");
