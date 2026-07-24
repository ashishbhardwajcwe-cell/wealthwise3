#!/usr/bin/env node
/**
 * Unlisted-shares logo extractor — one-time (safe to re-run) companion to the
 * price importer. The partner's daily PDF prints each company's own logo in
 * the LEFT cell of its row. This renders every page, locates each row by OCR
 * (the same classifyOcrLine used by the price importer), crops the left logo
 * cell, keeps the ones that are real logos (dropping the partner's flat
 * monogram placeholders), uploads them to Sanity and sets the matching
 * `unlistedShare.logo`. The card/list then show the real brand mark, falling
 * back to our own monogram wherever no logo was found.
 *
 *   node scripts/extract-unlisted-logos.mjs <pricelist.pdf> --dry-run   # preview crops locally, no writes
 *   node scripts/extract-unlisted-logos.mjs <pricelist.pdf>             # upload + attach to Sanity
 *   node scripts/extract-unlisted-logos.mjs <pricelist.pdf> --force     # also overwrite logos already set
 *   npm run logos:unlisted -- <pricelist.pdf> --dry-run
 *
 * ── CONFIDENTIALITY ────────────────────────────────────────────────────────
 * The crop is bounded on the right by the start of the company NAME text, so
 * it can only ever contain the left logo cell — never the retail, dealer or
 * lot columns. Nothing here reads, logs or stores a price of any kind; only
 * company names and logo images leave this script. The dealer price stays
 * confidential exactly as in the price importer. Keep it that way.
 * ───────────────────────────────────────────────────────────────────────────
 *
 * Matching: a crop is attached only to an EXISTING unlistedShare document
 * (resolved by slug → aliases → normalised name, same as the price importer).
 * Logos never create documents and never touch a company's name or slug.
 * Rows already carrying a logo are skipped unless --force.
 *
 * Needs the OCR toolchain (devDependencies): pdf-parse, tesseract.js,
 * @tesseract.js-data/eng, @napi-rs/canvas — run `npm install` if missing.
 * Env (dry-run excepted): NEXT_PUBLIC_SANITY_PROJECT_ID, SANITY_API_TOKEN.
 */

import { readFileSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { resolve, join } from "node:path";
import { createRequire } from "node:module";
import {
  loadDotEnvLocal, requireSanityEnv, slugify,
  sanityQuery, sanityMutate, sanityUploadImage,
} from "./import-shared.mjs";
import { classifyOcrLine, resolveUnlistedTarget } from "./unlisted-matching.mjs";

const require = createRequire(import.meta.url);

// ---------- args ----------
const args = { dryRun: false, force: false, scale: 4, out: "unlisted-logos" };
for (const a of process.argv.slice(2)) {
  if (a === "--dry-run") args.dryRun = true;
  else if (a === "--force") args.force = true;
  else if (a.startsWith("--scale=")) args.scale = Number(a.slice(8)) || 4;
  else if (a.startsWith("--out=")) args.out = a.slice(6).trim();
  else if (a === "--help" || a === "-h") { console.log("See the header of scripts/extract-unlisted-logos.mjs for usage."); process.exit(0); }
  else if (!a.startsWith("--")) args.file = a;
  else { console.error(`Unknown flag ${a}`); process.exit(1); }
}
if (!args.file) {
  console.error("Usage: node scripts/extract-unlisted-logos.mjs <pricelist.pdf> [--dry-run] [--force]");
  process.exit(1);
}
const filePath = resolve(args.file);
if (!existsSync(filePath)) { console.error(`No such file: ${args.file}`); process.exit(1); }

// ---------- env (dry-run may run without it) ----------
loadDotEnvLocal();
const hasEnv = !!(process.env.NEXT_PUBLIC_SANITY_PROJECT_ID && process.env.SANITY_API_TOKEN);
if (!hasEnv && !args.dryRun) requireSanityEnv();
const env = hasEnv ? requireSanityEnv() : null;

// ---------- deps ----------
let PDFParse, createWorker, OEM, createCanvas, loadImage;
try {
  ({ PDFParse } = await import("pdf-parse"));
  ({ createWorker, OEM } = await import("tesseract.js"));
  ({ createCanvas, loadImage } = await import("@napi-rs/canvas"));
} catch {
  console.error("Logo extraction needs pdf-parse, tesseract.js, @tesseract.js-data/eng and @napi-rs/canvas.\nThey're in devDependencies — run: npm install");
  process.exit(1);
}
const langDir = require.resolve("@tesseract.js-data/eng/package.json").replace(/package\.json$/, "4.0.0");
const median = (a) => { const s = [...a].sort((x, y) => x - y); return s.length ? s[Math.floor(s.length / 2)] : 0; };
const pageBuffer = (p) => p.nodeBuffer ?? (p.dataUrl ? Buffer.from(p.dataUrl.split(",")[1], "base64") : null);

/**
 * Keep a crop unless it's near-blank or the partner's monogram placeholder.
 * A placeholder is a SOLID pale-gray rounded square (fills the cell, almost no
 * colours, almost no saturation); a real logo — colourful OR a black wordmark
 * / thin line-art emblem on white — never matches all three. Validated against
 * the real list: separates 63Sats/Aegeus/Airlife placeholders from real logos
 * while keeping monochrome marks (Apollo Fashion, Amol Minechem).
 */
const isPlaceholder = (s) => s.fillFrac >= 0.12 && s.distinctColors <= 12 && s.meanSat <= 16;
const isRealLogo = (s) => s.fillFrac >= 0.015 && !isPlaceholder(s);

// ---------- render every page ----------
console.log(`Rendering ${args.file} at scale ${args.scale}…`);
const parser = new PDFParse({ data: readFileSync(filePath) });
let shots;
try { shots = await parser.getScreenshot({ scale: args.scale }); }
finally { await parser.destroy(); }

// ---------- pass 1: OCR every page, gather rows + global name-column edge ----------
const worker = await createWorker("eng", OEM.LSTM_ONLY, { langPath: langDir, gzip: true, cacheMethod: "none" });
const pages = []; // { index, buf, width, height, rows:[{name, nameStartX, y0, y1}], pitch }
const allNameStartX = [];
try {
  for (const [i, page] of shots.pages.entries()) {
    const buf = pageBuffer(page);
    if (!buf) continue;
    const img = await loadImage(buf);
    const width = img.width, height = img.height;
    const { data } = await worker.recognize(buf, {}, { blocks: true, text: true });
    const rows = [];
    for (const block of data.blocks ?? [])
      for (const para of block.paragraphs ?? [])
        for (const line of para.lines ?? []) {
          const words = line.words.map((w) => ({ text: w.text, x0: w.bbox.x0, x1: w.bbox.x1, symbols: [] }));
          const parsed = classifyOcrLine(words, width);
          if (!parsed || parsed.error || parsed.nameStartX == null) continue;
          rows.push({ name: parsed.name, nameStartX: parsed.nameStartX, y0: line.bbox.y0, y1: line.bbox.y1 });
          allNameStartX.push(parsed.nameStartX);
        }
    rows.sort((a, b) => (a.y0 + a.y1) - (b.y0 + b.y1));
    const centers = rows.map((r) => (r.y0 + r.y1) / 2);
    const gaps = centers.slice(1).map((c, k) => c - centers[k]);
    pages.push({ index: i, buf, width, height, rows, pitch: gaps.length ? median(gaps) : height * 0.04 });
    console.log(`  page ${i + 1}/${shots.pages.length}: ${rows.length} rows`);
  }
} finally {
  await worker.terminate();
}

if (allNameStartX.length === 0) { console.error("No data rows detected — is this the partner price-list PDF?"); process.exit(1); }
// One name-column boundary for the whole document (identical template on every
// page), so a single page whose OCR noise skews its own median can't misplace
// the crop. The logo cell is everything left of it.
const nameColLeft = median(allNameStartX);

// ---------- pass 2: crop + score each row's logo cell ----------
/** Crop the logo cell for a row and score it. Returns { png, score } or null.
 *  Pixels are read only from x in [pageLeft, nameColLeft) — left of the name. */
function cropLogo(ctx, width, pitch, row) {
  const yc = (row.y0 + row.y1) / 2;
  const h = Math.round(pitch * 0.9);
  const y = Math.round(yc - h / 2);
  const xL = Math.round(width * 0.028);
  const xR = Math.round(nameColLeft - width * 0.008);
  const w = xR - xL;
  if (w < 12 || h < 12 || y < 0 || y + h > ctx.canvas.height) return null;

  const raw = ctx.getImageData(xL, y, w, h);
  let minX = w, minY = h, maxX = 0, maxY = 0, dark = 0, satSum = 0, n = 0;
  const colors = new Set();
  for (let py = 0; py < h; py++) for (let px = 0; px < w; px++) {
    const i = (py * w + px) * 4;
    const R = raw.data[i], G = raw.data[i + 1], B = raw.data[i + 2];
    const mx = Math.max(R, G, B), mn = Math.min(R, G, B); n++;
    if (mn <= 238) {
      dark++; satSum += mx - mn;
      if (px < minX) minX = px; if (px > maxX) maxX = px;
      if (py < minY) minY = py; if (py > maxY) maxY = py;
      colors.add(((R >> 5) << 6) | ((G >> 5) << 3) | (B >> 5));
    }
  }
  if (dark === 0) return null;
  const score = { distinctColors: colors.size, meanSat: satSum / dark, fillFrac: dark / n };
  if (!isRealLogo(score)) return { png: null, score };

  // Re-crop tight to the logo with a small white margin, on a white tile.
  const pad = Math.round(h * 0.08);
  const bx = xL + Math.max(0, minX - pad), by = y + Math.max(0, minY - pad);
  const bw = Math.min(w - Math.max(0, minX - pad), maxX - minX + 1 + pad * 2);
  const bh = Math.min(h - Math.max(0, minY - pad), maxY - minY + 1 + pad * 2);
  const out = createCanvas(bw, bh);
  const octx = out.getContext("2d");
  octx.fillStyle = "#ffffff"; octx.fillRect(0, 0, bw, bh);
  octx.drawImage(ctx.canvas, bx, by, bw, bh, 0, 0, bw, bh);
  return { png: out.toBuffer("image/png"), score };
}

// One crop per detected row (real logos only).
const crops = []; // { name, png }
for (const pg of pages) {
  const img = await loadImage(pg.buf);
  const ctx = createCanvas(pg.width, pg.height).getContext("2d");
  ctx.drawImage(img, 0, 0);
  for (const row of pg.rows) {
    const res = cropLogo(ctx, pg.width, pg.pitch, row);
    if (res?.png) crops.push({ name: row.name, png: res.png });
  }
}
console.log(`\n${crops.length} real logos cropped from ${allNameStartX.length} rows (placeholders and blanks skipped).`);

// ---------- dry-run: write crops locally, no Sanity ----------
if (args.dryRun || !env) {
  const outDir = resolve(args.out);
  mkdirSync(outDir, { recursive: true });
  crops.forEach((c, i) => writeFileSync(join(outDir, `${String(i + 1).padStart(3, "0")}-${slugify(c.name)}.png`), c.png));
  console.log(`\n--dry-run: wrote ${crops.length} crops to ${outDir}/ for review. No Sanity writes.`);
  if (!env && !args.dryRun) console.log("(no Sanity env found — nothing could be uploaded anyway)");
  console.log("Re-run without --dry-run (with Sanity env) to upload and attach them.");
  process.exit(0);
}

// ---------- match to existing docs, upload, attach ----------
const existing = await sanityQuery(
  env,
  `*[_type == "unlistedShare" && !(_id in path("drafts.**"))]{ _id, company, "slug": slug.current, aliases, "hasLogo": defined(logo) }`,
);

const mutations = [];
const attached = []; // { company, list }
const skipped = [];  // { name, reason }
const claimed = new Set();

for (const crop of crops) {
  const target = resolveUnlistedTarget(crop.name, existing, slugify);
  if (!target.doc) {
    skipped.push({ name: crop.name, reason: target.create ? "no matching company (logos never create docs)" : target.ambiguous ? "ambiguous match" : (target.error ?? "unmatched") });
    continue;
  }
  if (claimed.has(target.doc._id)) { skipped.push({ name: crop.name, reason: `already got a logo this run (${target.doc.company})` }); continue; }
  if (target.doc.hasLogo && !args.force) { skipped.push({ name: crop.name, reason: "logo already set (use --force to replace)" }); continue; }
  claimed.add(target.doc._id);

  const asset = await sanityUploadImage(env, crop.png, { filename: `${slugify(target.doc.company)}-logo.png`, contentType: "image/png" });
  mutations.push({ patch: { id: target.doc._id, set: { logo: { _type: "image", asset: { _type: "reference", _ref: asset._id } } } } });
  attached.push({ company: target.doc.company, list: crop.name });
  process.stdout.write(`  ✓ ${target.doc.company}\r`);
}

console.log(`\n\n${attached.length} logos attached · ${skipped.length} skipped`);
if (attached.length) {
  console.log("\nAttached:");
  for (const a of attached) console.log(`  • ${a.company}${a.list !== a.company ? `  (list name: "${a.list}")` : ""}`);
}
if (skipped.length) {
  console.log("\nSkipped:");
  for (const s of skipped.slice(0, 40)) console.log(`  • ${s.name} — ${s.reason}`);
  if (skipped.length > 40) console.log(`  … and ${skipped.length - 40} more`);
}

if (mutations.length === 0) { console.log("\nNothing to write."); process.exit(0); }
await sanityMutate(env, mutations);
console.log(`\nWrote ${mutations.length} logo references to Sanity (${env.projectId}/${env.dataset}).`);
console.log("The unlisted-shares page shows the logos on its next revalidation (≤1h) or deploy.");
