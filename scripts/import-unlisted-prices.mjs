#!/usr/bin/env node
/**
 * Unlisted-shares price importer — Mode 2 of the unlisted section.
 *
 * Reads the distribution partner's daily "Unlisted Shares Price List" (PDF or
 * CSV) and upserts indicative prices into the `unlistedShare` documents in
 * Sanity, matching by slug → aliases → normalised company name.
 *
 *   node scripts/import-unlisted-prices.mjs <file.pdf|file.csv> \
 *        [--partner=uz] [--date=YYYY-MM-DD] [--dry-run]
 *   node scripts/import-unlisted-prices.mjs --seed-editorial [--dry-run]
 *
 *   npm run import:unlisted -- pricelist.pdf --dry-run
 *
 * ── CONFIDENTIALITY ────────────────────────────────────────────────────────
 * The partner's list carries a DEALER (cost) price next to the retail price.
 * The Sanity dataset is publicly readable, so that column must never be
 * stored, logged, or printed. The parsers in unlisted-matching.mjs extract
 * ONLY name / retail price / depository / lot size — the dealer column is
 * structurally discarded and there is nowhere in the doc shape to put it.
 * Keep it that way when editing this pipeline.
 * ───────────────────────────────────────────────────────────────────────────
 *
 * Behaviour:
 *  - Matched docs get indicativePriceINR, lotSize, depository, asOfDate and
 *    partner patched; the raw list name is appended to `aliases` when new.
 *    company/slug of an existing doc are NEVER touched by partner data.
 *  - Unmatched rows create a new doc (company = raw name minus any trailing
 *    "…", generated slug, needsReview: true) — they stay off the site until
 *    an editor reviews them (the public query filters needsReview).
 *  - Truncated names ("Motilal Oswal Home Fin…") match by unique prefix;
 *    an ambiguous prefix is skipped and reported, never guessed.
 *  - Dates are zero-padded ISO (YYYY-MM-DD) everywhere. The PDF header's
 *    "DATE 22 Jul 2026" is parsed; --date overrides it.
 *  - --dry-run prints the full summary without writing. Without Sanity env
 *    vars it previews against an empty dataset (parse-only check).
 *
 * --seed-editorial (one-time): copies the curated Mode-1 content from
 * lib/unlisted-companies.ts onto matching docs (about → summary, sector →
 * sector, drhpFiled → ipoStatus "drhp-filed"/"none"), creating docs where
 * absent with needsReview: false (they're hand-curated). The lib file is
 * left in place as the site's fallback.
 *
 * Env (same conventions as import-pms.mjs): NEXT_PUBLIC_SANITY_PROJECT_ID,
 * SANITY_API_TOKEN (Editor) — from the environment or .env.local.
 */

import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import {
  loadDotEnvLocal, requireSanityEnv, parseCsv, slugify,
  sanityQuery, sanityMutate, normalizeIsoDate,
} from "./import-shared.mjs";
import {
  parsePriceListText, findHeaderDate, mapCsvHeader, parseInr,
  canonicalDepository, normalizeCompanyName, splitEllipsis,
  resolveUnlistedTarget, PRICE_MIN_EXCL, PRICE_MAX_EXCL,
} from "./unlisted-matching.mjs";

// ---------- args ----------
const args = { partner: "uz", dryRun: false, seedEditorial: false };
for (const a of process.argv.slice(2)) {
  if (a === "--dry-run") args.dryRun = true;
  else if (a === "--seed-editorial") args.seedEditorial = true;
  else if (a.startsWith("--partner=")) args.partner = a.slice(10).trim();
  else if (a.startsWith("--date=")) args.date = a.slice(7).trim();
  else if (a === "--help" || a === "-h") { console.log("See the header of scripts/import-unlisted-prices.mjs for usage."); process.exit(0); }
  else if (!a.startsWith("--")) args.file = a;
  else { console.error(`Unknown flag ${a}`); process.exit(1); }
}

if (!args.seedEditorial && !args.file) {
  console.error("Usage: node scripts/import-unlisted-prices.mjs <file.pdf|file.csv> [--partner=uz] [--date=YYYY-MM-DD] [--dry-run]\n" +
    "       node scripts/import-unlisted-prices.mjs --seed-editorial [--dry-run]");
  process.exit(1);
}

// ---------- env (dry-run may preview without it) ----------
loadDotEnvLocal();
const hasEnv = !!(process.env.NEXT_PUBLIC_SANITY_PROJECT_ID && process.env.SANITY_API_TOKEN);
if (!hasEnv && !args.dryRun) requireSanityEnv(); // prints the standard error and exits
const env = hasEnv ? requireSanityEnv() : null;

const existing = env
  ? await sanityQuery(env, `*[_type == "unlistedShare" && !(_id in path("drafts.**"))]{ _id, company, "slug": slug.current, aliases }`)
  : [];
if (!env) console.log("(no Sanity env — dry-run against an empty dataset: parse/validation preview only)\n");

// ═══════════════ seed-editorial mode ═══════════════
if (args.seedEditorial) {
  const src = readFileSync(resolve("lib/unlisted-companies.ts"), "utf8");
  const m = src.match(/export const unlistedCompanies[^=]*=\s*(\[[\s\S]*?\n\]);/);
  if (!m) { console.error("Couldn't locate the unlistedCompanies array in lib/unlisted-companies.ts"); process.exit(1); }
  // The array literal is plain data (strings/booleans) from our own repo.
  const companies = new Function(`return ${m[1]}`)();

  const mutations = [];
  let created = 0, updated = 0;
  for (const c of companies) {
    const target = resolveUnlistedTarget(c.name, existing, slugify);
    const editorial = {
      sector: c.sector,
      summary: c.about,
      ipoStatus: c.drhpFiled ? "drhp-filed" : "none",
    };
    if (target.doc) {
      updated++;
      mutations.push({ patch: { id: target.doc._id, set: editorial } });
    } else {
      created++;
      mutations.push({
        create: {
          _id: `unlistedShare-${c.slug}`,
          _type: "unlistedShare",
          company: c.name,
          slug: { _type: "slug", current: c.slug },
          aliases: [c.name],
          isActive: true,
          needsReview: false, // hand-curated
          ...editorial,
        },
      });
    }
  }

  console.log(`Editorial seed from lib/unlisted-companies.ts: ${updated} updated · ${created} created (curated, no review needed)`);
  for (const c of companies) console.log(`  • ${c.name}`);
  if (args.dryRun) { console.log("\n--dry-run: nothing written."); process.exit(0); }
  await sanityMutate(env, mutations);
  console.log("\nSeeded into Sanity. Run the price import next.");
  process.exit(0);
}

// ═══════════════ price-list mode ═══════════════

// ---------- read + parse the file ----------
const filePath = resolve(args.file);
if (!existsSync(filePath)) { console.error(`No such file: ${args.file}`); process.exit(1); }
const isPdf = /\.pdf$/i.test(filePath);

/** Rows: { name, price, depository?, lotSize? }. Dealer prices never leave the parser. */
let rows = [];
const skipped = []; // { line, reason }
let headerDateRaw = null;

if (isPdf) {
  let PDFParse;
  try {
    ({ PDFParse } = await import("pdf-parse"));
  } catch {
    console.error("pdf-parse is not installed. Run: npm install\n(It's in devDependencies — needed for PDF price lists.)");
    process.exit(1);
  }
  // pdf-parse v2 defaults do exactly what the row grammar needs: text items
  // on one visual line join with "\t" between columns (cellSeparator), and
  // different lines get "\n" (lineEnforce) — so columns can never fuse into
  // "Tata Capital₹950NSDL…".
  const parser = new PDFParse({ data: readFileSync(filePath) });
  try {
    const parsed = await parser.getText();
    headerDateRaw = findHeaderDate(parsed.text);
    const res = parsePriceListText(parsed.text);
    rows = res.rows;
    skipped.push(...res.skipped);
  } finally {
    await parser.destroy();
  }
} else {
  const csvRows = parseCsv(readFileSync(filePath, "utf8"));
  if (csvRows.length < 2) { console.error("CSV has no data rows."); process.exit(1); }
  const map = mapCsvHeader(csvRows[0]);
  if (map.error) { console.error(`CSV header problem: ${map.error}`); process.exit(1); }
  csvRows.slice(1).forEach((r, i) => {
    const name = (r[map.name] ?? "").trim();
    const price = parseInr(r[map.price]);
    const lotRaw = map.lot !== undefined ? (r[map.lot] ?? "").trim() : "";
    const lot = lotRaw ? parseInr(lotRaw) : undefined;
    const line = `row ${i + 2}: ${name || "(blank)"}`;
    if (!name) return skipped.push({ line, reason: "blank company name" });
    if (price === null) return skipped.push({ line, reason: `unreadable retail price "${r[map.price] ?? ""}"` });
    if (!(price > PRICE_MIN_EXCL && price < PRICE_MAX_EXCL)) return skipped.push({ line, reason: `retail price ${price} outside (0, 50L)` });
    if (lot !== undefined && (lot === null || !Number.isInteger(lot) || lot < 1)) {
      return skipped.push({ line, reason: `lot size "${lotRaw}" isn't a whole number ≥ 1` });
    }
    rows.push({
      name,
      price,
      ...(map.depository !== undefined && canonicalDepository(r[map.depository]) ? { depository: canonicalDepository(r[map.depository]) } : {}),
      ...(lot !== undefined ? { lotSize: lot } : {}),
    });
  });
}

// ---------- as-of date (always zero-padded ISO) ----------
let asOfDate = null;
if (args.date) {
  asOfDate = normalizeIsoDate(args.date);
  if (!asOfDate) { console.error(`--date "${args.date}" isn't a recognisable date`); process.exit(1); }
} else if (headerDateRaw) {
  asOfDate = normalizeIsoDate(headerDateRaw);
}
if (!asOfDate) {
  if (isPdf && !args.date) console.log("Note: no DATE header found in the PDF — using today. Pass --date to override.");
  asOfDate = new Date().toISOString().slice(0, 10);
}

if (rows.length === 0) {
  console.error(`Parsed 0 price rows from ${args.file}.`);
  for (const s of skipped.slice(0, 10)) console.error(`  • ${s.line} — ${s.reason}`);
  process.exit(1);
}

// ---------- match + build mutations ----------
const mutations = [];
const updated = [];   // { name, company, price }
const created = [];   // { name, price }
const claimed = new Map(); // doc._id or new _id → first row name, to catch dupes in one list

for (const row of rows) {
  const target = resolveUnlistedTarget(row.name, existing, slugify);
  if (target.error) { skipped.push({ line: row.name, reason: target.error }); continue; }
  if (target.ambiguous) {
    skipped.push({
      line: row.name,
      reason: `truncated name matches ${target.ambiguous.length} companies (${target.ambiguous.map((d) => d.company).slice(0, 3).join(" / ")}) — add the raw name to the right doc's aliases`,
    });
    continue;
  }

  const priceFields = {
    indicativePriceINR: row.price,
    asOfDate,
    partner: args.partner,
    ...(row.depository ? { depository: row.depository } : {}),
    ...(row.lotSize !== undefined ? { lotSize: row.lotSize } : {}),
  };

  if (target.doc) {
    if (claimed.has(target.doc._id)) {
      skipped.push({ line: row.name, reason: `resolves to the same company as "${claimed.get(target.doc._id)}" — kept the first row` });
      continue;
    }
    claimed.set(target.doc._id, row.name);
    // Partner data may update prices — never an existing doc's company/slug.
    mutations.push({ patch: { id: target.doc._id, set: priceFields } });
    const knownNames = [target.doc.company, ...(target.doc.aliases ?? [])].map(normalizeCompanyName);
    if (!knownNames.includes(normalizeCompanyName(row.name))) {
      mutations.push({ patch: { id: target.doc._id, setIfMissing: { aliases: [] } } });
      mutations.push({ patch: { id: target.doc._id, insert: { after: "aliases[-1]", items: [row.name] } } });
    }
    updated.push({ name: row.name, company: target.doc.company, price: row.price });
  } else {
    const company = target.clean ?? splitEllipsis(row.name).clean;
    const _id = `unlistedShare-${slugify(company)}`;
    if (claimed.has(_id)) {
      skipped.push({ line: row.name, reason: `duplicate of "${claimed.get(_id)}" within this list — kept the first row` });
      continue;
    }
    claimed.set(_id, row.name);
    mutations.push({
      create: {
        _id,
        _type: "unlistedShare",
        company,
        slug: { _type: "slug", current: slugify(company) },
        aliases: [row.name],
        isActive: true,
        needsReview: true, // auto-created — stays off the site until reviewed
        ...priceFields,
      },
    });
    created.push({ name: company, price: row.price });
  }
}

// ---------- summary ----------
console.log(`Price list: ${args.file} · as of ${asOfDate} · partner "${args.partner}"`);
console.log(`\n${updated.length} updated · ${created.length} created (needs review) · ${skipped.length} skipped`);
if (updated.length) {
  console.log("\nUpdated:");
  for (const u of updated) console.log(`  • ${u.company}  ₹${u.price.toLocaleString("en-IN")}${u.name !== u.company ? `  (list name: "${u.name}")` : ""}`);
}
if (created.length) {
  console.log("\nCreated (review in Studio → Unlisted Shares (needs review) before they go live):");
  for (const c of created) console.log(`  • ${c.name}  ₹${c.price.toLocaleString("en-IN")}`);
}
if (skipped.length) {
  console.log("\nSkipped:");
  for (const s of skipped) console.log(`  • ${s.line} — ${s.reason}`);
}

if (args.dryRun) { console.log("\n--dry-run: nothing written."); process.exit(0); }

await sanityMutate(env, mutations);
console.log(`\nWrote ${mutations.length} mutations to Sanity (${env.projectId}/${env.dataset}).`);
console.log("The unlisted-shares page picks the prices up on its next revalidation (≤5 min) or deploy.");
