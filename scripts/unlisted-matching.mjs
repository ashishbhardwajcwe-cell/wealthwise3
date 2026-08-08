/**
 * Pure parsing + matching helpers for the unlisted-shares price importer
 * (scripts/import-unlisted-prices.mjs). Kept side-effect free — same pattern
 * as pms-matching.mjs — so the tricky bits are unit-testable.
 *
 * CONFIDENTIALITY: the partner's price list carries a DEALER (cost) price
 * next to the retail price. Nothing in this module captures, returns, or
 * prints it — the row parsers extract retail price, depository and lot size
 * and structurally discard everything else. Keep it that way; the Sanity
 * dataset these rows land in is publicly readable.
 */

/** Bounds for a plausible per-share retail price (₹). */
export const PRICE_MIN_EXCL = 0;
export const PRICE_MAX_EXCL = 5_000_000;

// ─── text sanitising ────────────────────────────────────────────────
//
// The partner's Excel workbook is a conversion of their PDF, and the converter
// carried the PDF font's LIGATURE GLYPHS across as codepoints instead of the
// letters they stand for. Two of the three land in the Unicode private-use
// area, where they mean whatever the original font said they meant and nothing
// at all anywhere else — so they have to be mapped explicitly, from the names
// they were observed in, rather than guessed at.

/**
 * Ligature codepoint → the letters it stands for on the partner's list.
 * `confirm` marks a mapping with only ONE observed instance: it is reported
 * separately on every run so it can be checked against the partner's PDF
 * before the repaired name is trusted.
 */
export const LIGATURE_SUBSTITUTIONS = [
  // U+FB01 is the real Unicode "ﬁ" ligature (Elofic, Indofil, Market
  // Simplified, SMILE Microfinance). NFKC would expand it on its own; it is
  // listed here so the substitution is counted and logged like the others.
  { char: "\uFB01", to: "fi", confirm: false },
  // Private use. Bolzen and Mutter, Calcutta Stock Exchange, Ramaraju
  // Surgical Cotton Mills — all three read as "tt".
  { char: "\uE009", to: "tt", confirm: false },
  // Private use, ONE instance: "Ei<U+E007>il Water Infra" → "Eiffil".
  { char: "\uE007", to: "ff", confirm: true },
];

/** Unicode private-use areas — codepoints with no meaning outside their font. */
const PRIVATE_USE_RE = /[\uE000-\uF8FF]|[\u{F0000}-\u{FFFFD}]|[\u{100000}-\u{10FFFD}]/gu;

/** "U+E007" for a character, for logs and flags. */
const codepointLabel = (ch) => `U+${ch.codePointAt(0).toString(16).toUpperCase().padStart(4, "0")}`;

/**
 * Clean one string read off the partner's list: expand the known ligature
 * codepoints, NFKC-normalise, collapse whitespace.
 *
 * Returns { text, substitutions, unmapped }:
 *  - `substitutions` is one entry per codepoint actually replaced, so the
 *    caller can log every repair it made to a company name;
 *  - `unmapped` lists private-use codepoints still present afterwards. Those
 *    are NOT stripped — a name is a public-facing fact, and silently deleting
 *    a letter from it is worse than showing a glyph that is obviously wrong.
 *    They are reported instead, so a new ligature gets added to the table
 *    above rather than quietly corrupting a company name.
 */
export function sanitizeListText(raw) {
  let text = String(raw ?? "");
  const substitutions = [];

  for (const s of LIGATURE_SUBSTITUTIONS) {
    const parts = text.split(s.char);
    if (parts.length === 1) continue;
    substitutions.push({
      codepoint: codepointLabel(s.char),
      to: s.to,
      count: parts.length - 1,
      confirm: !!s.confirm,
    });
    text = parts.join(s.to);
  }

  const unmapped = [...new Set(text.match(PRIVATE_USE_RE) ?? [])].map(codepointLabel);
  text = text.normalize("NFKC").replace(/\s+/g, " ").trim();
  return { text, substitutions, unmapped };
}

// ─── name normalisation ─────────────────────────────────────────────

/**
 * Normalise a company name for matching: lowercase, punctuation → space,
 * drop the ltd/limited/pvt/private/india suffix words, collapse whitespace.
 * "Tata Capital Ltd." and "TATA CAPITAL LIMITED" both → "tata capital".
 */
export function normalizeCompanyName(raw) {
  return String(raw)
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\b(ltd|limited|pvt|private|india)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Trailing "…" / "..." (partner PDFs truncate long names). */
const ELLIPSIS_RE = /(\.{3,}|…)\s*$/;

/** Strip a trailing ellipsis; report whether one was there. */
export function splitEllipsis(raw) {
  const truncated = ELLIPSIS_RE.test(raw);
  return { clean: raw.replace(ELLIPSIS_RE, "").trim(), truncated };
}

// ─── depository ─────────────────────────────────────────────────────

// "SDL & CDSL" is the partner's typo for "NSDL & CDSL" (SK Finance Limited on
// the 06-Aug-2026 list). It is matched here as its own alternative so the text
// row grammar doesn't fall through to the bare "CDSL" alternative and leave
// "SDL & " glued onto the end of the company name.
const DEPOSITORY_RE =
  /(NSDL\s*&(?:AMP;)?\s*CDSL|CDSL\s*&(?:AMP;)?\s*NSDL|SDL\s*&(?:AMP;)?\s*CDSL|ONLY\s+NSDL|NSDL\s+ONLY|ONLY\s+CDSL|CDSL\s+ONLY|NSDL|CDSL)/i;

/** A cell that says "there is no depository here": blank, an em/en dash
 *  ("—", E Trav Tech Limited), "N/A", "nil". Never guessed at. */
const NO_DEPOSITORY_RE = /^(?:n[.\/\s]*a\.?|nil|none|[\s\-–—._]*)$/i;

/**
 * Classify a depository cell. Returns
 *   { value }                       — recognised; `value` is the canonical label
 *   { value: undefined, blank }     — the cell says "none" ("—", "N/A", empty)
 *   { value: undefined, unrecognised } — text we can't read; the caller must
 *                                        report it rather than store a guess
 * and sets `typo` when a spelling had to be repaired to get there.
 *
 * Tolerant of OCR noise ("&CDsSL" → cdssl), hence the s{1,2} in the CDSL test.
 */
export function classifyDepository(raw) {
  const text = String(raw ?? "").trim();
  if (NO_DEPOSITORY_RE.test(text)) return { value: undefined, blank: true };

  const letters = text.toLowerCase().replace(/[^a-z]/g, "");
  // A bare "sdl" is "nsdl" with the N dropped. Without this repair the letters
  // of "SDL & CDSL" ("sdlcdsl") fail /nsdl/ while /cdsl/ still matches, and the
  // row is silently DOWNGRADED to "CDSL only" — a wrong fact on a public page,
  // and one nothing downstream could ever notice. "cdsl" and the OCR-noisy
  // "cdssl" contain no "sdl" of their own, so this can only fix the typo.
  const repaired = letters.replace(/(?<!n)sdl/g, "nsdl");
  const typo = repaired !== letters ? { typo: text } : {};

  const nsdl = /nsdl/.test(repaired);
  const cdsl = /cds{1,2}l/.test(repaired);
  if (nsdl && cdsl) return { value: "NSDL & CDSL", ...typo };
  if (nsdl) return { value: "NSDL only", ...typo };
  if (cdsl) return { value: "CDSL only", ...typo };
  return { value: undefined, unrecognised: text };
}

/** Canonical depository label from any of the partner's spellings, or
 *  undefined when the cell names none / can't be read. See classifyDepository
 *  when you need to tell those two apart. */
export function canonicalDepository(raw) {
  return classifyDepository(raw).value;
}

// ─── number tokens ──────────────────────────────────────────────────

/** "₹1,48,000.50" / "Rs. 950" / "1000" → number; null when not numeric. */
export function parseInr(raw) {
  const s = String(raw ?? "").replace(/[₹,\s]|rs\.?|inr/gi, "");
  if (!/^\d+(\.\d+)?$/.test(s)) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

/** All number tokens in a string, each flagged when ₹/Rs-prefixed. */
function numberTokens(str) {
  const out = [];
  const re = /(₹|\brs\.?|\binr\b)?\s*(\d[\d,]*(?:\.\d+)?)/gi;
  for (const m of str.matchAll(re)) {
    const value = parseInr(m[2]);
    if (value === null) continue;
    out.push({ value, currency: !!m[1], index: m.index, raw: m[0] });
  }
  return out;
}

// ─── PDF row parsing ────────────────────────────────────────────────

/**
 * Parse one text line of the partner's price list. Column order on the list:
 *   share name · retail price · depository · dealer price · minimum lot size
 *
 * Returns { name, price, depository, lotSize } for a data row,
 * null for non-row lines (headers, footers), or { error } for a row that
 * looked like data but failed validation.
 *
 * The dealer price (between depository and lot size) is deliberately never
 * extracted into the result — see the module header.
 */
export function parsePriceListLine(rawLine) {
  const line = String(rawLine).replace(/\t+/g, "  ").trim();
  if (!line || !/\d/.test(line)) return null; // headers, blank lines

  const depoMatch = line.match(DEPOSITORY_RE);
  if (!depoMatch) {
    // A ₹-bearing line without a depository is probably a wrapped/garbled row.
    return /₹/.test(line) ? { error: "no depository column found" } : null;
  }

  const before = line.slice(0, depoMatch.index);
  const after = line.slice(depoMatch.index + depoMatch[0].length);

  // Retail price: the last ₹-prefixed number before the depository; bare
  // number fallback (names like "Bira 91" keep their digits because the
  // price token is the LAST number).
  const beforeTokens = numberTokens(before);
  const currencyTokens = beforeTokens.filter((t) => t.currency);
  const priceToken = (currencyTokens.length ? currencyTokens : beforeTokens).at(-1);
  if (!priceToken) return { error: "no retail price before the depository column" };

  const name = before.slice(0, priceToken.index).replace(/[|:;,\-–\s]+$/, "").trim();
  if (!name) return { error: "empty share name" };

  const price = priceToken.value;
  if (!(price > PRICE_MIN_EXCL && price < PRICE_MAX_EXCL)) {
    return { error: `retail price ${price} outside (0, 50L)`, name };
  }

  // After the depository: dealer price then minimum lot size. The lot is the
  // LAST token when it looks like a lot (integer, not ₹-tagged); any other
  // tokens are the dealer price and are structurally dropped right here.
  const afterTokens = numberTokens(after);
  let lotSize;
  const last = afterTokens.at(-1);
  if (last && !last.currency && Number.isInteger(last.value) && last.value >= 1) {
    lotSize = last.value;
  }

  return {
    name,
    price,
    depository: canonicalDepository(depoMatch[0]),
    ...(lotSize !== undefined ? { lotSize } : {}),
  };
}

/** Parse a whole extracted-text price list into rows + skipped diagnostics. */
export function parsePriceListText(text) {
  const rows = [];
  const skipped = [];
  for (const line of String(text).split(/\r?\n/)) {
    const parsed = parsePriceListLine(line);
    if (!parsed) continue;
    if (parsed.error) {
      skipped.push({ line: line.trim().slice(0, 80), reason: parsed.error });
      continue;
    }
    rows.push(parsed);
  }
  return { rows, skipped };
}

// ─── OCR line classification ────────────────────────────────────────

/**
 * Read the retail price from a word's per-symbol boxes, correcting the one
 * systematic OCR defect on the partner's list: the ₹ glyph in the price pill.
 * Tesseract renders that ₹ in one of three ways (all observed on the real
 * list), and this untangles them from the glyph geometry:
 *
 *   (a) a separate NON-DIGIT symbol — "R", "%", "?", "₹" → strip it.
 *   (b) a separate "3" the SAME width as a digit (₹875 → "3875"). ₹ never
 *       OCRs as any other digit, and every genuine leading-3 price comes
 *       through as case (c) instead — so a normal-width leading "3" is the
 *       ₹ glyph → strip it.
 *   (c) MERGED into the first digit, whose box then measures ≈2× a normal
 *       digit (₹28 → one wide "2" + "8"). The digit is real → keep it.
 *
 * So: a real narrow leading "1" (case none — ₹ merged or separate) is never
 * stripped, and the phantom "3" always is. Returns the numeric price, or null
 * when the word has no symbols (caller falls back to text parsing).
 */
export function retailFromSymbols(word) {
  const syms = word?.symbols;
  if (!syms?.length) return null;
  const s = [...syms];
  while (s.length && !/\d/.test(s.at(-1).text)) s.pop(); // trailing "%", "]", …
  if (!s.length) return null;

  const first = s[0];
  if (!/\d/.test(first.text) && first.text !== ",") {
    s.shift(); // (a) leading R / % / ? / ₹
  } else {
    const digitW = s.filter((x) => /\d/.test(x.text)).map((x) => x.x1 - x.x0);
    const rest = digitW.slice(1).sort((a, b) => a - b);
    const median = rest.length ? rest[Math.floor(rest.length / 2)] : 0;
    const wide = median > 0 && first.x1 - first.x0 >= median * 1.4;
    if (first.text === "3" && !wide) s.shift(); // (b) phantom ₹-as-3; (c) wide digit kept
  }
  while (s.length && !/\d/.test(s[0].text)) s.shift(); // any leftover leading comma
  return parseInr(s.map((x) => x.text).join(""));
}

/**
 * Classify one OCR'd line of the partner's price list into a data row.
 * `words` are tesseract word boxes: { text, x0, x1 } in page pixels;
 * `pageWidth` is the rendered page width.
 *
 * The list's columns sit at stable x positions: name (left), retail price
 * (~0.45W), depository (~0.55W), dealer price (~0.75W), minimum lot
 * (~0.87W). The DEALER band — everything numeric between the depository's
 * right edge and LOT_BOUNDARY — is structurally dropped: those tokens are
 * never read into any variable that leaves this function. The lot is only
 * accepted from beyond LOT_BOUNDARY, so a missing lot token can never cause
 * a dealer figure to be mistaken for a lot size.
 *
 * Returns { name, price, depository, lotSize? } | null (not a data row) |
 * { error } (row-shaped but invalid).
 */
export function classifyOcrLine(words, pageWidth) {
  if (!words?.length || !pageWidth) return null;

  // Depository anchor: NSDL/CDSL tokens (OCR-tolerant, incl. fused "&CDsSL").
  const isDepoWord = (t) => /nsdl|cds{1,2}l|only/i.test(String(t).replace(/[^a-z]/gi, ""));
  const depoWords = words.filter((w) => isDepoWord(w.text) && w.x0 > pageWidth * 0.4);
  if (depoWords.length === 0) return null; // header, footer, banner…
  const depoStart = Math.min(...depoWords.map((w) => w.x0));
  const depoEnd = Math.max(...depoWords.map((w) => w.x1));

  const LOT_BOUNDARY = pageWidth * 0.82;
  // "R475" / "%2,350" / "24%" → 475 / 2350 / 24; interior junk still fails.
  const numOf = (t) => parseInr(String(t).replace(/^[^\d]+|[^\d.,]+$/g, ""));

  // Diagnostics context for skip reports: ONLY the name+retail zone (left of
  // the depository). Never includes the dealer band, so skip lines can be
  // printed and shared safely.
  const context = words
    .filter((w) => w.x1 <= depoStart)
    .map((w) => w.text)
    .join(" ")
    .slice(0, 70);

  // Retail: rightmost numeric token left of the depository column.
  const leftNums = words
    .filter((w) => w.x1 <= depoStart && (numOf(w.text) !== null || retailFromSymbols(w) !== null))
    .sort((a, b) => a.x0 - b.x0);
  const priceWord = leftNums.at(-1);
  if (!priceWord || priceWord.x0 < pageWidth * 0.3) {
    return { error: "no retail price found left of the depository column", context };
  }
  // Reliability gate. The ₹ symbol OCRs as a leading ₹/R/%/? (or Rs) glyph —
  // strip at most one — after which a real price is PURE digits. Any trailing
  // or embedded non-digit ("24"→"2%", "475"→"4T5") means OCR corrupted a
  // digit, so the number can't be trusted. Skip and report for manual entry
  // rather than write a wrong price — there is no dealer-column cross-check to
  // fall back on (that column is confidential and never read).
  const rawStripped = priceWord.text.replace(/^(?:[₹R%?]|Rs\.?)\s*/i, "");
  if (!/^\d[\d,]*(?:\.\d{1,2})?$/.test(rawStripped)) {
    return { error: `retail price OCR unreliable (read "${priceWord.text}") — enter this row manually`, context };
  }
  const price = retailFromSymbols(priceWord) ?? numOf(priceWord.text);
  if (!(price > PRICE_MIN_EXCL && price < PRICE_MAX_EXCL)) {
    return { error: `retail price ${price} outside (0, 50L)`, context };
  }

  // Name: word tokens left of the retail price. Leading logo junk OCRs as
  // letter-free tokens ("@®", "&3", "#7", "3]") — drop everything before the
  // first token that contains a letter ("63Sats" qualifies).
  const nameWords = words
    .filter((w) => w.x1 <= priceWord.x0)
    .sort((a, b) => a.x0 - b.x0);
  const firstLetter = nameWords.findIndex((w) => /[a-z]/i.test(w.text));
  const selected = firstLetter === -1 ? [] : nameWords.slice(firstLetter).filter((w) => /[a-z0-9]/i.test(w.text));
  const name = selected.map((w) => w.text).join(" ").trim();
  if (!name) return { error: "no share name to the left of the price", context };

  // Left edge of the real name text — i.e. the right edge of the logo cell.
  // The logo-extraction pass crops strictly left of this (see
  // scripts/extract-unlisted-logos.mjs); it is always well left of the retail
  // price column, so a crop bounded by it can never include a price figure.
  const nameStartX = Math.min(...selected.map((w) => w.x0));

  // Lot: numeric tokens beyond LOT_BOUNDARY only. Numeric tokens between the
  // depository and the boundary are the dealer price — deliberately unread.
  const lotWord = words
    .filter((w) => w.x0 >= LOT_BOUNDARY && numOf(w.text) !== null)
    .sort((a, b) => a.x0 - b.x0)
    .at(-1);
  let lotSize;
  if (lotWord) {
    const lot = numOf(lotWord.text);
    if (Number.isInteger(lot) && lot >= 1) lotSize = lot;
  }

  return {
    name,
    price,
    depository: canonicalDepository(depoWords.map((w) => w.text).join(" ")),
    ...(lotSize !== undefined ? { lotSize } : {}),
    nameStartX,
  };
}

/** Date from OCR'd header text: "DATE 22 Jul 2026", "Generated 22 Jul 2026",
 *  or the fused "22Jul2026" — returned as "22 Jul 2026" for normalizeIsoDate. */
export function findOcrHeaderDate(text) {
  const s = String(text);
  const m =
    s.match(/(?:date|generated|as\s+on)\s*[:\-]?\s*(\d{1,2})\s*([A-Za-z]{3,9})\s*(\d{4})/i) ||
    s.match(/\b(\d{1,2})\s*(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s*(\d{4})\b/i);
  return m ? `${m[1]} ${m[2]} ${m[3]}` : null;
}

/** 'DATE 22 Jul 2026' (or 'As on: 2-Jul-2026') anywhere in the text → the
 *  matched raw date string, or null. Caller normalises to ISO. */
export function findHeaderDate(text) {
  const m = String(text).match(
    /(?:date|as\s+on|as\s+of)\s*[:\-]?\s*(\d{1,2}[\s\-/][A-Za-z]{3,9}[\s\-/,]*\d{4}|\d{4}-\d{2}-\d{2}|\d{1,2}[/-]\d{1,2}[/-]\d{4})/i,
  );
  return m ? m[1].replace(/,/g, " ").replace(/\s+/g, " ").trim() : null;
}

// ─── CSV header mapping ─────────────────────────────────────────────

/**
 * Map tolerant CSV headers → column indexes. Any dealer/cost/buy price
 * column is identified only to be EXCLUDED — its index is never returned.
 * Returns { name, price, depository, lot } (missing keys = column absent)
 * or { error } when the sheet is ambiguous.
 */
export function mapCsvHeader(headerCells) {
  const cells = headerCells.map((h) => String(h ?? "").trim().toLowerCase());
  const findIdx = (test) => cells.findIndex(test);

  const isDealer = (h) => /dealer|cost|buy|purchase|wholesale/.test(h);
  const name = findIdx(
    (h) => !isDealer(h) && !/price|rate|depos|demat/.test(h) && /(company|scrip|security|stock|share|name)/.test(h),
  );
  const depository = findIdx((h) => /depos|demat/.test(h));
  const lot = findIdx((h) => /lot|min(imum)?\s*(qty|quantity|size)/.test(h));

  const priceIdxs = cells
    .map((h, i) => ({ h, i }))
    .filter(({ h }) => /price|rate/.test(h) && !isDealer(h));
  let price = -1;
  if (priceIdxs.length === 1) price = priceIdxs[0].i;
  else if (priceIdxs.length > 1) {
    const preferred = priceIdxs.filter(({ h }) => /retail|indicative|sell|offer/.test(h));
    if (preferred.length === 1) price = preferred[0].i;
    else return { error: `ambiguous price columns: ${priceIdxs.map(({ h }) => `"${h}"`).join(", ")} — rename one to "retail price"` };
  }

  if (name === -1) return { error: `no company/share-name column found in: ${cells.join(", ")}` };
  if (price === -1) return { error: `no retail price column found in: ${cells.join(", ")} (dealer/cost columns are ignored by design)` };

  return {
    name,
    price,
    ...(depository !== -1 ? { depository } : {}),
    ...(lot !== -1 ? { lot } : {}),
  };
}

/**
 * CONFIDENTIALITY LOCK for the partner's spreadsheet, where the dealer price
 * sits in column E immediately beside the retail price in column D.
 *
 * mapCsvHeader already refuses to select any dealer/cost/buy column — this is
 * the second, explicit check: the column it *did* select must SAY retail. A
 * renamed header, a reordered sheet, or a header row detected one row off
 * would all leave mapCsvHeader with a single plausible "price" column and no
 * way to know it picked the wrong one. Anything but a retail header stops the
 * read rather than risk the dealer figure reaching a publicly readable dataset.
 *
 * Deliberately NOT applied to the generic CSV path, where a partner sheet with
 * one plain "Price" column is a legitimate (and unambiguous) shape.
 *
 * Throws on failure; returns the header text on success. Only header LABELS
 * are ever quoted here — never a cell value from the dealer column.
 */
export function assertRetailPriceColumn(headerCells, priceIdx, where = "the price list") {
  const header = String(headerCells[priceIdx] ?? "").trim();
  if (!/retail/i.test(header)) {
    throw new Error(
      `${where}: the price column resolved to "${header || "(blank)"}", which is not a RETAIL price column. ` +
      `Refusing to read it — the dealer/cost price must never be imported. ` +
      `Headers seen: ${headerCells.map((h) => `"${String(h ?? "").trim()}"`).join(", ")}`,
    );
  }
  return header;
}

// ─── corruption signatures ──────────────────────────────────────────
//
// The 31-Jul-2026 import wrote 179 documents whose `company` carried the
// retail price fused onto the end of the name — "(Manipal Cards) 385",
// "(NCDEX) Limited Unlisted Shares 388". Cause: parsePriceListLine takes the
// LAST number before the depository column as the retail price, so when the
// extracted text puts a second numeric column (the dealer price) between the
// retail price and the depository, the real price is left inside the name and
// the WRONG column is stored. Nothing errored — every row looked valid.
//
// These helpers are shared by scripts/audit-unlisted.mjs (find the damage) and
// the importer's pre-write guard (never write it again).

/** Trailing number on a name: "(PPFAS) 19850" → { raw: "19850", digits: 5 }. */
export function trailingNumber(name) {
  const s = String(name ?? "").trimEnd();
  const m = s.match(/(\d[\d,]*(?:\.\d+)?)\s*$/);
  if (!m) return null;
  return {
    raw: m[1],
    value: parseInr(m[1]),
    index: m.index,
    digits: m[1].replace(/\D/g, "").length,
    separated: m.index === 0 || /[\s)\]}]/.test(s[m.index - 1]),
  };
}

/** True when brackets don't pair up — "(Manipal Cards" or the dangling
 *  "Manipal Cards) 385" that clean-unlisted-names.mjs leaves behind when it
 *  strips a leading "(" it mistook for OCR logo junk. */
export function hasUnbalancedBracket(name) {
  const s = String(name ?? "");
  for (const [open, close] of [["(", ")"], ["[", "]"], ["{", "}"]]) {
    let depth = 0;
    for (const ch of s) {
      if (ch === open) depth++;
      else if (ch === close && --depth < 0) return true;
    }
    if (depth !== 0) return true;
  }
  return false;
}

/** The partner list's row boilerplate, which is not part of a company's name. */
export const LIST_BOILERPLATE_RE = /\bunlisted\s+shares?\b/i;

/**
 * Reduce a (possibly corrupted) name to the company underneath it: drop a
 * fused trailing price, the "Unlisted Shares" row boilerplate and any stray
 * brackets. Used to line a corrupted document up with its clean twin.
 */
export function stripCorruption(name) {
  return String(name ?? "")
    .replace(/[\s|:;,\-–]*\d[\d,]*(?:\.\d+)?\s*$/, "")
    .replace(/\bunlisted\s+shares?\b/gi, " ")
    .replace(/[()[\]{}]/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
}

/**
 * Does this parsed name look like it has a price column welded onto it?
 * Returns a human-readable reason, or null when the name is fine.
 *
 * Deliberately narrow so real names survive: "Bira 91" and "Cars24" keep their
 * digits (a 1-2 digit tail is a brand, not a price), and "Vision2000" is safe
 * because a fused price always arrives as its own whitespace-separated column.
 */
export function priceFusedName(name) {
  const s = String(name ?? "");
  const currency = s.match(/(?:₹|\brs\.?\s*|\binr\s+)\d[\d,]*/i);
  if (currency) return `carries a currency amount ("${currency[0].trim()}")`;
  const t = trailingNumber(s);
  if (!t || !t.separated) return null;
  if (t.digits >= 3) return `ends in the ${t.digits}-digit number "${t.raw}"`;
  if (/[,.]/.test(t.raw)) return `ends in the formatted number "${t.raw}"`;
  return null;
}

/**
 * Pre-write gate for a parsed price list. Returns { errors, warnings }; a
 * non-empty `errors` means the caller must abort without touching Sanity.
 *
 * Two invariants, both violated by the 31-Jul run:
 *  - no parsed company name carries price digits (per-row, plus a systemic
 *    check that catches a 2-digit fusion the per-row rule lets through);
 *  - the row count sits in a sane band around the previous import — a daily
 *    price list does not halve or double overnight.
 */
export function validateImportRows(rows, { previousRowCount = 0, previousAsOfDate = null } = {}) {
  const errors = [];
  const warnings = [];

  const fused = [];
  for (const r of rows) {
    const why = priceFusedName(r.name);
    if (why) fused.push({ name: r.name, why });
  }
  if (fused.length) {
    errors.push({
      code: "name-price-fusion",
      message:
        `${fused.length} of ${rows.length} parsed company names carry price digits — the name and price ` +
        `columns have been read as one field. Storing these would create duplicate companies and (because ` +
        `the price taken is whatever number came LAST) publish the wrong column's figure.`,
      detail: fused.slice(0, 15).map((f) => `"${f.name}" — ${f.why}`),
      more: Math.max(0, fused.length - 15),
    });
  }

  // Systemic tail-digit check: a handful of "Bira 91"-shaped names is normal,
  // a quarter of the list ending in digits is a column shift.
  const trailing = rows.filter((r) => trailingNumber(r.name)?.separated);
  if (trailing.length >= 5 && trailing.length > rows.length * 0.25) {
    errors.push({
      code: "name-trailing-digits",
      message:
        `${trailing.length} of ${rows.length} parsed names end in a separate number. Real company names ` +
        `rarely do; at this rate the name column has absorbed the column to its right.`,
      detail: trailing.slice(0, 10).map((r) => `"${r.name}"`),
      more: Math.max(0, trailing.length - 10),
    });
  }

  const boilerplate = rows.filter((r) => LIST_BOILERPLATE_RE.test(r.name));
  if (boilerplate.length > rows.length * 0.5) {
    warnings.push(
      `${boilerplate.length} of ${rows.length} names contain "Unlisted Shares" — that is the list's row ` +
      `boilerplate, not part of a company name. Matching strips it, so these still resolve onto their ` +
      `existing documents; but any row that does NOT match is CREATED with the boilerplate baked into ` +
      `its company name. Read the "Created" list before writing.`,
    );
  }

  if (previousRowCount > 0) {
    const lo = Math.floor(previousRowCount * 0.6);
    const hi = Math.ceil(previousRowCount * 1.5);
    if (rows.length < lo || rows.length > hi) {
      errors.push({
        code: "row-count-band",
        message:
          `parsed ${rows.length} rows, but the previous import` +
          `${previousAsOfDate ? ` (${previousAsOfDate})` : ""} had ${previousRowCount} — outside the ` +
          `sane band ${lo}–${hi}. Either the list changed shape or the parser is reading it wrong.`,
        detail: [],
        more: 0,
      });
    }
  }

  return { errors, warnings };
}

// ─── matching ───────────────────────────────────────────────────────

/** Global twin of LIST_BOILERPLATE_RE, for stripping every occurrence. */
const LIST_BOILERPLATE_RE_G = /\bunlisted\s+shares?\b/gi;

/**
 * Normalise a name with the partner list's row boilerplate removed, so
 * "APL Metals Unlisted Shares" and "APL Metals" both reduce to "apl metals".
 * A trailing "price" goes too ("… Unlisted Shares Price").
 *
 * Local on purpose: normalizeCompanyName is shared with the audit, the logo
 * extractor and clean-unlisted-names, where "Zepto Unlisted Shares (Equity)"
 * has to keep reading as its own distinct stored name.
 */
function normalizeWithoutBoilerplate(raw) {
  return normalizeCompanyName(String(raw ?? "").replace(LIST_BOILERPLATE_RE_G, " "))
    .replace(/\s*\bprice\b$/, "")
    .trim();
}

/**
 * How short a stored name may be and still swallow a longer incoming one in
 * the reverse-prefix pass. "Inox" (4) must never claim "Inox Clean Energy" or
 * "Inox Leasing and Finance" — they are three different companies — while
 * "Signify Innovations (Previously Ph" (33 normalised) is unmistakably the
 * truncated form of exactly one.
 */
const REVERSE_PREFIX_MIN = 12;

// ─── damage in the STORED name ──────────────────────────────────────
//
// Everything above assumes the stored side is clean and the incoming side may
// be damaged. On 06-Aug-2026 that inverted. The partner's Excel names are now
// complete and correct; OURS are the ones the old OCR mangled, in three
// recognisable ways. Bridging them is what keeps a price list from forking a
// second copy of a company we already have.

/**
 * Suffix words the old OCR cut in half. A stored name's final token is a
 * severed word when it is a PROPER prefix of one of these — "Limit",
 * "Limite", "Corporatio".
 */
const SUFFIX_WORDS = [
  "limited", "private", "india", "corporation", "company", "solutions",
  "services", "technologies", "industries", "financial", "international",
];

/** How much name has to survive a repair before it may claim a match. Short
 *  remainders are the dangerous ones: "csk", "kineco", "rkb global" could
 *  each belong to several companies, so they go to a human instead. */
const REPAIRED_MIN = 12;

/**
 * Drop a normalised stored name's final token when it looks like a word the
 * old OCR cut off partway: under 5 characters, or a proper prefix of a suffix
 * word the partner's names habitually end in. Returns null when the final
 * token reads as a whole word — i.e. when there is nothing to repair.
 *
 * normalizeCompanyName already strips ltd/limited/pvt/private/india as WHOLE
 * words, which is precisely why the fragments "Li", "Lim", "Limit" and
 * "Limite" are still here to be found: they are not those words.
 */
function dropTruncatedTail(normalised) {
  const tokens = String(normalised ?? "").split(" ").filter(Boolean);
  if (tokens.length < 2) return null;
  const last = tokens[tokens.length - 1];
  // A trailing NUMBER is part of the name, never a severed word. OCR truncates
  // letters; it does not invent digits. Dropping one would reduce "Sterlite
  // Grid 5" to "Sterlite Grid" and let it answer for Sterlite Grid 1-4.
  if (/^\d+$/.test(last)) return null;
  const severed = last.length < 5 || SUFFIX_WORDS.some((w) => w.length > last.length && w.startsWith(last));
  return severed ? tokens.slice(0, -1).join(" ") : null;
}

/**
 * Drop a normalised stored name's first token when it is short enough to be
 * the 1-2 stray characters the old OCR lifted out of the logo cell ("EB
 * Graand Prix…", "B® Orbis…", "Rt. Hindon…"). Returns null when the first
 * token is too long to be junk.
 */
function dropLeadingJunk(normalised) {
  const tokens = String(normalised ?? "").split(" ").filter(Boolean);
  if (tokens.length < 2 || tokens[0].length > 4) return null;
  return tokens.slice(1).join(" ");
}

/** Fold the three glyphs the old OCR could not tell apart onto one character.
 *  "Bvglndia" / "Hellalnfra" / "Kim Axiva" are l-for-I and I-for-L errors. */
const foldIL1 = (s) => String(s).replace(/[il1]/g, "i");

/** Letters and digits only, KEEPING the ltd/private/india suffix words. The
 *  l/I/1 fold needs this: OCR fuses a suffix word onto the token before it
 *  ("Bvglndia" for "BVG India"), so normalizeCompanyName drops "India" from
 *  the clean side while the damaged side keeps it buried inside a token. */
const compactKeepingSuffixes = (raw) => String(raw ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");

/**
 * Why a stored company name looks like a DAMAGED version of the incoming one.
 * Returns human-readable reasons; an EMPTY array means the stored name looks
 * intact and must never be overwritten by partner data.
 *
 * This is the gate on --adopt-names, so it is the one place that decides
 * whether a public-facing company name gets rewritten. Every test below is a
 * positive sign of damage; nothing here fires on a merely different name.
 */
export function storedNameCorruption(storedName, incomingName) {
  const reasons = [];
  const stored = String(storedName ?? "");
  const storedNorm = normalizeCompanyName(stored);
  const incomingNorm = normalizeCompanyName(String(incomingName ?? ""));
  if (!storedNorm || !incomingNorm) return reasons;

  if (hasUnbalancedBracket(stored)) reasons.push("unbalanced bracket");

  // The two names are the same word-for-word once l, I and 1 are folded
  // together — so one of them has the wrong glyph, and by the premise of this
  // whole pass it is not the partner's. "Bvglndia" for "BVG India".
  const foldedMatch =
    storedNorm !== incomingNorm &&
    (foldIL1(storedNorm.replace(/ /g, "")) === foldIL1(incomingNorm.replace(/ /g, "")) ||
      foldIL1(compactKeepingSuffixes(stored)) === foldIL1(compactKeepingSuffixes(incomingName)));
  if (foldedMatch) reasons.push("differs from the incoming name only in l / I / 1");

  const tokens = storedNorm.split(" ").filter(Boolean);
  if (dropTruncatedTail(storedNorm) !== null) {
    reasons.push(`ends in the part-word "${tokens.at(-1)}"`);
  }

  // A short first token is completely ordinary in Indian company names — NSE,
  // APL, HDB, 3M — so it is only evidence of damage when the clean name does
  // not contain it at all. And not when the fold above already explains it:
  // "Kim" is a misread "KLM", not a stray character.
  const incomingTokens = new Set(incomingNorm.split(" ").filter(Boolean));
  if (!foldedMatch && tokens.length >= 2 && tokens[0].length <= 4 && !incomingTokens.has(tokens[0])) {
    reasons.push(`starts with the stray token "${tokens[0]}"`);
  }

  if (storedNorm !== incomingNorm && incomingNorm.startsWith(storedNorm)) {
    reasons.push("is a strict prefix of the incoming name");
  }
  return reasons;
}

/**
 * Resolve a raw partner-list name against the existing Sanity docs.
 * Docs: { _id, company, slug?, aliases? }.
 *
 * Exact tests first — slug → aliases → normalised company name →
 * space-insensitive company/alias → id collision — then five RELAXED passes
 * whose candidates are pooled: (a) boilerplate-insensitive, (b) reverse
 * prefix, (c) stored name truncated mid-word, (d) stored name with a leading
 * junk token, (e) l/I/1 confusion. Last, for an incoming name that ends in an
 * ellipsis, a unique prefix of a company/alias.
 *
 * Returns { doc } on a match, { create: true } for a confident new company,
 * or { ambiguous: [...] } when a name matches several docs. Matches from the
 * relaxed passes also carry { via, alias }: `alias` is the raw incoming name,
 * which the importer appends to the document's aliases so the next run
 * matches it exactly rather than relaxing again.
 */
export function resolveUnlistedTarget(rawName, docs, slugify) {
  const { clean, truncated } = splitEllipsis(rawName);
  const norm = normalizeCompanyName(clean);
  if (!norm) return { error: "name is empty after normalisation" };

  const slug = slugify(clean);
  const bySlug = docs.find((d) => d.slug && d.slug === slug);
  if (bySlug) return { doc: bySlug };

  const aliasHit = docs.find((d) => (d.aliases ?? []).some((a) => normalizeCompanyName(a) === norm));
  if (aliasHit) return { doc: aliasHit };

  const nameHit = docs.find((d) => normalizeCompanyName(d.company) === norm);
  if (nameHit) return { doc: nameHit };

  // OCR sometimes fuses words ("AplMetals", "ArohanFinancial") — retry the
  // company/alias comparison with spaces removed on both sides.
  const compact = norm.replace(/ /g, "");
  const compactHit = docs.find(
    (d) =>
      normalizeCompanyName(d.company).replace(/ /g, "") === compact ||
      (d.aliases ?? []).some((a) => normalizeCompanyName(a).replace(/ /g, "") === compact),
  );
  if (compactHit) return { doc: compactHit };

  // The importer's doc ids are unlistedShare-<slug>; treat an id collision as
  // the same company so a create can never clobber an existing document. This
  // stays AHEAD of the two relaxed passes below: an exact id match is a
  // stronger statement about identity than any name-shape heuristic, and
  // routing the row elsewhere would leave a create colliding with this id.
  const byId = docs.find((d) => d._id === `unlistedShare-${slug}`);
  if (byId) return { doc: byId };

  // ═══ relaxed passes ════════════════════════════════════════════════
  //
  // Everything above this line is an EXACT test of one kind or another. What
  // follows is not: each pass models one specific way the two sides disagree,
  // and none of them can prove identity on its own. That is why the importer
  // refuses to write a run in which two incoming rows land on one document.
  //
  // Candidates from ALL the passes are pooled before the exactly-one rule is
  // applied, rather than letting whichever pass runs first take the row. That
  // is deliberately stricter than running them in order: an editorial
  // document ("Motilal Oswal Home Finance") and its OCR-damaged twin
  // ("Motilal Oswal Home Finance Limi") are each found by a DIFFERENT pass,
  // and resolving by pass order would silently pick one of two real
  // documents. Pooled, they come back ambiguous and a human decides.
  const bare = normalizeWithoutBoilerplate(clean);

  const found = new Map(); // doc._id → { doc, via } — first pass to find it wins the label
  const consider = (test, via) => {
    for (const d of docs) {
      if (found.has(d._id)) continue;
      if (test(d.company) || (d.aliases ?? []).some((a) => test(a))) found.set(d._id, { doc: d, via });
    }
  };

  // (a) Boilerplate-insensitive. The Excel list spells 97 of its 183 names
  // "<Company> Unlisted Shares"; that is the list's ROW BOILERPLATE, not part
  // of anyone's name, and the stored documents never carried it.
  if (bare) consider((s) => normalizeWithoutBoilerplate(s) === bare, "boilerplate");

  // (b) Reverse prefix — the mirror of the truncated-INCOMING branch below.
  // The old OCR cut long names off mid-word and those stumps are what is
  // STORED; the Excel list now supplies the full name. The prefix is
  // deliberately not word-aligned, because truncation happens mid-word.
  // REVERSE_PREFIX_MIN is what keeps that safe.
  consider((storedRaw) => {
    const stored = normalizeCompanyName(storedRaw);
    return stored.length >= REVERSE_PREFIX_MIN && (norm.startsWith(stored) || bare.startsWith(stored));
  }, "reverse-prefix");

  // (c) Stored name truncated mid-word, leaving a partial FINAL token that
  // stops (b)'s prefix test dead: "Krasny Defence Technologies Li",
  // "Hindustan Power Exchange Limit", "Galaxeye Space Solutions Limite".
  const truncatedTailHit = (storedRaw) => {
    const repaired = dropTruncatedTail(normalizeCompanyName(storedRaw));
    return repaired !== null && repaired.length >= REPAIRED_MIN &&
      (norm.startsWith(repaired) || bare.startsWith(repaired));
  };
  consider(truncatedTailHit, "stored-truncated");

  // (d) Leading junk: 1-2 stray characters the old OCR lifted out of the logo
  // cell ("EB Graand Prix…", "4A sigachilaboratories…", "Rt. Hindon…"). Drop
  // the token and retry (c) and the plain prefix/compact tests on what is
  // left. REPAIRED_MIN is why "I csk" and "w+ Kineco" stay unmatched: three
  // and six characters are not enough to identify a company by.
  consider((storedRaw) => {
    const rest = dropLeadingJunk(normalizeCompanyName(storedRaw));
    if (rest === null || rest.length < REPAIRED_MIN) return false;
    if (norm.startsWith(rest) || bare.startsWith(rest)) return true;
    if (rest.replace(/ /g, "") === compact) return true;
    const repaired = dropTruncatedTail(rest);
    return repaired !== null && repaired.length >= REPAIRED_MIN &&
      (norm.startsWith(repaired) || bare.startsWith(repaired));
  }, "leading-junk");

  // (e) l / I / 1 confusion — "Bvglndia" for "BVG India", "Kim" for "KLM".
  // Only reached when the plain compact comparison above has already failed,
  // so this is the fold of last resort, and it demands full equality.
  const foldedCompact = foldIL1(compact);
  const foldedFull = foldIL1(compactKeepingSuffixes(clean));
  consider((storedRaw) =>
    foldIL1(normalizeCompanyName(storedRaw).replace(/ /g, "")) === foldedCompact ||
    foldIL1(compactKeepingSuffixes(storedRaw)) === foldedFull, "il1-confusion");

  const hits = [...found.values()];
  if (hits.length === 1) return { doc: hits[0].doc, via: hits[0].via, alias: clean };
  if (hits.length > 1) return { ambiguous: hits.map((h) => h.doc), via: hits[0].via };

  if (truncated) {
    const candidates = docs.filter(
      (d) =>
        normalizeCompanyName(d.company).startsWith(norm) ||
        (d.aliases ?? []).some((a) => normalizeCompanyName(a).startsWith(norm)),
    );
    if (candidates.length === 1) return { doc: candidates[0] };
    if (candidates.length > 1) return { ambiguous: candidates };
  }

  return { create: true, clean };
}

/** Length of the shared opening of two strings. */
function commonPrefixLength(a, b) {
  let i = 0;
  while (i < a.length && i < b.length && a[i] === b[i]) i++;
  return i;
}

/** How much shared opening makes two names worth a second look. */
const SUSPECT_PREFIX_MIN = 10;

/**
 * For a name the matcher decided to CREATE, find existing documents that
 * nonetheless look like the same company.
 *
 * Same similarity signals as the relaxed passes — boilerplate stripped, the
 * l/I/1 fold, a shared opening — but WITHOUT the exactly-one requirement,
 * because this decides nothing. It exists so the operator reading a create
 * list can tell "we have never priced this company" apart from "this is a
 * fourth spelling of a document we already have".
 *
 * Returns [{ doc, shared, storedName }], longest shared opening first.
 */
export function nearbyExistingDocs(rawName, docs, limit = 3) {
  const { clean } = splitEllipsis(String(rawName ?? ""));
  const incoming = normalizeWithoutBoilerplate(clean) || normalizeCompanyName(clean);
  if (!incoming) return [];
  const key = foldIL1(incoming.replace(/ /g, ""));

  const scored = [];
  for (const d of docs) {
    let best = null;
    for (const name of [d.company, ...(d.aliases ?? [])]) {
      const stored = normalizeWithoutBoilerplate(name) || normalizeCompanyName(name);
      if (!stored) continue;
      // Also try the stored name without a leading junk token. Those are the
      // near-misses that matter most here: a stray "Ee" in front of "Rkb
      // Global" both destroys the shared opening AND leaves too little name
      // for the matcher's floor, so the row creates a duplicate with nothing
      // to say why. This is where a human gets told to look.
      for (const form of [stored, dropLeadingJunk(stored)]) {
        if (!form) continue;
        const candidate = foldIL1(form.replace(/ /g, ""));
        const shared = commonPrefixLength(key, candidate);
        const ratio = shared / Math.min(key.length, candidate.length);
        if (shared >= SUSPECT_PREFIX_MIN || (shared >= 6 && ratio >= 0.6)) {
          if (!best || shared > best.shared) best = { shared, storedName: name };
        }
      }
    }
    if (best) scored.push({ doc: d, ...best });
  }
  scored.sort((a, b) => b.shared - a.shared);
  return scored.slice(0, limit);
}

/**
 * The `set` payload for a document the price list matched.
 *
 * `slug` is NEVER in the result, on any path. A company's name is editorial
 * and can be corrected; its URL is a promise to everyone who has linked to
 * it, and partner data does not get to move one. Fields not named here —
 * logo, sector, summary, ipoStatus, everything hand-curated — are untouched
 * because a Sanity `set` patch only writes the keys it is given.
 */
export function buildMatchedDocSet({ priceFields, publish = false, adoptCompany = null }) {
  return {
    ...priceFields,
    ...(publish ? { needsReview: false } : {}),
    ...(adoptCompany ? { company: adoptCompany } : {}),
  };
}
