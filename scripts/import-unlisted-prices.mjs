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
 * ── WHY THERE ARE PRE-WRITE GUARDS ─────────────────────────────────────────
 * The 31-Jul-2026 run read this PDF's text layer instead of OCRing it and
 * parsed every row with the price welded onto the company name — "(Manipal
 * Cards) 385" — because parsePriceListLine takes the LAST number before the
 * depository column as the retail price, and that export had a second numeric
 * column there. Nothing errored; 179 junk documents landed in a publicly
 * readable dataset with the wrong column stored as the price. So, before any
 * mutation is sent:
 *   1. a PDF text-layer parse with price-fused names is DISCARDED and the pages
 *      are re-read with OCR (which cuts the name at the price column's x
 *      position and cannot fuse them). If OCR can't run, the import aborts —
 *      it never falls back to the parse it just proved wrong;
 *   2. every parsed name is checked for fused price digits, on all paths;
 *   3. the row count must sit in a sane band around the previous import, and
 *      the run must not create a flood of new companies.
 * --allow-drift relaxes (3) for a genuinely reshaped list. Nothing relaxes (2).
 * ───────────────────────────────────────────────────────────────────────────
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
  resolveUnlistedTarget, priceFusedName, validateImportRows,
  PRICE_MIN_EXCL, PRICE_MAX_EXCL,
} from "./unlisted-matching.mjs";

// ---------- args ----------
const args = { partner: "uz", dryRun: false, seedEditorial: false, publish: false, allowDrift: false };
for (const a of process.argv.slice(2)) {
  if (a === "--dry-run") args.dryRun = true;
  else if (a === "--seed-editorial") args.seedEditorial = true;
  else if (a === "--publish") args.publish = true;
  else if (a === "--allow-drift") args.allowDrift = true;
  else if (a.startsWith("--partner=")) args.partner = a.slice(10).trim();
  else if (a.startsWith("--date=")) args.date = a.slice(7).trim();
  else if (a === "--help" || a === "-h") { console.log("See the header of scripts/import-unlisted-prices.mjs for usage."); process.exit(0); }
  else if (!a.startsWith("--")) args.file = a;
  else { console.error(`Unknown flag ${a}`); process.exit(1); }
}

/** Split OCR-fused words ("AplMetals" → "Apl Metals") so auto-created company
 *  names read cleanly. Conservative: only inserts a space at a lowercase →
 *  uppercase boundary, which never occurs inside a properly-spaced name. */
function cleanCompanyName(raw) {
  return String(raw).replace(/([a-z])([A-Z])/g, "$1 $2").replace(/\s{2,}/g, " ").trim();
}

if (!args.seedEditorial && !args.file) {
  console.error("Usage: node scripts/import-unlisted-prices.mjs <file.pdf|file.csv> [--publish] [--partner=uz] [--date=YYYY-MM-DD] [--dry-run]\n" +
    "       node scripts/import-unlisted-prices.mjs --seed-editorial [--dry-run]\n\n" +
    "  --publish      make every imported company live immediately (skip the manual review gate).\n" +
    "  --allow-drift  accept a row count / new-company count far off the previous import.\n" +
    "                 For a genuinely reshaped list or a first import — never to push a bad parse through.");
  process.exit(1);
}

// ---------- env (dry-run may preview without it) ----------
loadDotEnvLocal();
const hasEnv = !!(process.env.NEXT_PUBLIC_SANITY_PROJECT_ID && process.env.SANITY_API_TOKEN);
if (!hasEnv && !args.dryRun) requireSanityEnv(); // prints the standard error and exits
const env = hasEnv ? requireSanityEnv() : null;

const existing = env
  ? await sanityQuery(env, `*[_type == "unlistedShare" && !(_id in path("drafts.**"))]{ _id, company, "slug": slug.current, aliases, indicativePriceINR, asOfDate }`)
  : [];
if (!env) console.log("(no Sanity env — dry-run against an empty dataset: parse/validation preview only)\n");

/**
 * The previous import's size: how many documents carry a price at the most
 * recent asOfDate in the dataset. This is the baseline the new list's row
 * count has to sit near — a daily price list does not halve or double.
 */
function previousImport(docs) {
  const byDate = new Map();
  for (const d of docs) {
    if (typeof d.indicativePriceINR !== "number" || !d.asOfDate) continue;
    byDate.set(d.asOfDate, (byDate.get(d.asOfDate) ?? 0) + 1);
  }
  let date = null;
  for (const k of byDate.keys()) if (!date || k > date) date = k;
  return { date, count: date ? byDate.get(date) : 0 };
}

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

  // ── the text layer is only trusted when its names come out clean ──
  //
  // parsePriceListLine takes "the last number before the depository column" as
  // the retail price. That holds for the documented column order (name ·
  // retail · depository · dealer · lot) and breaks the moment the extracted
  // text carries a second numeric column before the depository: the parser
  // then reads the WRONG column as the price and welds the real one onto the
  // end of the company name. That is exactly what the 31-Jul-2026 run did —
  // "(Manipal Cards) 385", "(NCDEX) Limited Unlisted Shares 388" — and nothing
  // errored, because every row still looked like a valid row.
  //
  // A fused name is therefore treated as proof that the text layer was read in
  // the wrong order. The parse is thrown away (never partially trusted) and the
  // page images are re-read with OCR, which cuts the name at the price column's
  // x-position and cannot fuse the two.
  const fused = rows.filter((r) => priceFusedName(r.name));
  const textLayerUntrusted = fused.length > 0;
  if (textLayerUntrusted) {
    console.log(
      `The PDF's text layer parsed ${rows.length} rows, but ${fused.length} of them have price digits ` +
      `welded onto the company name (e.g. "${fused[0].name}").\n` +
      "That means the columns came out in an order the row grammar can't read, so the price it picked is\n" +
      "the wrong column. Discarding the text-layer parse and re-reading the pages with OCR…",
    );
    rows = [];
    skipped.length = 0;
  }

  // The partner's designed export draws all text as vector outlines (zero
  // fonts), so text extraction can also come back empty. Either way we render
  // each page and OCR it — the dealer column is excluded by x-position inside
  // classifyOcrLine, so it is never read.
  if (rows.length === 0) {
    if (!textLayerUntrusted) console.log("No text layer found in the PDF — switching to OCR (about 5s per page)…");
    let ocr;
    try {
      const { ocrPriceListPdf } = await import("./unlisted-ocr.mjs");
      ocr = await ocrPriceListPdf(filePath, { log: (m) => console.log(m) });
    } catch (err) {
      // There is deliberately NO fallback to the text-layer rows here. When OCR
      // can't run, the only other reading of this PDF is the one we just proved
      // untrustworthy, and the dataset it would write to is publicly readable.
      console.error(
        `\nABORTED — this PDF cannot be read safely. Nothing was written to Sanity.\n\n` +
        `  OCR is unavailable: ${err.message}\n\n` +
        (textLayerUntrusted
          ? "  The PDF's text layer WAS readable, but it produced price-fused company names, so it is not a\n" +
            "  usable fallback — importing it would publish the wrong column and duplicate every company.\n\n"
          : "  The PDF has no usable text layer, so OCR was the only way to read it.\n\n") +
        "  Fix: run `npm ci` to install the OCR dependencies (pdf-parse, tesseract.js,\n" +
        "  @tesseract.js-data/eng, @napi-rs/canvas), or ask the partner for the list as CSV and import that.",
      );
      process.exit(1);
    }
    rows = ocr.rows;
    skipped.length = 0;
    skipped.push(...ocr.skipped);
    if (!headerDateRaw) headerDateRaw = ocr.headerDateRaw;
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

// ---------- pre-write gate ----------
// The Sanity dataset is publicly readable, so a bad parse must be stopped here
// rather than cleaned up afterwards. Applies to every path — PDF text, OCR and
// CSV alike — because a mis-mapped CSV can fuse the same two columns.
const prev = previousImport(existing);
const check = validateImportRows(rows, {
  previousRowCount: args.allowDrift ? 0 : prev.count,
  previousAsOfDate: prev.date,
});
for (const w of check.warnings) console.log(`Warning: ${w}\n`);
if (check.errors.length) {
  console.error(`\nABORTED — ${args.file} failed the pre-write checks. Nothing was written to Sanity.\n`);
  for (const e of check.errors) {
    console.error(`  [${e.code}] ${e.message}`);
    for (const d of e.detail) console.error(`      ${d}`);
    if (e.more) console.error(`      …and ${e.more} more`);
    console.error("");
  }
  console.error(
    "  Re-run with --dry-run while you investigate. If the list genuinely changed size, --allow-drift\n" +
    "  relaxes the row-count band — it does NOT relax the name checks, which are never legitimate.",
  );
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
  // --publish makes rows live immediately: created docs skip the review gate,
  // and matched docs that were parked for review on an earlier run get
  // released too (the public query hides needsReview == true).
  const publishSet = args.publish ? { needsReview: false } : {};

  if (target.doc) {
    if (claimed.has(target.doc._id)) {
      skipped.push({ line: row.name, reason: `resolves to the same company as "${claimed.get(target.doc._id)}" — kept the first row` });
      continue;
    }
    claimed.set(target.doc._id, row.name);
    // Partner data may update prices — never an existing doc's company/slug.
    mutations.push({ patch: { id: target.doc._id, set: { ...priceFields, ...publishSet } } });
    const knownNames = [target.doc.company, ...(target.doc.aliases ?? [])].map(normalizeCompanyName);
    if (!knownNames.includes(normalizeCompanyName(row.name))) {
      mutations.push({ patch: { id: target.doc._id, setIfMissing: { aliases: [] } } });
      mutations.push({ patch: { id: target.doc._id, insert: { after: "aliases[-1]", items: [row.name] } } });
    }
    updated.push({ name: row.name, company: target.doc.company, price: row.price });
  } else {
    const company = cleanCompanyName(target.clean ?? splitEllipsis(row.name).clean);
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
        // Auto-created: hidden until reviewed, unless --publish makes it live now.
        needsReview: !args.publish,
        ...priceFields,
      },
    });
    created.push({ name: company, price: row.price });
  }
}

// ---------- summary ----------
console.log(`Price list: ${args.file} · as of ${asOfDate} · partner "${args.partner}"${args.publish ? " · PUBLISH (live immediately)" : ""}`);
const createdLabel = args.publish ? "created (live)" : "created (needs review)";
console.log(`\n${updated.length} updated · ${created.length} ${createdLabel} · ${skipped.length} skipped`);
if (updated.length) {
  console.log("\nUpdated:");
  for (const u of updated) console.log(`  • ${u.company}  ₹${u.price.toLocaleString("en-IN")}${u.name !== u.company ? `  (list name: "${u.name}")` : ""}`);
}
if (created.length) {
  console.log(args.publish
    ? "\nCreated (live on the site after the next revalidation):"
    : "\nCreated (review in Studio → Unlisted Shares (needs review) before they go live):");
  for (const c of created) console.log(`  • ${c.name}  ₹${c.price.toLocaleString("en-IN")}`);
}
if (skipped.length) {
  console.log("\nSkipped:");
  for (const s of skipped) console.log(`  • ${s.line} — ${s.reason}`);
}

// A daily price list refreshes companies it has priced before; it does not
// invent a hundred new ones. When almost nothing matched, the names are wrong —
// that is how one bad parse took this dataset from 188 documents to 367.
const createCap = Math.max(10, Math.round(existing.length * 0.2));
if (!args.allowDrift && existing.length > 0 && created.length > createCap) {
  console.error(
    `\nABORTED — this run would create ${created.length} new companies against an existing ${existing.length}\n` +
    `(the ceiling is ${createCap}). Nothing was written to Sanity.\n\n` +
    "  That many unmatched names means the list's company names were parsed differently from the ones\n" +
    "  already stored — importing would fork a duplicate copy of the dataset rather than update it.\n" +
    "  Check the \"Created\" list above: if those names are right and the partner really did add this many\n" +
    "  companies, re-run with --allow-drift.",
  );
  process.exit(1);
}

if (args.dryRun) { console.log("\n--dry-run: nothing written."); process.exit(0); }

await sanityMutate(env, mutations);
console.log(`\nWrote ${mutations.length} mutations to Sanity (${env.projectId}/${env.dataset}).`);
console.log("The unlisted-shares page picks the prices up on its next revalidation (≤5 min) or deploy.");
