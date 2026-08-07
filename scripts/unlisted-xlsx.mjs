/**
 * Native .xlsx reader for the partner's unlisted-shares price list.
 *
 * The partner switched from a designed PDF to an Excel workbook on
 * 06-Aug-2026. That removes the whole OCR gamble — retail price, dealer price,
 * depository and lot size are separate CELLS with separate HEADERS, so the
 * columns can no longer fuse into each other the way they did on 31-Jul-2026.
 *
 * ── CONFIDENTIALITY ────────────────────────────────────────────────────────
 * Column E of the workbook is "Dealer Price" and must never be read, stored,
 * logged or printed. Two structural defences, in this order:
 *
 *   1. mapCsvHeader (unlisted-matching.mjs) identifies dealer/cost/buy columns
 *      only in order to EXCLUDE them — their index is never returned, so this
 *      module has no way to address that column;
 *   2. assertRetailPriceColumn then requires the column that WAS selected to
 *      carry a /retail/i header. A renamed header or a header row detected one
 *      row off would otherwise leave a single plausible "price" column and no
 *      way to tell it was the wrong one. Failing that check aborts the read.
 *
 * Every column mapCsvHeader did not map is then DELETED from the parsed grid
 * before a single data row is read, so the dealer price is not merely
 * unaddressed — it is not in memory. Nothing below can quote it in a row, a
 * skip reason or a warning, because by then there is nothing to quote.
 * ───────────────────────────────────────────────────────────────────────────
 *
 * No dependencies: an .xlsx is a zip of XML parts, and Node ships both the
 * inflater and everything else needed. Nothing here is a general-purpose
 * spreadsheet reader — it reads the parts of OOXML this one list uses, and
 * says so loudly when the file isn't shaped the way it expects.
 *
 *   import { readUnlistedXlsx } from "./unlisted-xlsx.mjs";
 *   const { asOnRaw, rows, logos, sheetsRead } = readUnlistedXlsx(path);
 */

import { readFileSync } from "node:fs";
import { inflateRawSync } from "node:zlib";
import {
  mapCsvHeader, assertRetailPriceColumn, parseInr, classifyDepository,
  sanitizeListText, findHeaderDate, PRICE_MIN_EXCL, PRICE_MAX_EXCL,
} from "./unlisted-matching.mjs";

// ═══════════════ zip container ═══════════════

const SIG_LOCAL = 0x04034b50;
const SIG_CENTRAL = 0x02014b50;
const SIG_EOCD = 0x06054b50;

/**
 * Index a zip's central directory → Map(path → { method, compSize, offset }).
 *
 * The central directory is the authority on sizes, never the local header: a
 * streaming writer is allowed to leave the local header's sizes at zero and
 * put them in a trailing data descriptor instead.
 */
function readZipIndex(buf) {
  let eocd = -1;
  const floor = Math.max(0, buf.length - 66_000); // 22-byte record + 64K comment
  for (let i = buf.length - 22; i >= floor; i--) {
    if (buf.readUInt32LE(i) === SIG_EOCD) { eocd = i; break; }
  }
  if (eocd === -1) throw new Error("this is not a zip archive (no end-of-central-directory record) — an .xlsx always is one");

  const count = buf.readUInt16LE(eocd + 10);
  const cdOffset = buf.readUInt32LE(eocd + 16);
  if (count === 0xffff || cdOffset === 0xffffffff) {
    throw new Error("ZIP64 workbooks are not supported — re-save the file from Excel, or ask the partner for a smaller export");
  }

  const entries = new Map();
  let p = cdOffset;
  for (let i = 0; i < count; i++) {
    if (p + 46 > buf.length || buf.readUInt32LE(p) !== SIG_CENTRAL) {
      throw new Error(`corrupt zip: central directory entry ${i + 1} of ${count} is malformed`);
    }
    const nameLen = buf.readUInt16LE(p + 28);
    entries.set(buf.toString("utf8", p + 46, p + 46 + nameLen), {
      method: buf.readUInt16LE(p + 10),
      compSize: buf.readUInt32LE(p + 20),
      offset: buf.readUInt32LE(p + 42),
    });
    p += 46 + nameLen + buf.readUInt16LE(p + 30) + buf.readUInt16LE(p + 32);
  }
  return entries;
}

/** Raw bytes of one zip entry, or null when the archive has no such part. */
function entryBytes(buf, entries, path) {
  const e = entries.get(path);
  if (!e) return null;
  if (buf.readUInt32LE(e.offset) !== SIG_LOCAL) throw new Error(`corrupt zip: bad local header for ${path}`);
  const start = e.offset + 30 + buf.readUInt16LE(e.offset + 26) + buf.readUInt16LE(e.offset + 28);
  const raw = buf.subarray(start, start + e.compSize);
  if (e.method === 0) return raw;          // stored
  if (e.method === 8) return inflateRawSync(raw); // deflate — what Excel writes
  throw new Error(`${path} uses zip compression method ${e.method}, which this reader can't decompress`);
}

// ═══════════════ OOXML plumbing ═══════════════

// Namespace prefixes in OOXML are declared per file, not fixed by the spec, so
// every tag pattern below tolerates any prefix (or none).
const NS = "(?:[A-Za-z0-9_.-]+:)?";
const tagRe = (tag, flags = "") =>
  new RegExp(`<${NS}${tag}\\b([^>]*?)(?:/>|>([\\s\\S]*?)</${NS}${tag}>)`, flags);

const XML_ENTITIES = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'" };

function decodeXml(s) {
  return String(s).replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z]+);/g, (whole, ent) => {
    if (ent[0] !== "#") return XML_ENTITIES[ent] ?? whole;
    const code = /^#x/i.test(ent) ? parseInt(ent.slice(2), 16) : parseInt(ent.slice(1), 10);
    return Number.isFinite(code) && code >= 0 && code <= 0x10ffff ? String.fromCodePoint(code) : whole;
  });
}

const attrOf = (attrs, name) => {
  const m = attrs.match(new RegExp(`\\b${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}="([^"]*)"`));
  return m ? decodeXml(m[1]) : null;
};

const T_RE = tagRe("t", "g");
const V_RE = tagRe("v");
const SI_RE = tagRe("si", "g");
const ROW_RE = tagRe("row", "g");
const CELL_RE = tagRe("c", "g");
const FROM_RE = tagRe("from");
const ANCHOR_ROW_RE = new RegExp(`<${NS}row>\\s*(\\d+)\\s*</${NS}row>`);
const CELL_REF_RE = /\br="([^"]*)"/;
const CELL_TYPE_RE = /\bt="([^"]*)"/;
const EMBED_RE = /\br:embed="([^"]+)"/;

/** Concatenate every <t> in a fragment — shared strings split into rich-text
 *  runs put one <t> per run, and the company name is all of them joined. */
function joinText(xml) {
  let out = "";
  for (const m of String(xml).matchAll(T_RE)) out += decodeXml(m[2] ?? "");
  return out;
}

/** ".../_rels/<part>.rels" for a package part. */
function relsPathFor(part) {
  const cut = part.lastIndexOf("/") + 1;
  return `${part.slice(0, cut)}_rels/${part.slice(cut)}.rels`;
}

/** Resolve a relationship Target against the part that declared it.
 *  ("xl/drawings/drawing1.xml", "../media/image1.jpeg") → "xl/media/image1.jpeg" */
function resolvePart(basePart, target) {
  if (target.startsWith("/")) return target.slice(1);
  const dir = basePart.slice(0, basePart.lastIndexOf("/") + 1);
  const out = [];
  for (const seg of `${dir}${target}`.split("/")) {
    if (seg === "" || seg === ".") continue;
    if (seg === "..") out.pop();
    else out.push(seg);
  }
  return out.join("/");
}

/** A .rels part → Map(Id → { target, type, external }). */
function parseRels(xml) {
  const out = new Map();
  for (const m of String(xml).matchAll(/<Relationship\b([^>]*?)\/?>/g)) {
    const id = attrOf(m[1], "Id");
    const target = attrOf(m[1], "Target");
    if (!id || !target) continue;
    out.set(id, { target, type: attrOf(m[1], "Type") ?? "", external: attrOf(m[1], "TargetMode") === "External" });
  }
  return out;
}

/** workbook.xml → [{ name, rid }] in the workbook's own tab order. */
function parseWorkbookSheets(xml) {
  const out = [];
  for (const m of String(xml).matchAll(new RegExp(`<${NS}sheet\\b([^>]*?)/?>`, "g"))) {
    const name = attrOf(m[1], "name");
    const rid = attrOf(m[1], "r:id") ?? attrOf(m[1], "id");
    if (name && rid) out.push({ name, rid });
  }
  return out;
}

/** sharedStrings.xml → the string table, by index. */
function parseSharedStrings(xml) {
  const out = [];
  for (const m of String(xml).matchAll(SI_RE)) out.push(m[2] ? joinText(m[2]) : "");
  return out;
}

/** "B12" → 1 (zero-based column index). */
function columnIndex(ref) {
  let n = 0;
  for (const ch of String(ref)) {
    const c = ch.toUpperCase();
    if (c < "A" || c > "Z") break;
    n = n * 26 + (c.charCodeAt(0) - 64);
  }
  return n - 1;
}

/**
 * A worksheet part → Map(1-based Excel row → Map(0-based column → text)).
 * Every value comes back as a string; the callers parse what they need.
 */
function parseWorksheet(xml, shared) {
  const grid = new Map();
  let auto = 0;
  for (const rm of String(xml).matchAll(ROW_RE)) {
    const rowNum = Number(attrOf(rm[1], "r")) || ++auto;
    auto = Math.max(auto, rowNum);
    const body = rm[2];
    if (!body) continue;

    const cells = new Map();
    for (const cm of body.matchAll(CELL_RE)) {
      const ref = cm[1].match(CELL_REF_RE)?.[1];
      if (!ref) continue;
      const col = columnIndex(ref);
      if (col < 0) continue;
      const type = cm[1].match(CELL_TYPE_RE)?.[1] ?? "n";
      const cellBody = cm[2] ?? "";

      let value = "";
      if (type === "inlineStr") {
        value = joinText(cellBody);
      } else {
        const v = cellBody.match(V_RE)?.[2];
        if (v != null) {
          if (type === "s") value = shared[Number(decodeXml(v))] ?? "";
          else if (type === "b") value = decodeXml(v) === "1" ? "TRUE" : "FALSE";
          else if (type === "e") value = ""; // #N/A and friends read as empty
          else value = decodeXml(v);
        }
      }
      if (value !== "") cells.set(col, value);
    }
    if (cells.size) grid.set(rowNum, cells);
  }
  return grid;
}

/**
 * Image anchors in a drawing part → [{ row, embed }], `row` still ZERO-BASED
 * exactly as the file states it.
 *
 * Anchors without an r:embed are the list's background shapes and rules, not
 * pictures, and are skipped. An anchor with no <from><row> (an absoluteAnchor)
 * can't be tied to a data row and is skipped too.
 */
function parseDrawingAnchors(xml) {
  const out = [];
  const re = new RegExp(`<${NS}(oneCellAnchor|twoCellAnchor)\\b[^>]*>([\\s\\S]*?)</${NS}\\1>`, "g");
  for (const m of String(xml).matchAll(re)) {
    const embed = m[2].match(EMBED_RE)?.[1];
    if (!embed) continue;
    const from = m[2].match(FROM_RE)?.[2];
    const row = from?.match(ANCHOR_ROW_RE)?.[1];
    if (row === undefined) continue;
    out.push({ row: Number(row), embed });
  }
  return out;
}

// ═══════════════ the price list ═══════════════

/** Column A's header on the partner's sheets. Not mapped by mapCsvHeader
 *  (which only cares about the four columns that carry data we publish). */
const SNO_HEADER_RE = /^(?:#|s\.?\s*no\.?|sr\.?\s*no\.?|serial(?:\s*(?:no|number))?\.?|sno|no\.?)$/i;

/** How many opening rows to scan for the header. The partner has moved it
 *  before (it is row 2 today), so it is found, never assumed. */
const HEADER_SCAN_ROWS = 5;

/**
 * The sheet's header row number, or null when this sheet holds no price data.
 * A data sheet is one whose opening rows carry a "Share Name" cell — this is
 * what separates the workbook's 7 data sheets from its 14 cover/notes sheets
 * without hardcoding a single sheet name.
 */
function findHeaderRow(grid) {
  for (const rowNum of [...grid.keys()].sort((a, b) => a - b).slice(0, HEADER_SCAN_ROWS)) {
    for (const value of grid.get(rowNum).values()) {
      if (/share\s*name/i.test(value)) return rowNum;
    }
  }
  return null;
}

/** The header row as a dense array, so a column with a BLANK header (column B
 *  holds the logos and has no title) still occupies its own index. */
function headerCellsOf(grid, headerRow) {
  let maxCol = -1;
  for (const cells of grid.values()) for (const col of cells.keys()) if (col > maxCol) maxCol = col;
  const header = grid.get(headerRow);
  return Array.from({ length: maxCol + 1 }, (_, i) => sanitizeListText(header.get(i) ?? "").text);
}

/**
 * Read the partner's Excel price list.
 *
 * Returns:
 *   asOnRaw   the list's "As on …" date, as the raw date string
 *             (normalizeIsoDate turns it into zero-padded ISO)
 *   rows      [{ sno, name, price, depository?, lotSize?, sheet, row }] —
 *             `row` is the 1-based Excel row, for spot-checks against the file
 *   logos     [{ sheet, row, mediaPath, bytes }] — one per row at most,
 *             gathered for the logo pass; NOT consumed by the price importer
 *   sheetsRead  [{ name, part, headerRow, rowCount }] for every sheet that
 *             carries a "Share Name" header, whether or not it yielded rows
 *   skipped   [{ line, reason }] per-row diagnostics, same shape as the CSV path
 *   sanitised / unmapped / depositoryNotes / warnings — things a human should
 *             look at before the run is trusted
 */
export function readUnlistedXlsx(filePath) {
  return readUnlistedXlsxBytes(readFileSync(filePath), filePath);
}

/** readUnlistedXlsx against bytes already in hand (used by the self-test,
 *  which builds workbooks in memory rather than on disk). */
export function readUnlistedXlsxBytes(bytes, label = "workbook") {
  const buf = Buffer.isBuffer(bytes) ? bytes : Buffer.from(bytes);
  const entries = readZipIndex(buf);
  const partText = (path) => {
    const b = entryBytes(buf, entries, path);
    return b === null ? null : b.toString("utf8");
  };

  // ---------- workbook + its relationships ----------
  let workbookPath = null;
  const rootRels = partText("_rels/.rels");
  if (rootRels) {
    for (const rel of parseRels(rootRels).values()) {
      if (/officeDocument$/.test(rel.type) && !rel.external) { workbookPath = resolvePart("", rel.target); break; }
    }
  }
  if (!workbookPath && entries.has("xl/workbook.xml")) workbookPath = "xl/workbook.xml";
  const workbookXml = workbookPath ? partText(workbookPath) : null;
  if (!workbookXml) throw new Error(`${label}: no workbook part found — this doesn't look like an Excel file`);

  const workbookRels = parseRels(partText(relsPathFor(workbookPath)) ?? "");
  const sheetDefs = parseWorkbookSheets(workbookXml);
  if (sheetDefs.length === 0) throw new Error(`${label}: the workbook declares no sheets`);

  // ---------- shared strings ----------
  let sharedPath = null;
  for (const rel of workbookRels.values()) {
    if (/sharedStrings$/.test(rel.type) && !rel.external) { sharedPath = resolvePart(workbookPath, rel.target); break; }
  }
  sharedPath ??= "xl/sharedStrings.xml";
  const sharedXml = partText(sharedPath);
  const shared = sharedXml ? parseSharedStrings(sharedXml) : [];

  // ---------- "As on 06 Aug 2026" ----------
  let asOnRaw = null;
  for (const s of shared) {
    if (!/as\s+on\b/i.test(s)) continue;
    const found = findHeaderDate(sanitizeListText(s).text);
    if (found) { asOnRaw = found; break; }
  }

  const rows = [];
  const logos = [];
  const skipped = [];
  const sheetsRead = [];
  const sanitised = [];        // { codepoint, to, count, confirm, sheet, row, name }
  const unmapped = [];         // { codepoint, sheet, row, name }
  const depositoryNotes = [];  // { kind, sheet, row, name, raw, value? }
  const warnings = [];

  for (const def of sheetDefs) {
    // r:id → part. The rId numbering and the sheetN.xml numbering are
    // independent: sheet order in the workbook says nothing about which file
    // holds which tab, so the relationship is always followed.
    const rel = workbookRels.get(def.rid);
    if (!rel || rel.external) { warnings.push(`sheet "${def.name}" points at relationship ${def.rid}, which the workbook doesn't define`); continue; }
    const part = resolvePart(workbookPath, rel.target);
    const sheetXml = partText(part);
    if (sheetXml === null) { warnings.push(`sheet "${def.name}" → ${part}, which is missing from the workbook`); continue; }

    const grid = parseWorksheet(sheetXml, shared);
    const headerRow = findHeaderRow(grid);
    if (headerRow === null) continue; // cover page, notes, disclaimers…

    const headerCells = headerCellsOf(grid, headerRow);
    const map = mapCsvHeader(headerCells);
    if (map.error) throw new Error(`${label}, sheet "${def.name}": ${map.error}`);
    // Confidentiality lock — see the module header. Throws rather than reads.
    assertRetailPriceColumn(headerCells, map.price, `${label}, sheet "${def.name}"`);
    const snoIdx = headerCells.findIndex((h) => SNO_HEADER_RE.test(h.trim()));

    // Only these columns are ever addressed. "Dealer Price" has no mapping, so
    // nothing below can reach it, and no value from it survives this loop.
    const mapped = [snoIdx, map.name, map.price, map.depository, map.lot].filter((i) => i !== undefined && i >= 0);

    // …and every other column is dropped from the grid right here, before a
    // single data row is read. After this the dealer price is not merely
    // unaddressed, it is not in memory: no later edit to the loop below can
    // reach it by accident, and nothing it could print exists to be printed.
    const allowed = new Set(mapped);
    for (const cells of grid.values()) {
      for (const col of [...cells.keys()]) if (!allowed.has(col)) cells.delete(col);
    }

    let rowCount = 0;
    for (const rowNum of [...grid.keys()].filter((n) => n > headerRow).sort((a, b) => a - b)) {
      const cells = grid.get(rowNum);
      // A row that is blank across every mapped column is a spacer, not a
      // failed row — skipping it silently keeps the diagnostics readable.
      if (!mapped.some((i) => String(cells.get(i) ?? "").trim() !== "")) continue;

      const cleaned = sanitizeListText(cells.get(map.name) ?? "");
      const name = cleaned.text;
      for (const sub of cleaned.substitutions) sanitised.push({ ...sub, sheet: def.name, row: rowNum, name });
      for (const codepoint of cleaned.unmapped) unmapped.push({ codepoint, sheet: def.name, row: rowNum, name });

      const line = `${def.name} row ${rowNum}: ${name || "(blank)"}`;
      if (!name) { skipped.push({ line, reason: "blank company name" }); continue; }

      const rawPrice = String(cells.get(map.price) ?? "").trim();
      const price = parseInr(rawPrice);
      if (price === null) { skipped.push({ line, reason: `unreadable retail price "${rawPrice.slice(0, 24)}"` }); continue; }
      if (!(price > PRICE_MIN_EXCL && price < PRICE_MAX_EXCL)) {
        skipped.push({ line, reason: `retail price ${price} outside (0, 50L)` });
        continue;
      }

      const lotRaw = map.lot !== undefined ? String(cells.get(map.lot) ?? "").trim() : "";
      const lot = lotRaw ? parseInr(lotRaw) : undefined;
      if (lot !== undefined && (lot === null || !Number.isInteger(lot) || lot < 1)) {
        skipped.push({ line, reason: `lot size "${lotRaw}" isn't a whole number ≥ 1` });
        continue;
      }

      let depository;
      if (map.depository !== undefined) {
        const rawDepo = String(cells.get(map.depository) ?? "").trim();
        const verdict = classifyDepository(rawDepo);
        depository = verdict.value;
        if (verdict.unrecognised) depositoryNotes.push({ kind: "unrecognised", sheet: def.name, row: rowNum, name, raw: rawDepo });
        else if (verdict.typo) depositoryNotes.push({ kind: "typo", sheet: def.name, row: rowNum, name, raw: rawDepo, value: verdict.value });
      }

      const snoRaw = snoIdx >= 0 ? String(cells.get(snoIdx) ?? "").trim() : "";
      rows.push({
        sno: snoRaw ? (parseInr(snoRaw) ?? snoRaw) : undefined,
        name,
        price,
        ...(depository ? { depository } : {}),
        ...(lot !== undefined ? { lotSize: lot } : {}),
        sheet: def.name,
        row: rowNum,
      });
      rowCount++;
    }

    sheetsRead.push({ name: def.name, part, headerRow, rowCount });

    // ---------- logo anchors (gathered, not consumed) ----------
    const sheetRels = parseRels(partText(relsPathFor(part)) ?? "");
    const claimedRows = new Set();
    for (const drawingRel of sheetRels.values()) {
      if (!/drawing$/.test(drawingRel.type) || drawingRel.external) continue;
      const drawingPart = resolvePart(part, drawingRel.target);
      const drawingXml = partText(drawingPart);
      if (!drawingXml) { warnings.push(`sheet "${def.name}" references ${drawingPart}, which is missing`); continue; }
      const drawingRels = parseRels(partText(relsPathFor(drawingPart)) ?? "");

      for (const anchor of parseDrawingAnchors(drawingXml)) {
        const image = drawingRels.get(anchor.embed);
        if (!image || image.external) continue;
        const mediaPath = resolvePart(drawingPart, image.target);
        const media = entryBytes(buf, entries, mediaPath);
        if (!media) { warnings.push(`sheet "${def.name}": ${mediaPath} is referenced but missing from the workbook`); continue; }
        // <xdr:from><xdr:row> is ZERO-BASED; Excel's own row numbers are not.
        const excelRow = anchor.row + 1;
        if (claimedRows.has(excelRow)) {
          warnings.push(`sheet "${def.name}" row ${excelRow} anchors more than one image — kept the first`);
          continue;
        }
        claimedRows.add(excelRow);
        logos.push({ sheet: def.name, row: excelRow, mediaPath, bytes: Buffer.from(media) });
      }
    }
  }

  if (sheetsRead.length === 0) {
    throw new Error(
      `${label}: none of the ${sheetDefs.length} sheets has a "Share Name" header, so none of them is a price list. ` +
      `Is this the right file?`,
    );
  }

  return {
    asOnRaw, rows, logos, sheetsRead, skipped,
    sanitised, unmapped, depositoryNotes, warnings,
    sheetCount: sheetDefs.length,
  };
}
