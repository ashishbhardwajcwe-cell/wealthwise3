#!/usr/bin/env node
/**
 * Unlisted-shares logo extractor — companion to the price importer. It puts
 * each company's own brand mark on its card, falling back to our monogram
 * wherever the partner's file has no logo for a company.
 *
 * Two sources, dispatched on the file's extension:
 *
 *   .xlsx / .xlsm  The partner's Excel workbook (their format since
 *                  06-Aug-2026). Each row's logo is a real embedded image,
 *                  anchored by the workbook to that row. It is read straight
 *                  out of the file — no rendering, no OCR, no cropping, and no
 *                  guessing which row an image belongs to.
 *   .pdf           The older designed PDF, where the logo is only drawn into
 *                  the row's left cell. Rendered at 4x, located by OCR (the
 *                  same classifyOcrLine the price importer uses), cropped and
 *                  scored. Unchanged.
 *
 *   node scripts/extract-unlisted-logos.mjs <pricelist.xlsx> --dry-run  # preview crops locally, no writes
 *   node scripts/extract-unlisted-logos.mjs <pricelist.xlsx>            # upload + attach to Sanity
 *   node scripts/extract-unlisted-logos.mjs <pricelist.xlsx> --force    # also overwrite logos already set
 *   npm run logos:unlisted -- <pricelist.xlsx> --dry-run
 *
 * ── CONFIDENTIALITY ────────────────────────────────────────────────────────
 * This script reads company NAMES and IMAGES. It reads no price of any kind —
 * not the retail price, and above all not the dealer (cost) price, which is
 * confidential and sits in column E of the workbook.
 *
 *   • Excel: joinLogosToRows carries only the name across from each price row.
 *     The paired records this script works with have nowhere to hold a price.
 *   • PDF: the crop is bounded on the right by the start of the company NAME
 *     text, so it can only ever contain the left logo cell — never the retail,
 *     dealer or lot columns.
 *
 * Nothing here logs, stores or prints a figure from either file. Keep it that
 * way; the Sanity dataset these logos land in is publicly readable.
 * ───────────────────────────────────────────────────────────────────────────
 *
 * ── MATCHING ───────────────────────────────────────────────────────────────
 * A logo is attached only to an EXISTING unlistedShare document. It is
 * resolved through the SAME resolveUnlistedTarget the price importer uses, with
 * the SAME declared alias file — so a name lands on the same document whether
 * it is carrying a price or a picture. That matters more than it sounds: the
 * partner writes "PharmEasy Unlisted Shares", which is an alias on two of our
 * documents, so without scripts/unlisted-aliases.json it resolves to neither
 * and the logo is silently dropped.
 *
 * Logos never create documents and never touch a company's name or slug. Rows
 * already carrying a logo are skipped unless --force. A logo whose company
 * cannot be resolved is reported by name — it never fails the run.
 * ───────────────────────────────────────────────────────────────────────────
 *
 * Needs @napi-rs/canvas (devDependencies); the PDF path additionally needs
 * pdf-parse, tesseract.js and @tesseract.js-data/eng. Run `npm install` if
 * they're missing. Env (dry-run excepted): NEXT_PUBLIC_SANITY_PROJECT_ID,
 * SANITY_API_TOKEN.
 */

import { readFileSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { resolve, join, extname } from "node:path";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
import {
  loadDotEnvLocal, requireSanityEnv, slugify,
  sanityQuery, sanityMutate, sanityUploadImage,
} from "./import-shared.mjs";
import { classifyOcrLine, resolveUnlistedTarget } from "./unlisted-matching.mjs";
import { loadUnlistedAliases, ALIASES_DISPLAY_PATH } from "./unlisted-aliases.mjs";
import { readUnlistedXlsx, joinLogosToRows } from "./unlisted-xlsx.mjs";

const require = createRequire(import.meta.url);

const EXISTING_QUERY =
  `*[_type == "unlistedShare" && !(_id in path("drafts.**"))]{ _id, company, "slug": slug.current, aliases, "hasLogo": defined(logo) }`;

/** A pixel at least this bright on every channel counts as background. JPEG
 *  ringing lifts the "white" around a mark a few levels off 255, so the test
 *  is a floor rather than equality. */
export const WHITE_FLOOR = 246;

/** Under this in either dimension, after trimming, an image is a bullet or a
 *  rule rather than a brand mark — our monogram looks better than a smudge. */
export const MIN_LOGO_PX = 32;

/** Re-encode quality, used ONLY when a border was actually trimmed. */
const JPEG_QUALITY = 92;

const MEDIA_TYPES = { jpeg: "image/jpeg", jpg: "image/jpeg", png: "image/png", gif: "image/gif", webp: "image/webp" };

// ---------- @napi-rs/canvas, loaded on first use ----------
// Lazily rather than at import time, so this module can be imported by the
// test suite (and by anything else) without a native dependency being present.
let createCanvas, loadImage;
async function loadCanvas() {
  if (createCanvas) return;
  try {
    ({ createCanvas, loadImage } = await import("@napi-rs/canvas"));
  } catch {
    throw new Error("Logo extraction needs @napi-rs/canvas.\nIt's in devDependencies — run: npm install");
  }
}

// ---------- shared: deciding where each logo goes ----------

/**
 * The file name a crop is written under during a dry run, and uploaded under.
 *
 * Named for the DOCUMENT's slug rather than a slug derived from its company
 * name: they are not always the same ("Sterlite Grid 5" lives at
 * wu-sterlite-grid-5), and the point of the dry run is to flip through a folder
 * in Finder and be able to tell which document each picture is going onto.
 */
export function cropFileName(doc, crop) {
  const base = doc ? (doc.slug || slugify(doc.company ?? "")) : slugify(crop.name ?? "");
  return `${base || "unnamed"}.${crop.extension}`;
}

/**
 * Decide which EXISTING document each crop belongs to. This is where every
 * safety rule lives, for both file formats:
 *   • a crop with no matching document is REPORTED, never turned into one;
 *   • a document already claimed this run keeps its first logo;
 *   • a document that already has a logo is left alone unless --force;
 *   • nothing here touches a company's name or slug.
 *
 * `declared` is the parsed scripts/unlisted-aliases.json map, passed straight
 * through to the matcher — the same operator decisions the price import obeys.
 *
 * Returns { planned: [{ crop, doc, via }], unmatched: [{ name, reason, crop, doc }] }.
 * Skipped entries carry their crop so a dry run can still write them out for
 * review; `doc` is set only where one was resolved.
 */
export function planAttachments(crops, existing, { force = false, declared = null } = {}) {
  const planned = [];
  const unmatched = [];
  const claimed = new Set();

  for (const crop of crops) {
    const target = resolveUnlistedTarget(crop.name, existing, slugify, { declared });
    if (!target.doc) {
      unmatched.push({
        name: crop.name,
        crop,
        doc: null,
        reason: target.create
          ? "no matching company (logos never create docs)"
          : target.ambiguous
            ? `ambiguous — matches ${target.ambiguous.map((d) => d.company).slice(0, 3).join(" / ")}`
            : (target.error ?? "unmatched"),
      });
      continue;
    }
    if (claimed.has(target.doc._id)) {
      unmatched.push({ name: crop.name, crop, doc: target.doc, reason: `already got a logo this run (${target.doc.company})` });
      continue;
    }
    if (target.doc.hasLogo && !force) {
      unmatched.push({ name: crop.name, crop, doc: target.doc, reason: "logo already set (use --force to replace)" });
      continue;
    }
    claimed.add(target.doc._id);
    planned.push({ crop, doc: target.doc, via: target.via });
  }
  return { planned, unmatched };
}

/**
 * Write EVERY crop to disk for review, split so the top level is exactly what
 * a real run would upload. The two subfolders hold the rest, because "why is
 * this logo missing from the site" is a question the dry run should be able to
 * answer without re-running anything.
 */
export function writeCrops(outDir, planned, unmatched) {
  const dirs = {
    planned: outDir,
    hasLogo: join(outDir, "_already-has-logo"),
    noMatch: join(outDir, "_unmatched"),
  };
  const counts = { planned: 0, hasLogo: 0, noMatch: 0, total: 0 };
  const used = new Map();

  const put = (bucket, doc, crop) => {
    mkdirSync(dirs[bucket], { recursive: true });
    const name = cropFileName(doc, crop);
    // Two rows resolving to one name is itself reportable; don't let the
    // second silently overwrite the first's picture.
    const key = `${bucket}/${name}`;
    const seen = (used.get(key) ?? 0) + 1;
    used.set(key, seen);
    writeFileSync(join(dirs[bucket], seen > 1 ? name.replace(/(\.[^.]+)$/, `-${seen}$1`) : name), crop.bytes);
    counts[bucket]++;
    counts.total++;
  };

  for (const { crop, doc } of planned) put("planned", doc, crop);
  for (const { crop, doc } of unmatched) {
    if (!crop) continue;
    put(doc ? "hasLogo" : "noMatch", doc, crop);
  }
  return counts;
}

/** Upload each planned crop and patch its document's `logo`. */
async function uploadPlan(env, planned) {
  const mutations = [];
  const attached = [];
  for (const { crop, doc } of planned) {
    const asset = await sanityUploadImage(env, crop.bytes, {
      filename: cropFileName(doc, crop),
      contentType: crop.contentType,
    });
    mutations.push({ patch: { id: doc._id, set: { logo: { _type: "image", asset: { _type: "reference", _ref: asset._id } } } } });
    attached.push({ company: doc.company, list: crop.name });
    process.stdout.write(`  ✓ ${doc.company}\r`);
  }
  return { mutations, attached };
}

/** The closing report, identical for both formats. */
function report(attached, unmatched) {
  console.log(`\n\n${attached.length} logos attached · ${unmatched.length} skipped`);
  if (attached.length) {
    console.log("\nAttached:");
    for (const a of attached) console.log(`  • ${a.company}${a.list !== a.company ? `  (list name: "${a.list}")` : ""}`);
  }
  if (unmatched.length) {
    console.log("\nSkipped:");
    for (const s of unmatched.slice(0, 40)) console.log(`  • ${s.name} — ${s.reason}`);
    if (unmatched.length > 40) console.log(`  … and ${unmatched.length - 40} more`);
  }
}

/**
 * Load the declared alias file for the matcher.
 *
 * A structural problem here is reported and the run continues: logos are
 * cosmetic, and refusing to attach 160 good ones over a typo in a file that
 * concerns ten would be the wrong trade. A declaration pointing at a slug no
 * document has surfaces per-name in the skipped list instead.
 */
function loadDeclared() {
  const { byIncoming, errors, displayPath } = loadUnlistedAliases();
  if (errors.length) {
    console.log(`\nWarning: ${displayPath} has problems. Matching continues without the broken entries:`);
    for (const e of errors) console.log(`  • ${e}`);
  }
  return byIncoming;
}

// ═══════════════════ Excel: the embedded images ═══════════════════

/**
 * Trim uniform white borders off an embedded logo.
 *
 * Deliberately conservative. These marks arrive small — roughly 40 to 168px
 * wide, median 84 — and at exactly the size they should be published at, so
 * nothing here scales anything: upscaling a 40px mark only makes it blurry.
 * When there is no border to remove, the partner's own bytes are handed back
 * untouched rather than re-encoded through a second round of JPEG loss.
 *
 * Returns { bytes, contentType, extension, width, height, trimmed }, or
 * { blank } / { tooSmall, width, height } for an image not worth publishing.
 */
export async function trimUniformWhiteBorder(bytes, mediaPath) {
  await loadCanvas();
  const ext = mediaPath.split(".").pop().toLowerCase();
  const contentType = MEDIA_TYPES[ext] ?? "image/jpeg";

  const img = await loadImage(bytes);
  const w = img.width, h = img.height;
  if (!w || !h) return { blank: true };

  const canvas = createCanvas(w, h);
  const ctx = canvas.getContext("2d");
  ctx.drawImage(img, 0, 0);
  const { data } = ctx.getImageData(0, 0, w, h);

  let minX = w, minY = h, maxX = -1, maxY = -1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      if (data[i + 3] < 8) continue;                                             // transparent
      if (Math.min(data[i], data[i + 1], data[i + 2]) >= WHITE_FLOOR) continue;  // white
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }
  if (maxX < 0) return { blank: true };

  const cw = maxX - minX + 1, ch = maxY - minY + 1;
  if (cw < MIN_LOGO_PX || ch < MIN_LOGO_PX) return { tooSmall: true, width: cw, height: ch };

  // Nothing to trim — upload exactly what the partner embedded.
  if (minX === 0 && minY === 0 && cw === w && ch === h) {
    return { bytes, contentType, extension: ext, width: w, height: h, trimmed: false };
  }

  const out = createCanvas(cw, ch);
  const octx = out.getContext("2d");
  octx.fillStyle = "#ffffff"; // JPEG carries no alpha; keep the white ground
  octx.fillRect(0, 0, cw, ch);
  octx.drawImage(canvas, minX, minY, cw, ch, 0, 0, cw, ch);
  return {
    bytes: contentType === "image/png" ? out.toBuffer("image/png") : out.toBuffer("image/jpeg", JPEG_QUALITY),
    contentType, extension: ext, width: cw, height: ch, trimmed: true,
  };
}

// ═══════════════════ PDF scoring (pure, shared with the tests) ═══════════════════

/**
 * Keep a crop unless it's near-blank or the partner's monogram placeholder.
 * A placeholder is a SOLID pale-gray rounded square (fills the cell, almost no
 * colours, almost no saturation); a real logo — colourful OR a black wordmark
 * / thin line-art emblem on white — never matches all three. Validated against
 * the real list: separates 63Sats/Aegeus/Airlife placeholders from real logos
 * while keeping monochrome marks (Apollo Fashion, Amol Minechem).
 */
export const isPlaceholder = (s) => s.fillFrac >= 0.12 && s.distinctColors <= 12 && s.meanSat <= 16;
export const isRealLogo = (s) => s.fillFrac >= 0.015 && !isPlaceholder(s);

// ═══════════════════════════════ RUN ═══════════════════════════════
// Only when invoked directly — importing this module must read no file, load
// no native dependency and touch no Sanity.
if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {

// ---------- args ----------
const args = { dryRun: false, force: false, scale: 4, out: "unlisted-logos" };
for (const a of process.argv.slice(2)) {
  if (a === "--dry-run") args.dryRun = true;
  else if (a === "--force") args.force = true;
  else if (a.startsWith("--scale=")) args.scale = Number(a.slice(8)) || 4; // PDF only
  else if (a.startsWith("--out=")) args.out = a.slice(6).trim();
  else if (a === "--help" || a === "-h") { console.log("See the header of scripts/extract-unlisted-logos.mjs for usage."); process.exit(0); }
  else if (!a.startsWith("--")) args.file = a;
  else { console.error(`Unknown flag ${a}`); process.exit(1); }
}
if (!args.file) {
  console.error("Usage: node scripts/extract-unlisted-logos.mjs <pricelist.xlsx|pricelist.pdf> [--dry-run] [--force]");
  process.exit(1);
}
const filePath = resolve(args.file);
if (!existsSync(filePath)) { console.error(`No such file: ${args.file}`); process.exit(1); }
const isXlsx = /^\.xls[xm]$/.test(extname(filePath).toLowerCase());

// ---------- env (dry-run may run without it) ----------
loadDotEnvLocal();
const hasEnv = !!(process.env.NEXT_PUBLIC_SANITY_PROJECT_ID && process.env.SANITY_API_TOKEN);
if (!hasEnv && !args.dryRun) requireSanityEnv();
const env = hasEnv ? requireSanityEnv() : null;

try {
  await loadCanvas();
} catch (err) {
  console.error(err.message);
  process.exit(1);
}

if (isXlsx) {
  let book;
  try {
    book = readUnlistedXlsx(filePath);
  } catch (err) {
    console.error(`\nABORTED — ${args.file} could not be read as an Excel price list.\n\n  ${err.message}\n`);
    process.exit(1);
  }

  // The workbook states which row each image sits on, so the logo and the
  // company are joined on (sheet, row) — no pixel geometry is consulted. This
  // is also the confidentiality boundary: `paired` carries names and bytes,
  // and the price columns do not cross it.
  const { paired, orphans, missing } = joinLogosToRows(book);

  console.log(
    `${args.file}\n${book.rows.length} priced rows across ${book.sheetsRead.length} sheets · ` +
    `${book.logos.length} embedded logos · ${paired.length} sit on a priced row`,
  );

  const crops = [];
  const rejected = []; // { name, reason }
  for (const logo of paired) {
    let image;
    try {
      image = await trimUniformWhiteBorder(logo.bytes, logo.mediaPath);
    } catch (err) {
      rejected.push({ name: logo.name, reason: `image could not be decoded (${err.message})` });
      continue;
    }
    if (image.blank) { rejected.push({ name: logo.name, reason: "image is blank after trimming white" }); continue; }
    if (image.tooSmall) {
      rejected.push({ name: logo.name, reason: `${image.width}×${image.height} after trimming — under the ${MIN_LOGO_PX}px floor` });
      continue;
    }
    crops.push({ ...image, name: logo.name });
  }

  const trimmedCount = crops.filter((c) => c.trimmed).length;
  console.log(`${crops.length} usable (${trimmedCount} had white borders trimmed, ${crops.length - trimmedCount} uploaded as-is)`);
  for (const o of orphans) console.log(`  note: an image on ${o.sheet} row ${o.row} sits on no priced row — ignored`);

  if (crops.length === 0) { console.error("\nNo usable logos found — is this the partner's price-list workbook?"); process.exit(1); }

  // ---------- match ----------
  if (!env) console.log("\n(no Sanity env — crops are written for review, but nothing can be matched or uploaded)");
  const declared = env ? loadDeclared() : null;
  const existing = env ? await sanityQuery(env, EXISTING_QUERY) : [];
  const { planned, unmatched } = env
    ? planAttachments(crops, existing, { force: args.force, declared })
    : { planned: crops.map((crop) => ({ crop, doc: null })), unmatched: [] };

  const viaDeclared = planned.filter((p) => p.via === "declared").length;
  if (viaDeclared) console.log(`\n${viaDeclared} matched through ${ALIASES_DISPLAY_PATH} rather than a heuristic.`);

  // Companies the file simply has no logo for. Not a failure — the card falls
  // back to our own monogram, which is the designed behaviour.
  if (missing.length) {
    console.log(`\n${missing.length} priced companies have no logo in this file — they keep the monogram fallback:`);
    for (const name of missing.slice(0, 40)) console.log(`  • ${name}`);
    if (missing.length > 40) console.log(`  … and ${missing.length - 40} more`);
  }

  // ---------- dry run: write the crops for review ----------
  if (args.dryRun || !env) {
    const outDir = resolve(args.out);
    const written = writeCrops(outDir, planned, unmatched);
    console.log(
      `\n--dry-run: wrote ${written.total} crops to ${outDir}/ — open it in Finder and flip through before uploading.\n` +
      `  ${outDir}/                     ${written.planned} that WILL be uploaded, named <slug>.<ext>\n` +
      (written.hasLogo ? `  ${outDir}/_already-has-logo/   ${written.hasLogo} whose document already has one (--force replaces them)\n` : "") +
      (written.noMatch ? `  ${outDir}/_unmatched/          ${written.noMatch} that match no document, named from the list\n` : ""),
    );
    if (unmatched.length) {
      console.log(`${unmatched.length} logos will NOT be uploaded:`);
      for (const s of unmatched.slice(0, 40)) console.log(`  • ${s.name} — ${s.reason}`);
      if (unmatched.length > 40) console.log(`  … and ${unmatched.length - 40} more`);
    }
    if (rejected.length) {
      console.log(`\n${rejected.length} images were rejected on size or content (no file written):`);
      for (const r of rejected) console.log(`  • ${r.name} — ${r.reason}`);
    }
    console.log("\nRe-run without --dry-run (with Sanity env) to upload and attach them.");
    process.exit(0);
  }

  // ---------- upload ----------
  const { mutations, attached } = await uploadPlan(env, planned);
  report(attached, [...unmatched, ...rejected]);

  if (mutations.length === 0) { console.log("\nNothing to write."); process.exit(0); }
  await sanityMutate(env, mutations);
  console.log(`\nWrote ${mutations.length} logo references to Sanity (${env.projectId}/${env.dataset}).`);
  console.log("The unlisted-shares page shows the logos on its next revalidation (≤1h) or deploy.");
  process.exit(0);
}

// ═══════════════════ PDF: render, OCR, crop ═══════════════════

// ---------- deps ----------
let PDFParse, createWorker, OEM;
try {
  ({ PDFParse } = await import("pdf-parse"));
  ({ createWorker, OEM } = await import("tesseract.js"));
} catch {
  console.error("Logo extraction from a PDF needs pdf-parse, tesseract.js and @tesseract.js-data/eng.\nThey're in devDependencies — run: npm install");
  process.exit(1);
}
const langDir = require.resolve("@tesseract.js-data/eng/package.json").replace(/package\.json$/, "4.0.0");
const median = (a) => { const s = [...a].sort((x, y) => x - y); return s.length ? s[Math.floor(s.length / 2)] : 0; };
const pageBuffer = (p) => p.nodeBuffer ?? (p.dataUrl ? Buffer.from(p.dataUrl.split(",")[1], "base64") : null);

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
const crops = []; // { name, bytes, contentType, extension }
for (const pg of pages) {
  const img = await loadImage(pg.buf);
  const ctx = createCanvas(pg.width, pg.height).getContext("2d");
  ctx.drawImage(img, 0, 0);
  for (const row of pg.rows) {
    const res = cropLogo(ctx, pg.width, pg.pitch, row);
    if (res?.png) crops.push({ name: row.name, bytes: res.png, contentType: "image/png", extension: "png" });
  }
}
console.log(`\n${crops.length} real logos cropped from ${allNameStartX.length} rows (placeholders and blanks skipped).`);

// ---------- dry-run: write crops locally, no Sanity ----------
if (args.dryRun || !env) {
  const outDir = resolve(args.out);
  mkdirSync(outDir, { recursive: true });
  crops.forEach((c, i) => writeFileSync(join(outDir, `${String(i + 1).padStart(3, "0")}-${slugify(c.name)}.png`), c.bytes));
  console.log(`\n--dry-run: wrote ${crops.length} crops to ${outDir}/ for review. No Sanity writes.`);
  if (!env && !args.dryRun) console.log("(no Sanity env found — nothing could be uploaded anyway)");
  console.log("Re-run without --dry-run (with Sanity env) to upload and attach them.");
  process.exit(0);
}

// ---------- match to existing docs, upload, attach ----------
const existing = await sanityQuery(env, EXISTING_QUERY);
const { planned, unmatched } = planAttachments(crops, existing, { force: args.force, declared: loadDeclared() });
const { mutations, attached } = await uploadPlan(env, planned);
report(attached, unmatched);

if (mutations.length === 0) { console.log("\nNothing to write."); process.exit(0); }
await sanityMutate(env, mutations);
console.log(`\nWrote ${mutations.length} logo references to Sanity (${env.projectId}/${env.dataset}).`);
console.log("The unlisted-shares page shows the logos on its next revalidation (≤1h) or deploy.");

}
