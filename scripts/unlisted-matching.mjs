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

const DEPOSITORY_RE =
  /(NSDL\s*&(?:AMP;)?\s*CDSL|CDSL\s*&(?:AMP;)?\s*NSDL|ONLY\s+NSDL|NSDL\s+ONLY|ONLY\s+CDSL|CDSL\s+ONLY|NSDL|CDSL)/i;

/** Canonical depository label from any of the partner's spellings. Tolerant
 *  of OCR noise ("&CDsSL" → cdssl), hence the s{1,2} in the CDSL test. */
export function canonicalDepository(raw) {
  const letters = String(raw ?? "").toLowerCase().replace(/[^a-z]/g, "");
  const nsdl = /nsdl/.test(letters);
  const cdsl = /cds{1,2}l/.test(letters);
  if (nsdl && cdsl) return "NSDL & CDSL";
  if (nsdl) return "NSDL only";
  if (cdsl) return "CDSL only";
  return undefined;
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
  const name = firstLetter === -1
    ? ""
    : nameWords.slice(firstLetter).filter((w) => /[a-z0-9]/i.test(w.text)).map((w) => w.text).join(" ").trim();
  if (!name) return { error: "no share name to the left of the price", context };

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

// ─── matching ───────────────────────────────────────────────────────

/**
 * Resolve a raw partner-list name against the existing Sanity docs.
 * Order: slug → aliases → normalised company name → (truncated names only)
 * unique prefix of company/alias. Docs: { _id, company, slug?, aliases? }.
 *
 * Returns { doc } on a match, { create: true } for a confident new company,
 * or { ambiguous: [...] } when a truncated name matches several docs.
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
  // the same company so a create can never clobber an existing document.
  const byId = docs.find((d) => d._id === `unlistedShare-${slug}`);
  if (byId) return { doc: byId };

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
