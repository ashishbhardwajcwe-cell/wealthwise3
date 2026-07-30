/**
 * Which strategies the homepage's Featured Strategies grid shows.
 *
 * This used to be `featuredPmsSubset` — the first ~6 rows off an alphabetical
 * feed, which put 1729 / 2Point2 / 360 ONE on the homepage, several of them
 * with no return figures at all. Alphabetical order is not a recommendation
 * and an empty card is not a feature.
 *
 * The rules, in the order they are applied:
 *   1. 3Y and 1Y returns must both be present — a card with no long-term
 *      figure is never shown, at any stage of relaxation.
 *   2. AUM at or above ₹100 Cr.
 *   3. Beat the benchmark in at least 2 of the 1Y / 2Y / 3Y windows.
 *   4. Ranked by 3Y alpha, descending. Alpha over the benchmark is the
 *      headline metric here, not the raw return.
 *
 * If fewer than `max` strategies qualify, the AUM floor is relaxed before the
 * beat requirement — never the other way round, and never by falling back to
 * "the first N". Which stage of the ladder actually applied comes back with
 * the selection so the copy on the page can state the real rule rather than
 * the intended one.
 *
 * Lives in lib/ rather than lib/pms.ts because it imports `beats` / `alphaFor`
 * from components/pms/strategy-shared.tsx, which imports lib/pms.ts — putting
 * this there would close an import cycle.
 */

import type { LivePmsStrategy } from "@/lib/investment-data";
import { cleanPmsStrategies } from "@/lib/pms";
import {
  type Benchmark, type Period, type Strategy,
  alphaFor, beats, toStrategy,
} from "@/components/pms/strategy-shared";

/** The windows the beat count is measured over. */
const BEAT_PERIODS: Period[] = ["1Y", "2Y", "3Y"];

/** The window the grid is ranked on, and required on every card. */
export const FEATURED_RANK_PERIOD: Period = "3Y";

/** Default number of cards the homepage grid shows. */
export const FEATURED_MAX_CARDS = 6;

/** The criteria a selection was actually made under. */
export interface FeaturedRule {
  /** ₹ crore; null once the floor has been relaxed away entirely. */
  aumFloor: number | null;
  /** Minimum number of the 1Y / 2Y / 3Y windows that beat the benchmark. */
  minBeats: number;
}

export interface FeaturedSelection {
  strategies: Strategy[];
  rule: FeaturedRule;
  /** True when the intended rule didn't fill the grid and a looser one did. */
  relaxed: boolean;
}

/**
 * The relaxation ladder, tightest first. AUM comes down before the beat
 * requirement does, so a thin month loosens "how big" before it loosens "did
 * it actually outperform".
 */
const LADDER: FeaturedRule[] = [
  { aumFloor: 100, minBeats: 2 },
  { aumFloor: 25, minBeats: 2 },
  { aumFloor: null, minBeats: 2 },
  { aumFloor: null, minBeats: 1 },
];

const qualifies = (s: Strategy, rule: FeaturedRule, bench: Benchmark): boolean =>
  (rule.aumFloor === null || (s.aum !== null && s.aum >= rule.aumFloor)) &&
  beats(s.returns, BEAT_PERIODS, bench.returns) >= rule.minBeats;

/**
 * Pick the featured strategies out of the full live feed.
 *
 * Runs on the server over the whole feed and returns only the chosen rows,
 * already mapped to the shared `Strategy` shape — which matters twice over:
 * the ~1,700-row feed never reaches the homepage payload, and each card's
 * `slug` is resolved against the COMPLETE feed (pmsStrategySlug needs it to
 * settle name collisions), so the strategy links are correct despite only six
 * rows being serialised.
 */
export function selectFeaturedStrategies(
  strategies: LivePmsStrategy[],
  benchmark: Benchmark,
  max = FEATURED_MAX_CARDS,
): FeaturedSelection {
  const clean = cleanPmsStrategies(strategies);
  const all = clean.map((s) => toStrategy(s, clean));

  // Hard requirement, never relaxed: both long-term windows must be published.
  const eligible = all.filter(
    (s) => s.returns[FEATURED_RANK_PERIOD] !== null && s.returns["1Y"] !== null,
  );

  // Ranked once — every ladder stage is a filter over the same order.
  const ranked = [...eligible].sort((a, b) => {
    const aa = alphaFor(a.returns, FEATURED_RANK_PERIOD, benchmark.returns);
    const ba = alphaFor(b.returns, FEATURED_RANK_PERIOD, benchmark.returns);
    if (aa !== null && ba !== null && aa !== ba) return ba - aa;
    if (aa !== null && ba === null) return -1;
    if (aa === null && ba !== null) return 1;
    // No benchmark for this window (alpha unavailable for both) — fall back to
    // the raw 3Y return so the order stays deterministic.
    return (b.returns[FEATURED_RANK_PERIOD] ?? 0) - (a.returns[FEATURED_RANK_PERIOD] ?? 0);
  });

  let best: FeaturedSelection = { strategies: [], rule: LADDER[0], relaxed: false };
  for (const [i, rule] of LADDER.entries()) {
    const picked = ranked.filter((s) => qualifies(s, rule, benchmark)).slice(0, max);
    if (picked.length >= max) return { strategies: picked, rule, relaxed: i > 0 };
    // Each stage is a superset of the one before, so keep the widest result —
    // and describe it with the tightest rule that produced it.
    if (picked.length > best.strategies.length) {
      best = { strategies: picked, rule, relaxed: i > 0 };
    }
  }
  return best;
}

/**
 * The selection rule as one plain sentence, for the copy above the grid.
 * Generated from the rule that actually applied — if the AUM floor or the beat
 * count had to be relaxed to fill the grid, the page says so instead of
 * claiming a standard it didn't meet.
 */
export function featuredRuleSentence(
  rule: FeaturedRule,
  benchName: string,
  asOf: string | null,
): string {
  const aum = rule.aumFloor === null ? "at any AUM" : `with AUM above ₹${rule.aumFloor} Cr`;
  const windows = `at least ${rule.minBeats} of the last 3 annual windows`;
  return `Strategies that beat the ${benchName} in ${windows}, ${aum}${asOf ? `, as on ${asOf}` : ""}.`;
}
