#!/usr/bin/env node
/**
 * Unlisted-shares price importer — Mode 2 of the unlisted section.
 *
 * Reads the distribution partner's daily "Unlisted Shares Price List" (Excel,
 * PDF or CSV) and upserts indicative prices into the `unlistedShare` documents
 * in Sanity, matching by slug → aliases → normalised company name.
 *
 *   node scripts/import-unlisted-prices.mjs <file.xlsx|file.pdf|file.csv> \
 *        [--partner=uz] [--date=YYYY-MM-DD] [--dry-run]
 *   node scripts/import-unlisted-prices.mjs --seed-editorial [--dry-run]
 *
 *   npm run import:unlisted -- pricelist.xlsx --dry-run
 *
 * The partner moved from PDF to .xlsx on 06-Aug-2026. That path (scripts/
 * unlisted-xlsx.mjs) needs no OCR: every column is its own cell with its own
 * header. .pdf still OCRs; anything else is read as CSV.
 *
 * ── CONFIDENTIALITY ────────────────────────────────────────────────────────
 * The partner's list carries a DEALER (cost) price next to the retail price
 * (column E of the workbook). The Sanity dataset is publicly readable, so that
 * column must never be stored, logged, or printed. The parsers in
 * unlisted-matching.mjs extract ONLY name / retail price / depository / lot
 * size — the dealer column is structurally discarded and there is nowhere in
 * the doc shape to put it. On the Excel path a second, explicit lock
 * (assertRetailPriceColumn) requires the selected price column's header to say
 * "retail", so a renamed or reordered sheet aborts the read instead of
 * silently promoting the column next door. Keep both when editing this
 * pipeline.
 * ───────────────────────────────────────────────────────────────────────────
 *
 * Behaviour:
 *  - Matched docs get indicativePriceINR, lotSize, depository, asOfDate and
 *    partner patched; the raw list name is appended to `aliases` when new.
 *    An existing doc's `slug` is NEVER touched — a URL is a promise to
 *    everyone who has linked to it. Its `company` is only touched with
 *    --adopt-names; see below.
 *  - --adopt-names (opt-in) lets the partner's name replace OURS. The rule
 *    that partner data never edits a company name was written when partner
 *    data came from OCR and was the untrusted side. Since the 06-Aug-2026
 *    switch to Excel that is inverted: their names are complete and correct,
 *    and ~34 of ours are OCR wreckage ("Hindustan Power Exchange Limit",
 *    "EB Graand Prix Luxury Elevators Limi", "Bvglndia Limited"). So when a
 *    document is matched by a pass that implies our name is the damaged one,
 *    AND the stored name carries a corruption signature, the list's name is
 *    adopted. Hand-curated fields survive, the old name becomes an alias, and
 *    every rename is printed as "old -> new" whether or not the flag is set.
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
 *      the run must not create a flood of new companies;
 *   4. no existing document may be claimed by more than one row of the list.
 *      The relaxed matching passes are looser than anything this pipeline had
 *      before, and (4) is the one failure they can cause: two companies
 *      collapsing onto one document, the second price overwriting the first,
 *      and a company silently disappearing from the site. It has no flag.
 * --allow-drift relaxes (3) for a genuinely reshaped list. Nothing relaxes (2)
 * or (4).
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
import { resolve, extname } from "node:path";
import {
  loadDotEnvLocal, requireSanityEnv, parseCsv, slugify,
  sanityQuery, sanityMutate, normalizeIsoDate,
} from "./import-shared.mjs";
import {
  parsePriceListText, findHeaderDate, mapCsvHeader, parseInr,
  classifyDepository, normalizeCompanyName, splitEllipsis,
  resolveUnlistedTarget, priceFusedName, validateImportRows,
  storedNameCorruption, nearbyExistingDocs, buildMatchedDocSet,
  PRICE_MIN_EXCL, PRICE_MAX_EXCL,
} from "./unlisted-matching.mjs";
import { readUnlistedXlsx } from "./unlisted-xlsx.mjs";
import { loadUnlistedAliases, unresolvedAliasTargets, ALIASES_DISPLAY_PATH } from "./unlisted-aliases.mjs";

// ---------- args ----------
const args = { partner: "uz", dryRun: false, seedEditorial: false, publish: false, allowDrift: false, adoptNames: false };
for (const a of process.argv.slice(2)) {
  if (a === "--dry-run") args.dryRun = true;
  else if (a === "--seed-editorial") args.seedEditorial = true;
  else if (a === "--publish") args.publish = true;
  else if (a === "--allow-drift") args.allowDrift = true;
  else if (a === "--adopt-names") args.adoptNames = true;
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
  console.error("Usage: node scripts/import-unlisted-prices.mjs <file.xlsx|file.pdf|file.csv> [--publish] [--partner=uz] [--date=YYYY-MM-DD] [--dry-run]\n" +
    "       node scripts/import-unlisted-prices.mjs --seed-editorial [--dry-run]\n\n" +
    "  --publish      make every imported company live immediately (skip the manual review gate).\n" +
    "  --allow-drift  accept a row count / new-company count far off the previous import.\n" +
    "                 For a genuinely reshaped list or a first import — never to push a bad parse through.\n" +
    "  --adopt-names  replace a stored company name with the list's when OURS is the damaged one\n" +
    "                 (OCR-truncated, stray leading characters, l/I/1 confusion). Never moves a slug.\n" +
    "                 Dry-run first and read the \"old -> new\" list.");
  process.exit(1);
}

// ---------- env (dry-run may preview without it) ----------
loadDotEnvLocal();
const hasEnv = !!(process.env.NEXT_PUBLIC_SANITY_PROJECT_ID && process.env.SANITY_API_TOKEN);
if (!hasEnv && !args.dryRun) requireSanityEnv(); // prints the standard error and exits
const env = hasEnv ? requireSanityEnv() : null;

// needsReview / logo / summary / sector / ipoStatus are read only so that an
// AMBIGUOUS row can describe its candidates properly — which of the two is
// live, which carries a price, which carries content a human wrote. Choosing
// between two real documents is not a decision this script may make, but it
// can lay out everything the person making it needs.
const existing = env
  ? await sanityQuery(env, `*[_type == "unlistedShare" && !(_id in path("drafts.**"))]{ _id, company, "slug": slug.current, aliases, indicativePriceINR, asOfDate, needsReview, sector, ipoStatus, "hasLogo": defined(logo), "hasSummary": defined(summary) }`)
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
// Dispatch on extension: .pdf keeps the text-layer + OCR path, .xlsx/.xlsm go
// to the native reader, everything else is read as CSV (unchanged).
const ext = extname(filePath).toLowerCase();
const isPdf = ext === ".pdf";
const isXlsx = ext === ".xlsx" || ext === ".xlsm";

/** Rows: { name, price, depository?, lotSize? }. Dealer prices never leave the parser. */
let rows = [];
const skipped = []; // { line, reason }
const depositoryNotes = []; // { kind, sheet?, row?, name, raw, value? }
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
} else if (isXlsx) {
  // ── native Excel (the partner's format since 06-Aug-2026) ──
  // No OCR, no column-order guesswork: the retail price and the dealer price
  // are different cells under different headers, and only the retail one is
  // ever addressed (see scripts/unlisted-xlsx.mjs).
  let book;
  try {
    book = readUnlistedXlsx(filePath);
  } catch (err) {
    console.error(
      `\nABORTED — ${args.file} could not be read as an Excel price list. Nothing was written to Sanity.\n\n` +
      `  ${err.message}\n\n` +
      "  If the partner changed the sheet layout, check the header row and column titles before forcing\n" +
      "  anything through: the price column has to be the RETAIL one, and that is what the reader verifies.",
    );
    process.exit(1);
  }

  rows = book.rows;
  skipped.push(...book.skipped);
  depositoryNotes.push(...book.depositoryNotes);
  headerDateRaw = book.asOnRaw;

  console.log(
    `Excel workbook: ${book.sheetCount} sheets, ${book.sheetsRead.length} carrying a "Share Name" header · ` +
    `${rows.length} rows read · ${book.logos.length} row logos found (not imported here — see npm run logos:unlisted).`,
  );
  for (const s of book.sheetsRead) {
    console.log(`  • ${s.name}: header row ${s.headerRow}, ${s.rowCount} rows  [${s.part}]`);
  }
  for (const w of book.warnings) console.log(`Warning: ${w}`);

  // Multi-sheet reading either works or it does not. One sheet producing rows
  // while the others advertise a "Share Name" header means the walk broke
  // silently — and a fraction of the list is indistinguishable from a partner
  // who shrank their list, right up until the wrong prices are published.
  const producing = book.sheetsRead.filter((s) => s.rowCount > 0);
  if (book.sheetsRead.length > 1 && producing.length === 1) {
    console.error(
      `\nABORTED — only "${producing[0].name}" produced rows, but ${book.sheetsRead.length} sheets carry a ` +
      `"Share Name" header.\nMulti-sheet reading failed silently. Nothing was written to Sanity.\n\n` +
      "  This is not a drift problem and --allow-drift will not help: the other sheets are price data that\n" +
      "  was not read. Fix the reader, not the guard.",
    );
    process.exit(1);
  }

  // The workbook is a conversion of the partner's PDF and carries the PDF
  // font's ligature codepoints in company names. Every repair is printed.
  if (book.sanitised.length) {
    const byCodepoint = new Map();
    for (const s of book.sanitised) {
      const agg = byCodepoint.get(s.codepoint) ?? { to: s.to, count: 0, names: [] };
      agg.count += s.count;
      agg.names.push(s.name);
      byCodepoint.set(s.codepoint, agg);
    }
    console.log("\nLigature codepoints repaired in company names:");
    for (const [codepoint, agg] of byCodepoint) {
      console.log(`  • ${codepoint} → "${agg.to}" · ${agg.count} in ${agg.names.length} name(s): ${agg.names.join(", ")}`);
    }
    const confirm = book.sanitised.filter((s) => s.confirm);
    if (confirm.length) {
      console.log("\n  ⚠ CONFIRM THESE AGAINST THE PARTNER'S PDF — only one instance of the codepoint exists,");
      console.log("    so the letters it stands for are inferred from a single name:");
      for (const s of confirm) console.log(`      ${s.codepoint} → "${s.to}"   ${s.sheet} row ${s.row}: ${s.name}`);
    }
  }
  if (book.unmapped.length) {
    console.log(
      "\nWarning: private-use codepoints with NO mapping are still in these names. They are left in place\n" +
      "rather than deleted — add them to LIGATURE_SUBSTITUTIONS in scripts/unlisted-matching.mjs:",
    );
    for (const u of book.unmapped) console.log(`  • ${u.codepoint}   ${u.sheet} row ${u.row}: ${u.name}`);
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
    let depository;
    if (map.depository !== undefined) {
      const rawDepo = String(r[map.depository] ?? "").trim();
      const verdict = classifyDepository(rawDepo);
      depository = verdict.value;
      if (verdict.unrecognised) depositoryNotes.push({ kind: "unrecognised", row: i + 2, name, raw: rawDepo });
      else if (verdict.typo) depositoryNotes.push({ kind: "typo", row: i + 2, name, raw: rawDepo, value: verdict.value });
    }
    rows.push({
      name,
      price,
      ...(depository ? { depository } : {}),
      ...(lot !== undefined ? { lotSize: lot } : {}),
    });
  });
}

// A depository we can't read is reported, never guessed at and never quietly
// downgraded — "SDL & CDSL" used to store as "CDSL only", which is a wrong
// fact on a public page that nothing downstream could have caught.
if (depositoryNotes.length) {
  const where = (n) => (n.sheet ? `${n.sheet} row ${n.row}` : `row ${n.row}`);
  const typos = depositoryNotes.filter((n) => n.kind === "typo");
  const unknown = depositoryNotes.filter((n) => n.kind === "unrecognised");
  if (typos.length) {
    console.log(`\nDepository spellings repaired (${typos.length}):`);
    for (const n of typos) console.log(`  • ${where(n)} ${n.name}: "${n.raw}" → ${n.value}`);
  }
  if (unknown.length) {
    console.log(`\nWarning: unreadable depository cells (${unknown.length}) — stored with NO depository rather than a guess:`);
    for (const n of unknown) console.log(`  • ${where(n)} ${n.name}: "${n.raw}"`);
  }
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
  if (isXlsx && !args.date) console.log('Note: no "As on …" date found in the workbook — using today. Pass --date to override.');
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

// ---------- declared name → document mappings ----------
// Read before anything is matched, and validated against the dataset: an entry
// pointing at a slug no document has would otherwise be silent, and the row it
// was written to rescue would fall through to the heuristics and create the
// very duplicate the entry exists to prevent.
const aliasFile = loadUnlistedAliases();
if (aliasFile.errors.length) {
  console.error(`\nABORTED — ${ALIASES_DISPLAY_PATH} is not usable. Nothing was written to Sanity.\n`);
  for (const e of aliasFile.errors) console.error(`  ${e}`);
  process.exit(1);
}
const declared = aliasFile.byIncoming;
if (aliasFile.entries.length) {
  console.log(`${aliasFile.entries.length} declared name${aliasFile.entries.length > 1 ? "s" : ""} loaded from ${ALIASES_DISPLAY_PATH}.`);
}
// A target slug no document has means the file has gone stale — the document
// was renamed, merged or deleted. Reported here as a warning rather than an
// abort, because an entry for a company that is not on TODAY'S list is a
// bookkeeping problem and should not cost a day of prices. If the row IS on
// today's list the entry mattered and its failure aborts the run further down.
const staleAliases = existing.length ? unresolvedAliasTargets(aliasFile.entries, existing) : [];
if (staleAliases.length) {
  console.log(`\nWarning: ${ALIASES_DISPLAY_PATH} points at ${staleAliases.length} slug${staleAliases.length > 1 ? "s" : ""} no document has:`);
  for (const m of staleAliases) console.log(`  • "${m.name}"  ->  ${m.slug}`);
  console.log("  Check the slug in Studio's URL bar and correct the file, or remove the entry.");
}

// ---------- match + build mutations ----------
const mutations = [];
const updated = [];   // { name, company, price }
const created = [];   // { name, listName, price }
const renames = [];   // { id, from, to, why } — see --adopt-names
const ambiguousRows = []; // { name, via, candidates } — reported in full, never guessed
const brokenDeclarations = []; // { name, reason } — a declared target that no longer exists
const relaxed = new Map(); // via → [{ name, company }]
const claimedDocs = new Map(); // existing doc._id → { doc, rows: [name] }
const claimedNew = new Map();  // new _id → first row name, to catch dupes in one list

/** What each relaxed pass reads, in the operator's language. Order is the
 *  order the sections print in. */
const RELAXED_LABELS = new Map([
  ["boilerplate", 'list name carries the "Unlisted Shares" row boilerplate'],
  ["reverse-prefix", "full list name matched onto a TRUNCATED stored name"],
  ["stored-truncated", "stored name was cut mid-word by the old OCR"],
  ["leading-junk", "stored name carries stray leading characters from the logo cell"],
  ["il1-confusion", "stored name confuses l / I / 1"],
]);

/** How a relaxed pass read a name — for the ambiguity report below. */
const HOW_MATCHED = {
  boilerplate: 'with the list\'s "Unlisted Shares" boilerplate stripped',
  "reverse-prefix": "as the full form of a truncated stored name",
  "stored-truncated": "as the whole of a stored name cut off mid-word",
  "leading-junk": "as a stored name minus its stray leading characters",
  "il1-confusion": "with l / I / 1 read as the same letter",
};

/**
 * The incoming list name as a COMPANY name. The list's row boilerplate is not
 * part of anybody's name, so it never goes into `company` — which matters now
 * that --adopt-names can write this onto an existing document.
 */
function adoptableCompanyName(raw) {
  return cleanCompanyName(
    String(raw)
      .replace(/\s*\bunlisted\s+shares?\b\s*/gi, " ")
      .replace(/\s*\bprice\s*$/i, "")
      .replace(/\s{2,}/g, " ")
      .trim(),
  );
}

/** Passes whose match implies our stored name may be the damaged one. A
 *  boilerplate-only difference says nothing about the stored name's health,
 *  so it is deliberately absent. */
const ADOPTABLE_VIA = new Set(["reverse-prefix", "stored-truncated", "leading-junk", "il1-confusion"]);

for (const row of rows) {
  const target = resolveUnlistedTarget(row.name, existing, slugify, { declared });
  if (target.error) {
    // A declared entry whose target is gone matters TODAY — this row would
    // otherwise fall through to the heuristics and recreate the duplicate the
    // entry exists to prevent. Collected here and aborted on below.
    if (/unlisted-aliases\.json/.test(target.error)) brokenDeclarations.push({ name: row.name, reason: target.error });
    skipped.push({ line: row.name, reason: target.error });
    continue;
  }
  if (target.ambiguous) {
    ambiguousRows.push({ name: row.name, via: target.via, candidates: target.ambiguous });
    skipped.push({
      line: row.name,
      reason: `matches ${target.ambiguous.length} companies ${HOW_MATCHED[target.via] ?? "as a truncated name"} ` +
        `(${target.ambiguous.map((d) => d.company).slice(0, 3).join(" / ")}) — see the AMBIGUOUS section below`,
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
    // A second row landing on a document another row already claimed is the
    // one failure the relaxed passes can cause, so it is recorded here and
    // aborts the run below — never silently resolved by keeping the first.
    const already = claimedDocs.get(target.doc._id);
    if (already) { already.rows.push(row.name); continue; }
    claimedDocs.set(target.doc._id, { doc: target.doc, rows: [row.name] });

    // Should this document's own name be replaced by the incoming one? Only
    // when a relaxed pass that implies OUR name is damaged made the match,
    // and only when the stored name actually carries a corruption signature.
    const incomingCompany = adoptableCompanyName(row.name);
    let adoptCompany = null;
    if (ADOPTABLE_VIA.has(target.via) && incomingCompany) {
      const why = storedNameCorruption(target.doc.company, incomingCompany);
      if (why.length) {
        renames.push({ id: target.doc._id, from: target.doc.company, to: incomingCompany, why });
        if (args.adoptNames) adoptCompany = incomingCompany;
      }
    }

    // buildMatchedDocSet is where the "never move a URL" rule lives: `slug` is
    // not in its output on any path, and a Sanity `set` patch writes only the
    // keys it is given, so logo/sector/summary/ipoStatus are untouched.
    mutations.push({
      patch: { id: target.doc._id, set: buildMatchedDocSet({ priceFields, publish: args.publish, adoptCompany }) },
    });

    // Record names the document doesn't already answer to, so the same row
    // resolves EXACTLY on the next run instead of being relaxed again. Every
    // relaxed match lands here by construction — that is why it was relaxed —
    // and an adopted rename adds the OLD name so it keeps resolving too.
    const knownNames = [target.doc.company, ...(target.doc.aliases ?? [])].map(normalizeCompanyName);
    const newAliases = [];
    // Track what this run has already queued as well as what the document
    // already answers to. Checking only the former is how the 06-Aug adopt run
    // wrote "EB Graand Prix Luxury Elevators Limi" into aliases a second time:
    // the old company name was already in there under a slightly different
    // spelling that normalises the same.
    const wouldAdd = (name) => {
      const key = normalizeCompanyName(name);
      return key && !knownNames.includes(key) && !newAliases.some((a) => normalizeCompanyName(a) === key);
    };
    if (wouldAdd(row.name)) newAliases.push(row.name);
    if (adoptCompany && wouldAdd(target.doc.company)) newAliases.push(target.doc.company);
    if (newAliases.length) {
      mutations.push({ patch: { id: target.doc._id, setIfMissing: { aliases: [] } } });
      mutations.push({ patch: { id: target.doc._id, insert: { after: "aliases[-1]", items: newAliases } } });
    }

    if (target.via) {
      if (!relaxed.has(target.via)) relaxed.set(target.via, []);
      relaxed.get(target.via).push({ name: row.name, company: target.doc.company });
    }
    updated.push({ name: row.name, company: target.doc.company, price: row.price });
  } else {
    const company = cleanCompanyName(target.clean ?? splitEllipsis(row.name).clean);
    const _id = `unlistedShare-${slugify(company)}`;
    if (claimedNew.has(_id)) {
      skipped.push({ line: row.name, reason: `duplicate of "${claimedNew.get(_id)}" within this list — kept the first row` });
      continue;
    }
    claimedNew.set(_id, row.name);
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
    created.push({ name: company, listName: row.name, price: row.price });
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

// The relaxed matching passes are the ones worth a human's eyes: they are the
// difference between updating an existing company and forking a duplicate of
// it, and none of them is an exact name match. Printed on every run, dry or not.
const relaxedTotal = [...relaxed.values()].reduce((n, list) => n + list.length, 0);
if (relaxedTotal) {
  console.log(`\n─── ${relaxedTotal} matched by a RELAXED pass — read these before writing ───`);
  let letter = "a";
  for (const [via, label] of RELAXED_LABELS) {
    const list = relaxed.get(via);
    if (!list?.length) { letter = String.fromCharCode(letter.charCodeAt(0) + 1); continue; }
    console.log(`\n  (${letter}) ${label} — ${list.length}:`);
    for (const m of list) console.log(`      "${m.name}"\n          → ${m.company}`);
    letter = String.fromCharCode(letter.charCodeAt(0) + 1);
  }
  console.log(
    "\n  Each of these appends the list name to that document's aliases, so it matches exactly from the\n" +
    "  next run on. A wrong one here means a price on the wrong company — check them against the file.",
  );
}

// Name adoption. The stored name is now the untrusted side, so a document
// matched by a pass that implies OUR name is damaged can take the partner's
// clean one. Always listed; only applied with --adopt-names.
if (renames.length) {
  console.log(args.adoptNames
    ? `\n─── ${renames.length} company names ADOPTED from the list (--adopt-names) ───`
    : `\n─── ${renames.length} company names could be adopted from the list — pass --adopt-names to apply ───`);
  for (const r of renames) {
    console.log(`  • "${r.from}"\n      -> "${r.to}"\n      (${r.why.join("; ")})`);
  }
  console.log(
    "\n  Slugs are never changed, so no URL moves. Logo, sector, summary and ipoStatus are untouched,\n" +
    "  and the old name is kept as an alias.",
  );
}

if (created.length) {
  // Split the create list: a company we have genuinely never priced looks very
  // different from a fourth spelling of a document we already have, and only
  // the second kind needs a decision before it is written.
  const genuinelyNew = [];
  const suspect = []; // { c, near }
  for (const c of created) {
    const near = nearbyExistingDocs(c.listName, existing);
    if (near.length) suspect.push({ c, near });
    else genuinelyNew.push(c);
  }

  const heading = args.publish ? "live on the site after the next revalidation" : "review in Studio before they go live";
  if (genuinelyNew.length) {
    console.log(`\nCreated — genuinely new companies (${genuinelyNew.length}; ${heading}):`);
    for (const c of genuinelyNew) console.log(`  • ${c.name}  ₹${c.price.toLocaleString("en-IN")}`);
  }
  if (suspect.length) {
    console.log(`\nCreated — POSSIBLE DUPLICATE of an existing document (${suspect.length}) — check each one:`);
    for (const { c, near } of suspect) {
      console.log(`  • ${c.name}  ₹${c.price.toLocaleString("en-IN")}`);
      for (const n of near) console.log(`      looks like: ${n.doc.company}${n.storedName !== n.doc.company ? `  (alias "${n.storedName}")` : ""}`);
    }
    console.log(
      "\n  These share a long opening with a document already in the dataset. If one really is the same\n" +
      "  company, add the list name to that document's aliases in Studio and re-run — do not let it create.",
    );
  }
}
// Rows that resolve to more than one real document. These are never guessed
// at — but the company keeps yesterday's price until someone decides, so the
// report has to carry everything that decision needs.
if (ambiguousRows.length) {
  console.log(`\n─── ${ambiguousRows.length} AMBIGUOUS — two documents claim one row; pick a survivor ───`);
  for (const a of ambiguousRows) {
    console.log(`\n  "${a.name}"`);
    for (const d of a.candidates) {
      const curated = [
        d.hasLogo ? "logo" : null,
        d.hasSummary ? "summary" : null,
        d.sector ? `sector "${d.sector}"` : null,
        d.ipoStatus ? `ipoStatus "${d.ipoStatus}"` : null,
      ].filter(Boolean);
      const price = typeof d.indicativePriceINR === "number"
        ? `₹${d.indicativePriceINR.toLocaleString("en-IN")} as of ${d.asOfDate ?? "(no date)"}`
        : "no price";
      console.log(`      ${d.slug ?? "(no slug)"}`);
      console.log(`          ${d.company}`);
      console.log(`          ${d.needsReview ? "HIDDEN (needsReview)" : "LIVE"} · ${price}`);
      console.log(`          curated: ${curated.length ? curated.join(", ") : "nothing"}`);
    }
    console.log(
      `      → decide, then add to ${ALIASES_DISPLAY_PATH}:\n` +
      `          "<survivor-slug>": ["${a.name}"]`,
    );
  }
  console.log(
    "\n  Until one is declared, these companies keep the price they had before this list. Prefer the\n" +
    "  document carrying curated content as the survivor — its logo and summary are the expensive part.",
  );
}

if (skipped.length) {
  console.log("\nSkipped:");
  for (const s of skipped) console.log(`  • ${s.line} — ${s.reason}`);
}

// ---------- a declared name whose document is gone ----------
// The alias file is an operator decision. When one of today's rows relies on an
// entry whose target no longer exists, honouring it is impossible and ignoring
// it recreates the duplicate it was written to prevent — so neither happens.
if (brokenDeclarations.length) {
  console.error(
    `\nABORTED — ${brokenDeclarations.length} row${brokenDeclarations.length > 1 ? "s" : ""} on this list ` +
    `${brokenDeclarations.length > 1 ? "are" : "is"} declared in ${ALIASES_DISPLAY_PATH}, but the document ` +
    `pointed at no longer exists. Nothing was written to Sanity.\n`,
  );
  for (const b of brokenDeclarations) console.error(`  "${b.name}"\n      ${b.reason}`);
  console.error("\n  Find the document in Studio, copy its slug from the URL bar, and correct the file.");
  process.exit(1);
}

// ---------- one document, one row ----------
// The matching passes above are looser than anything this pipeline had before,
// and they can fail in exactly one way: two different companies on the list
// collapsing onto one of our documents. Whichever row wrote last would win,
// the other company would silently vanish from the site, and the surviving
// document would carry a price that isn't its own. There is no flag for this
// and there should not be — a name collision is resolved by a human deciding
// which document is which, not by an importer picking one.
const collisions = [...claimedDocs.values()].filter((c) => c.rows.length > 1);
if (collisions.length) {
  console.error(
    `\nABORTED — ${collisions.length} existing document${collisions.length > 1 ? "s are" : " is"} claimed by more than ` +
    `one row of this list. Nothing was written to Sanity.\n`,
  );
  for (const c of collisions) {
    console.error(`  ${c.doc.company}  (${c.doc._id})`);
    for (const name of c.rows) console.error(`      ← "${name}"`);
    console.error("");
  }
  console.error(
    "  These are different rows on the partner's list, so they are different companies. Open the ones\n" +
    "  named above in Studio and give each its own document — put the right list name in each doc's\n" +
    "  aliases — then re-run. --allow-drift does not relax this and neither does --adopt-names.",
  );
  process.exit(1);
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
