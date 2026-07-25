/**
 * Pure formatting/date helpers shared by client tables and server pages.
 * No "use client" here — server components (e.g. the PMS strategy pages)
 * import these directly; components/tables/table-utils.tsx re-exports them
 * for the existing client consumers.
 */

/** ISO "YYYY-MM-DD" → "31 May 2026"; returns the input unchanged if unrecognised. */
export function fmtAsOf(iso?: string | null): string {
  if (!iso) return "—";
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return iso;
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${Number(m[3])} ${months[Number(m[2]) - 1] ?? m[2]} ${m[1]}`;
}

const AMFI_MONTHS: Record<string, number> = {
  jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
  jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
};

/**
 * A feed date → Date, or null if unrecognised. Handles BOTH formats the site
 * actually carries:
 *   - AMFI-style "DD-MMM-YYYY" ("30-Jun-2026") — the AMFI NAV / gold-ETF feeds
 *   - ISO "YYYY-MM-DD" ("2026-06-30")          — everything stored in Sanity,
 *     whose asOfDate fields are all `type: "date"`, and which the importers
 *     validate as YYYY-MM-DD before writing.
 *
 * It previously accepted only the AMFI form, which silently broke the ISO
 * callers: app/sitemap.ts got null for every strategy and so emitted no
 * `lastModified` at all — dropping the freshness signal that tells crawlers to
 * re-fetch a strategy page after the monthly data refresh. latestAmfiDate()
 * also fell through to its lexicographic fallback on every Sanity-backed table
 * (right for ISO by luck, wrong the moment formats mix in one list).
 */
export function parseAmfiDate(d?: string | null): Date | null {
  if (!d) return null;

  const iso = d.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) {
    const date = new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));
    return Number.isNaN(date.getTime()) ? null : date;
  }

  const m = d.match(/^(\d{1,2})-([A-Za-z]{3})-(\d{4})$/);
  if (!m) return null;
  const month = AMFI_MONTHS[m[2].toLowerCase()];
  if (month === undefined) return null;
  const date = new Date(Number(m[3]), month, Number(m[1]));
  return Number.isNaN(date.getTime()) ? null : date;
}

/**
 * Latest date from a list of AMFI-style "DD-MMM-YYYY" date strings
 * (e.g. "30-Jun-2026"). Falls back to the last lexicographic value for
 * unrecognised formats. Returns null when the list is empty.
 */
export function latestAmfiDate(dates: Array<string | null | undefined>): string | null {
  const valid = dates.filter(Boolean) as string[];
  if (valid.length === 0) return null;
  let best: string | null = null;
  let bestTs = -Infinity;
  for (const d of valid) {
    const ts = parseAmfiDate(d)?.getTime();
    if (ts !== undefined && ts > bestTs) {
      bestTs = ts;
      best = d;
    }
  }
  // Nothing matched the AMFI format — fall back to the lexicographic max
  // (correct for ISO-style strings, and no worse than arbitrary otherwise).
  return best ?? [...valid].sort()[valid.length - 1];
}
