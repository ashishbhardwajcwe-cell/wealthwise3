import { fmtAsOf } from "@/lib/format";

/**
 * Change indicator for the unlisted-shares card and list. The partner sends
 * only a spot price, so this shows the move between two INDICATIVE QUOTES from
 * their list — the current price and the one from the prior distinct as-of date,
 * both precomputed by the importer (previousPriceINR / previousAsOfDate) so the
 * listing never has to load the priceHistory array.
 *
 * WORDING IS DELIBERATE. These are two indicative quotes, not a realised return,
 * and the page carries a SEBI disclaimer. The label says "change in indicative
 * price since <date>" and must NEVER say "return", "gain", "profit" or
 * "performance". Keep it that way.
 *
 * It renders nothing (rather than a "0.0%" or "NaN%") unless there is a real,
 * non-zero move between two DIFFERENT dates with a usable previous price.
 */

export interface PriceChange {
  /** Signed percentage move, current vs previous. */
  pct: number;
  /** true = up (green), false = down (red). */
  up: boolean;
  /** The prior as-of date the move is measured from (ISO YYYY-MM-DD). */
  sinceDate: string;
}

/**
 * Pure: the change to show, or null when there is nothing honest to show.
 * Absorbs missing/malformed inputs silently — a bad previous value yields null,
 * never a NaN. A move that rounds to 0.0% is treated as no change.
 */
export function computePriceChange(
  current: number | null | undefined,
  previous: number | null | undefined,
  asOf: string | null | undefined,
  previousAsOf: string | null | undefined,
): PriceChange | null {
  if (typeof current !== "number" || !Number.isFinite(current)) return null;
  if (typeof previous !== "number" || !Number.isFinite(previous) || previous === 0) return null;
  // A previous price without its own date, or one stamped with the SAME date as
  // the current price, can't be labelled honestly — show nothing.
  if (!previousAsOf || !asOf || previousAsOf === asOf) return null;

  const pct = ((current - previous) / previous) * 100;
  if (!Number.isFinite(pct)) return null;
  // Non-zero only, and only once it rounds to at least 0.1% at one decimal.
  if (Math.abs(pct) < 0.05) return null;

  return { pct, up: pct > 0, sinceDate: previousAsOf };
}

export function PriceChangeBadge({
  current,
  previous,
  asOf,
  previousAsOf,
  className = "",
}: {
  current?: number | null;
  previous?: number | null;
  asOf?: string | null;
  previousAsOf?: string | null;
  className?: string;
}) {
  const change = computePriceChange(current, previous, asOf, previousAsOf);
  if (!change) return null;

  const arrow = change.up ? "▲" : "▼"; // ▲ / ▼
  const magnitude = `${Math.abs(change.pct).toFixed(1)}%`;
  const label = `Change in indicative price since ${fmtAsOf(change.sinceDate)}`;

  return (
    <span
      className={`inline-flex items-center gap-0.5 font-semibold tabular-nums ${className}`}
      style={{ color: change.up ? "var(--color-emerald)" : "var(--color-ruby)" }}
      aria-label={label}
      title={label}
    >
      <span aria-hidden="true">{arrow}</span>
      <span aria-hidden="true">{magnitude}</span>
    </span>
  );
}
