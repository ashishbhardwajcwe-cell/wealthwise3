/**
 * Reading the derived priceHistory log of an unlisted share.
 *
 * The partner's list is an IRREGULAR feed — sometimes alternate days, sometimes
 * a fortnight or more apart. Nothing here may assume a fixed interval or a
 * contiguous series; gaps are normal, valid data. So a "3-month change" is not
 * "three array positions back" — it is resolved by DATE, and the caller is told
 * the ACTUAL date and gap it found so it can label the move honestly.
 *
 * WORDING (same rule as the card): these are two indicative quotes from a
 * partner list, not a realised return. Any UI built on this must say "change in
 * indicative price since <resolved date>", never "return", "gain", "profit" or
 * "performance", and must label with the RESOLVED date, not the requested
 * window — "since 12 May 2026", not "3-month change", unless actualDaysBack
 * genuinely lands near the request.
 *
 * Nothing renders this yet; the per-company detail pages will. It is unit-tested
 * now so the storage design is validated against the real access pattern before
 * anything is built on it.
 */

/** One point in a company's price history: an ISO date and the indicative price. */
export interface PricePoint {
  /** ISO YYYY-MM-DD. */
  d: string;
  /** Indicative (retail) price in ₹. */
  p: number;
}

export interface ChangeSince {
  /** Signed percentage move from the resolved earlier point to the latest one. */
  pct: number;
  /** The resolved earlier point's date (ISO) — label the move with THIS. */
  fromDate: string;
  /** The resolved earlier point's price (₹). */
  fromPrice: number;
  /** The real gap in days between that point and the latest — for honest labels. */
  actualDaysBack: number;
}

const DAY_MS = 86_400_000;

/** Parse a strict ISO YYYY-MM-DD to a UTC-midnight timestamp, or null. */
function parseIsoDay(d: unknown): number | null {
  if (typeof d !== "string") return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(d);
  if (!m) return null;
  const t = Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return Number.isNaN(t) ? null : t;
}

/**
 * The change from `days` ago to the latest point, resolved by date.
 *
 * Finds the NEWEST entry on or before (latest entry's date − days), returns the
 * move to the latest entry, and reports the actual date and day-gap it landed
 * on. Returns null — show nothing rather than mislabel — when:
 *   - history has fewer than two usable points;
 *   - `days` is not a positive number;
 *   - the request falls before the earliest entry (nothing on or before it);
 *   - the nearest match is more than 40% beyond the requested window (e.g. asked
 *     for 90 days, nearest is 130 back): a wrong period label is worse than none;
 *   - the earlier price is zero or the maths is otherwise not finite.
 *
 * Order-independent: it never trusts array position, only the `d` dates.
 */
export function changeSince(
  history: readonly PricePoint[] | null | undefined,
  days: number,
): ChangeSince | null {
  if (!Array.isArray(history)) return null;
  if (typeof days !== "number" || !Number.isFinite(days) || days <= 0) return null;

  const points = history
    .map((e) => (e && typeof e.p === "number" && Number.isFinite(e.p) ? { p: e.p, t: parseIsoDay(e.d), d: e.d } : null))
    .filter((e): e is { p: number; t: number; d: string } => e !== null && e.t !== null);
  if (points.length < 2) return null;

  // Latest by DATE, not by position.
  let latest = points[0];
  for (const e of points) if (e.t > latest.t) latest = e;

  const targetT = latest.t - days * DAY_MS;

  // Newest entry on or before the target date.
  let from: { p: number; t: number; d: string } | null = null;
  for (const e of points) {
    if (e.t <= targetT && (from === null || e.t > from.t)) from = e;
  }
  if (from === null) return null; // request falls before the earliest entry

  const actualDaysBack = Math.round((latest.t - from.t) / DAY_MS);
  // Reject a match that overshoots the window by more than 40%.
  if (actualDaysBack > days * 1.4) return null;
  if (from.p === 0) return null;

  const pct = ((latest.p - from.p) / from.p) * 100;
  if (!Number.isFinite(pct)) return null;

  return { pct, fromDate: from.d, fromPrice: from.p, actualDaysBack };
}
