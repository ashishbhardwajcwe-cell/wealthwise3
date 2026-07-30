#!/usr/bin/env node
/**
 * archive-pms.mjs — snapshot what the site is currently showing, before the
 * month's import overwrites it.
 *
 *   npm run archive:pms                    # archive the current Sanity state
 *   npm run archive:pms -- --force         # overwrite an existing archive
 *   npm run archive:pms -- --date 2026-06-30
 *   npm run archive:pms -- --out-dir scripts/archive
 *
 * Run it BEFORE `npm run import:pms`. It reads every pmsStrategy document as
 * it stands right now and writes two files into scripts/archive/:
 *
 *   pms-YYYY-MM-DD.csv   the audit trail — same column shape as
 *                        pms-template.csv, one row per strategy, plus each
 *                        document's real _id in the sanityId column. Committed
 *                        to git ON PURPOSE and never gitignored: a dated,
 *                        diffable record of what the site displayed that month
 *                        is the entire point, and `git diff` across two of
 *                        these answers "what changed, and when" directly.
 *                        The _id column also makes an archive a source of
 *                        truth for scripts/pms-pins.json.
 *
 *   pms-YYYY-MM-DD.pdf   the same data, readable — cover page with the as-on
 *                        date, strategy count and total AUM, then every
 *                        strategy with manager, category, AUM and all nine
 *                        return windows.
 *
 * The date in the filename is the data's as-on date (the latest asOfDate
 * across the documents), not the day the script ran — so the archive is named
 * for the month it describes. It refuses to overwrite an existing archive for
 * that date unless --force, because silently rewriting last month's record is
 * the one thing an audit trail must not do.
 *
 * Reading needs only NEXT_PUBLIC_SANITY_PROJECT_ID; the dataset is publicly
 * readable, so no Editor token has to be in the shell. Nothing here writes to
 * Sanity.
 */

import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { resolve, relative } from "node:path";
import { requireSanityEnv, sanityQuery } from "./import-shared.mjs";
import { CSV_COLUMNS, RETURN_COLUMNS, toCsv } from "./pms-csv.mjs";
import { createPdf, clipCourier, courierWidth } from "./pdf-lite.mjs";

const argv = process.argv.slice(2);
const flag = (name) => {
  const i = argv.indexOf(`--${name}`);
  return i === -1 ? undefined : argv[i + 1];
};
const FORCE = argv.includes("--force");
const OUT_DIR = resolve(process.cwd(), flag("out-dir") ?? "scripts/archive");

const env = requireSanityEnv({ write: false });

// ---------- read ----------
const docs = await sanityQuery(
  env,
  `*[_type == "pmsStrategy" && !(_id in path("drafts.**"))]{
     _id, strategyName, manager, category, aumCr, minInvestmentL, inceptionDate,
     returns, fees, asOfDate, source, notes
   } | order(manager asc, strategyName asc)`,
);

if (!Array.isArray(docs) || docs.length === 0) {
  console.error(
    `No pmsStrategy documents in ${env.projectId}/${env.dataset} — nothing to archive.\n` +
    "An empty archive would read as 'the site showed nothing this month', which is worse than no file.",
  );
  process.exit(1);
}

// ---------- date ----------
// The archive is named for the data it contains, not the day it ran.
const dateArg = flag("date");
if (dateArg && !/^\d{4}-\d{2}-\d{2}$/.test(dateArg)) {
  console.error(`--date must be zero-padded YYYY-MM-DD (got "${dateArg}").`);
  process.exit(1);
}
const asOfDates = docs.map((d) => d.asOfDate).filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d ?? ""));
const archiveDate = dateArg ?? asOfDates.sort().at(-1);
if (!archiveDate) {
  console.error(
    "No document carries a usable asOfDate, so the archive has no month to be named for.\n" +
    "Pass --date YYYY-MM-DD to name it explicitly.",
  );
  process.exit(1);
}

// A mixed-date dataset means a previous import only partly landed. Worth
// saying — the archive is still valid, it just isn't one clean month.
const distinctDates = [...new Set(asOfDates)].sort();
if (distinctDates.length > 1) {
  console.warn(
    `\nWARNING: documents carry ${distinctDates.length} different as-on dates ` +
    `(${distinctDates.slice(0, 4).join(", ")}${distinctDates.length > 4 ? ", …" : ""}).\n` +
    `         Archiving all of them under ${archiveDate}, the newest. A split like this usually\n` +
    "         means a previous import covered only part of the universe.\n",
  );
}

mkdirSync(OUT_DIR, { recursive: true });
const csvPath = resolve(OUT_DIR, `pms-${archiveDate}.csv`);
const pdfPath = resolve(OUT_DIR, `pms-${archiveDate}.pdf`);
const shown = (p) => relative(process.cwd(), p) || p;

const clash = [csvPath, pdfPath].filter(existsSync);
if (clash.length && !FORCE) {
  console.error(
    `An archive for ${archiveDate} already exists:\n` +
    clash.map((p) => `  ${shown(p)}`).join("\n") +
    "\n\nRefusing to overwrite it — a dated snapshot that changes after the fact is not an audit trail.\n" +
    "Re-run with --force if you genuinely mean to replace it, or pass --date for a different month.",
  );
  process.exit(1);
}

// ---------- CSV ----------
const RETURN_KEY = Object.fromEntries(RETURN_COLUMNS.map(([col, , key]) => [col, key]));
const cell = (v) => (v === null || v === undefined ? "" : v);

const csvRows = docs.map((d) => {
  const row = {
    strategyName: cell(d.strategyName),
    manager: cell(d.manager),
    category: cell(d.category),
    aumCr: cell(d.aumCr),
    minInvestmentL: cell(d.minInvestmentL),
    inceptionDate: cell(d.inceptionDate),
    feesFixed: cell(d.fees?.fixed),
    feesPerformance: cell(d.fees?.performance),
    feesHurdle: cell(d.fees?.hurdle),
    asOfDate: cell(d.asOfDate),
    source: cell(d.source),
    notes: cell(d.notes),
    // The document's real id, so an archive can answer "which document was
    // this?" — and so pms-pins.json can be filled from a committed file.
    sanityId: d._id,
  };
  for (const [col, key] of Object.entries(RETURN_KEY)) row[col] = cell(d.returns?.[key]);
  return row;
});
writeFileSync(csvPath, toCsv(csvRows, CSV_COLUMNS), "utf8");

// ---------- PDF ----------
const totalAum = docs.reduce((sum, d) => sum + (typeof d.aumCr === "number" ? d.aumCr : 0), 0);
const withAum = docs.filter((d) => typeof d.aumCr === "number").length;
const inr = (n) => Math.round(n).toLocaleString("en-IN");
const fmtPct = (v) => (typeof v === "number" ? v.toFixed(1) : "-");

const PAGE = { width: 842, height: 595, margin: 34 };
const FOOT_LINE_1 = "Source: APMI (Association of Portfolio Managers in India) monthly report. Figures are as displayed on planmycashflows.com on the as-on date above.";
const FOOT_LINE_2 = "Returns are TWRR at strategy level, annualised beyond 1 year; 1M/3M/6M are absolute. Past performance is not indicative of future returns.";

// [label, width, align]. Courier is fixed-width, so these are exact.
const COLUMNS = [
  ["Strategy", 168, "left"],
  ["Manager", 150, "left"],
  ["Category", 54, "left"],
  ["AUM Cr", 52, "right"],
  ...RETURN_COLUMNS.map(([, label]) => [label, 40, "right"]),
];
const TABLE_WIDTH = COLUMNS.reduce((w, c) => w + c[1], 0);
const ROW_SIZE = 6.8;
const ROW_HEIGHT = 10.5;
const BODY_TOP = 78;
const BODY_BOTTOM = PAGE.height - 46;

const pdf = createPdf({ width: PAGE.width, height: PAGE.height });

/* cover */
pdf.addPage();
pdf.rect(0, 0, PAGE.width, 132, { gray: 0.94 });
pdf.text("PlanMyCashflows", PAGE.margin, 52, { font: "F2", size: 13, gray: 0.35 });
pdf.text("PMS strategy archive", PAGE.margin, 88, { font: "F2", size: 30 });
pdf.text(`As on ${archiveDate}`, PAGE.margin, 116, { font: "F1", size: 14, gray: 0.3 });

const facts = [
  ["Strategies archived", inr(docs.length)],
  ["Total AUM", `Rs ${inr(totalAum)} Cr`],
  ["Strategies reporting AUM", `${inr(withAum)} of ${inr(docs.length)}`],
  ["As-on date", archiveDate + (distinctDates.length > 1 ? `  (newest of ${distinctDates.length} dates present)` : "")],
  ["Dataset", `${env.projectId}/${env.dataset}`],
];
let fy = 190;
for (const [k, v] of facts) {
  pdf.text(k, PAGE.margin, fy, { font: "F1", size: 10, gray: 0.4 });
  pdf.text(v, PAGE.margin + 210, fy, { font: "F2", size: 13 });
  pdf.line(PAGE.margin, fy + 10, PAGE.margin + 430, fy + 10, { gray: 0.88 });
  fy += 38;
}

pdf.text("What this document is", PAGE.margin, fy + 24, { font: "F2", size: 11 });
for (const [i, para] of [
  "A snapshot of every PMS strategy the site was displaying on the as-on date above, taken",
  "immediately before that month's data refresh. The matching CSV alongside this file carries the",
  "same rows in the import template's column shape, including each strategy's Sanity document id.",
].entries()) {
  pdf.text(para, PAGE.margin, fy + 44 + i * 15, { font: "F1", size: 10, gray: 0.25 });
}
pdf.text(FOOT_LINE_1, PAGE.margin, PAGE.height - 42, { font: "F1", size: 7.5, gray: 0.45 });
pdf.text(FOOT_LINE_2, PAGE.margin, PAGE.height - 30, { font: "F1", size: 7.5, gray: 0.45 });

/* table */
let y = 0;
const startTablePage = () => {
  pdf.addPage();
  pdf.text("PMS strategy archive", PAGE.margin, 40, { font: "F2", size: 12 });
  pdf.text(`As on ${archiveDate}  ·  ${inr(docs.length)} strategies  ·  Rs ${inr(totalAum)} Cr total AUM`,
    PAGE.margin, 56, { font: "F1", size: 8.5, gray: 0.4 });

  // header band
  pdf.rect(PAGE.margin, BODY_TOP - 11, TABLE_WIDTH, 14, { gray: 0.9 });
  let x = PAGE.margin;
  for (const [label, width, align] of COLUMNS) {
    if (align === "right") pdf.textRightCourier(label, x + width - 4, BODY_TOP - 1, { size: ROW_SIZE, bold: true, gray: 0.2 });
    else pdf.text(clipCourier(label, width - 6, ROW_SIZE), x + 3, BODY_TOP - 1, { font: "F4", size: ROW_SIZE, gray: 0.2 });
    x += width;
  }

  pdf.line(PAGE.margin, PAGE.height - 40, PAGE.margin + TABLE_WIDTH, PAGE.height - 40, { gray: 0.85 });
  pdf.text(FOOT_LINE_1, PAGE.margin, PAGE.height - 30, { font: "F1", size: 6.5, gray: 0.45 });
  pdf.text(FOOT_LINE_2, PAGE.margin, PAGE.height - 21, { font: "F1", size: 6.5, gray: 0.45 });

  y = BODY_TOP + ROW_HEIGHT;
};

startTablePage();
for (const [i, d] of docs.entries()) {
  if (y > BODY_BOTTOM) startTablePage();
  if (i % 2 === 1) pdf.rect(PAGE.margin, y - 7.5, TABLE_WIDTH, ROW_HEIGHT, { gray: 0.965 });

  const values = [
    d.strategyName ?? "",
    d.manager ?? "",
    d.category ?? "-",
    typeof d.aumCr === "number" ? inr(d.aumCr) : "-",
    ...RETURN_COLUMNS.map(([, , key]) => fmtPct(d.returns?.[key])),
  ];
  let x = PAGE.margin;
  values.forEach((v, c) => {
    const [, width, align] = COLUMNS[c];
    if (align === "right") pdf.textRightCourier(String(v), x + width - 4, y, { size: ROW_SIZE, gray: 0.1 });
    else pdf.text(clipCourier(String(v), width - 6, ROW_SIZE), x + 3, y, { font: "F3", size: ROW_SIZE, gray: 0.1 });
    x += width;
  });
  y += ROW_HEIGHT;
}

// Page numbers go on last, once the total is known. The source footer is
// drawn as each page is built (see startTablePage) so it travels with any
// single page someone prints or forwards.
const totalPages = pdf.pageCount();
for (let p = 0; p < totalPages; p++) {
  pdf.setPage(p);
  pdf.textRightCourier(`Page ${p + 1} of ${totalPages}`, PAGE.width - PAGE.margin, PAGE.height - 18,
    { size: 7, gray: 0.5 });
}

writeFileSync(pdfPath, pdf.toBuffer({ title: `PMS strategy archive — as on ${archiveDate}`, date: archiveDate }), null);

console.log(`Archived ${docs.length} strategies from ${env.projectId}/${env.dataset}, as on ${archiveDate}:`);
console.log(`  ${shown(csvPath)}`);
console.log(`  ${shown(pdfPath)}   (${pdf.pageCount()} pages)`);
console.log(`  total AUM Rs ${inr(totalAum)} Cr across ${withAum} of ${docs.length} strategies`);
console.log(`\nCommit both files — they are the record of what the site displayed on ${archiveDate}.`);
console.log("Then: npm run import:pms -- scripts/pms-data.csv --dry-run");
