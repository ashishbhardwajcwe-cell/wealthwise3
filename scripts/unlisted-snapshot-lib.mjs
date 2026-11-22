/**
 * Pure logic for the monthly unlisted-shares snapshot (no network, no I/O).
 * Used by scripts/unlisted-snapshot.mjs and tested by
 * scripts/unlisted-snapshot.test.mjs.
 *
 * CONFIDENTIALITY: the snapshot carries the RETAIL/indicative price only.
 * assertNoConfidentialKeys() fails the run if any key that looks like a
 * dealer/cost/buy price appears anywhere — in the Sanity documents read, or
 * in the rows written.
 */

/** Keys that must never appear in input or output. */
export const CONFIDENTIAL_KEY_RE = /dealer|cost|buy|purchase|wholesale|margin|landed|partner_?price/i;

/** The ONLY fields a snapshot row may carry, in CSV column order. */
export const ROW_FIELDS = [
  "name", "slug", "sector", "retailPriceINR", "asOfDate",
  "previousRetailPriceINR", "previousAsOfDate", "pctChange", "pctChangeFlag",
  "lotSize", "minInvestmentINR", "listing", "enquiries", "source",
];

/** Row-level provenance (CLAUDE.md: every figure carries asOfDate + source).
 *  Brand only — partners are never named in published data. */
export const SOURCE = "PlanMyCashflows indicative (retail) price list";

/** CLAUDE.md implausible-return filter, applied before anything goes public. */
export const PCT_MIN = -95;
export const PCT_MAX = 300;

/** An asOfDate counts as a monthly import only if this many docs carry it. */
export const DEFAULT_MIN_ROWS = 20;

const ISO_RE = /^\d{4}-\d{2}-\d{2}$/;
export const isIsoDate = (s) => typeof s === "string" && ISO_RE.test(s) && !Number.isNaN(Date.parse(`${s}T00:00:00Z`));
export const monthOf = (iso) => iso.slice(0, 7);

/** Recursively throw if any object key looks like a confidential price. */
export function assertNoConfidentialKeys(value, where = "input", path = "") {
  if (Array.isArray(value)) {
    value.forEach((v, i) => assertNoConfidentialKeys(v, where, `${path}[${i}]`));
  } else if (value && typeof value === "object") {
    for (const [k, v] of Object.entries(value)) {
      if (CONFIDENTIAL_KEY_RE.test(k)) {
        // Print the key path only — never the value.
        throw new Error(`CONFIDENTIAL field "${path}.${k}" found in ${where}. Aborting; nothing written.`);
      }
      assertNoConfidentialKeys(v, where, `${path}.${k}`);
    }
  }
}

/** Distinct import dates (asOfDate) carried by at least minRows documents. */
export function importDates(docs, minRows = DEFAULT_MIN_ROWS) {
  const counts = new Map();
  for (const d of docs) {
    for (const d2 of new Set((d.priceHistory ?? []).map((h) => h?.d).filter(isIsoDate))) {
      counts.set(d2, (counts.get(d2) ?? 0) + 1);
    }
  }
  const all = [...counts.entries()].sort(([a], [b]) => a.localeCompare(b));
  return {
    dates: all.filter(([, n]) => n >= minRows).map(([d]) => d),
    ignored: all.filter(([, n]) => n < minRows),
    counts: Object.fromEntries(all),
  };
}

/** Latest import date in each calendar month. */
export function latestPerMonth(dates) {
  const byMonth = new Map();
  for (const d of [...dates].sort()) byMonth.set(monthOf(d), d);
  return [...byMonth.values()];
}

/** The latest import date in an EARLIER calendar month than `date`, or null. */
export function previousImportDate(dates, date) {
  const m = monthOf(date);
  const earlier = dates.filter((d) => monthOf(d) < m).sort();
  return earlier.length ? earlier[earlier.length - 1] : null;
}

const priceOn = (doc, date) => {
  const h = (doc.priceHistory ?? []).find((x) => x?.d === date);
  return h && typeof h.p === "number" && Number.isFinite(h.p) && h.p > 0 ? h.p : null;
};

const round2 = (n) => Math.round(n * 100) / 100;

/**
 * Build snapshot rows for `date`.
 * docs: unlistedShare docs (already filtered to site-visible).
 * enquiryCounts: Map<lowercased company name, count> or null if unavailable.
 */
export function buildRows(docs, date, prevDate, enquiryCounts) {
  const rows = [];
  for (const doc of docs) {
    const price = priceOn(doc, date);
    const prev = prevDate ? priceOn(doc, prevDate) : null;
    if (price === null && prev === null) continue; // not in either month

    let listing = null;
    if (prevDate) listing = price === null ? "dropped" : prev === null ? "new" : "continuing";

    let pctChange = null;
    let pctChangeFlag = null;
    if (price !== null && prev !== null) {
      const pct = round2(((price - prev) / prev) * 100);
      if (pct < PCT_MIN || pct > PCT_MAX) pctChangeFlag = "implausible";
      else pctChange = pct;
    }

    const lot = typeof doc.lotSize === "number" && doc.lotSize > 0 ? doc.lotSize : null;
    const name = doc.company;
    rows.push({
      name,
      slug: doc.slug ?? null,
      sector: doc.sector ?? null,
      retailPriceINR: price,
      asOfDate: price !== null ? date : null,
      previousRetailPriceINR: prev,
      previousAsOfDate: prev !== null ? prevDate : null,
      pctChange,
      pctChangeFlag,
      lotSize: lot,
      minInvestmentINR: price !== null && lot ? round2(price * lot) : null,
      listing,
      enquiries: enquiryCounts ? enquiryCounts.get(String(name).trim().toLowerCase()) ?? 0 : null,
      source: SOURCE,
    });
  }
  rows.sort((a, b) => String(a.name).localeCompare(String(b.name)));
  return rows;
}

/** Final gate on what is about to be written. Throws on any problem. */
export function validateRows(rows) {
  for (const r of rows) {
    const keys = Object.keys(r);
    const extra = keys.filter((k) => !ROW_FIELDS.includes(k));
    if (extra.length) throw new Error(`Snapshot row carries unexpected field(s): ${extra.join(", ")}`);
    assertNoConfidentialKeys(r, "snapshot row");
    for (const k of ["asOfDate", "previousAsOfDate"]) {
      if (r[k] !== null && !isIsoDate(r[k])) throw new Error(`Bad ${k} "${r[k]}" for ${r.slug}`);
    }
    if (r.retailPriceINR !== null && (!r.asOfDate || !r.source)) throw new Error(`Price without asOfDate/source for ${r.slug}`);
    if (r.previousRetailPriceINR !== null && !r.previousAsOfDate) throw new Error(`Previous price without date for ${r.slug}`);
  }
  return rows;
}

const csvCell = (v) => {
  if (v === null || v === undefined) return "";
  const s = String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export function toCsv(rows) {
  return [ROW_FIELDS.join(","), ...rows.map((r) => ROW_FIELDS.map((f) => csvCell(r[f])).join(","))].join("\n") + "\n";
}

/** IST calendar-month window [start, end) as UTC ISO strings. */
export function istMonthWindow(month) {
  const [y, m] = month.split("-").map(Number);
  const start = new Date(Date.UTC(y, m - 1, 1) - 330 * 60_000);
  const end = new Date(Date.UTC(y, m, 1) - 330 * 60_000);
  return { start: start.toISOString(), end: end.toISOString() };
}
