/**
 * Server-rendered link lists shared by the PMS directory (/pms/all), the AMC
 * pages (/pms/amc/[slug]), the category pages (/pms/category/[slug]) and the
 * "Similar strategies" block on each strategy page.
 *
 * These lists exist to make ~1,700 strategy pages reachable — by a crawler as
 * much as by a reader — so every entry is a plain <a href> present in the
 * server-rendered HTML. Two deliberate choices follow from that:
 *
 *   - No "use client", no handlers. Nothing here needs interactivity, and a
 *     link that only works after hydration is not a link a crawler can follow.
 *   - Plain <a>, not next/link. next/link renders a real <a> too, but it
 *     prefetches each one as it enters the viewport — on a page carrying 100
 *     directory entries that is a burst of payload fetches for pages nobody
 *     asked for. Ordinary navigation is the right trade here.
 */

import type { LivePmsStrategy } from "@/lib/investment-data";
import { pmsStrategySlug } from "@/lib/pms";
import { formatAumCr } from "@/lib/utils";
import { toneColor, toneOf } from "@/components/pms/strategy-shared";

/** The flat shape these lists render — resolved once, per feed. */
export interface StrategyLink {
  id: string;
  slug: string;
  strategy: string;
  manager: string;
  category: string | null;
  aum: number | null;
  /** 3Y annualised return — the one figure the lists surface. */
  ret3y: number | null;
}

/** Map a feed row to a link entry. `all` is the full clean feed, so the
 *  strategy slug matches the explorer's links and the sitemap exactly. */
export function toStrategyLink(s: LivePmsStrategy, all: LivePmsStrategy[]): StrategyLink {
  return {
    id: s._id,
    slug: pmsStrategySlug(s, all),
    strategy: s.strategyName,
    manager: s.manager,
    category: s.category ?? null,
    aum: typeof s.aumCr === "number" ? s.aumCr : null,
    ret3y: typeof s.returns3y === "number" ? s.returns3y : null,
  };
}

/** One row: strategy name → its page, with the manager, AUM and 3Y return.
 *  `showManager` / `showCategory` drop whichever the surrounding page already
 *  states — an AMC page repeating one manager 40 times, or a category page
 *  repeating one category 250 times, is noise. */
export function StrategyLinkRow({
  s,
  showManager = true,
  showCategory = true,
  first = false,
}: {
  s: StrategyLink;
  showManager?: boolean;
  showCategory?: boolean;
  first?: boolean;
}) {
  const sub = [showManager ? s.manager : null, showCategory ? s.category : null].filter(Boolean).join(" · ");
  return (
    <li style={{ borderTop: first ? "none" : "1px solid var(--line)" }}>
      <a
        href={`/pms/${s.slug}`}
        className="group flex items-center justify-between gap-3 px-3.5 py-2.5 hover:bg-[var(--flat-bg)]"
      >
        <span className="min-w-0">
          <span className="font-display block truncate group-hover:underline" style={{ fontSize: 14.5, fontWeight: 600, color: "var(--ink)" }}>
            {s.strategy}
          </span>
          {sub && (
            <span className="font-ui block truncate" style={{ fontSize: 11.5, color: "var(--muted)" }}>
              {sub}
            </span>
          )}
        </span>
        <span className="flex items-center gap-4 shrink-0 text-right">
          <span className="hidden sm:block">
            <span className="font-num block" style={{ fontSize: 12.5, fontWeight: 600, color: "var(--ink)" }}>{formatAumCr(s.aum)}</span>
            <span className="font-ui block" style={{ fontSize: 10, color: "var(--muted)" }}>AUM</span>
          </span>
          <span>
            <span className="font-num block" style={{ fontSize: 13.5, fontWeight: 600, color: s.ret3y === null ? "var(--muted)" : toneColor[toneOf(s.ret3y)] }}>
              {s.ret3y === null ? "—" : `${s.ret3y.toFixed(1)}%`}
            </span>
            <span className="font-ui block" style={{ fontSize: 10, color: "var(--muted)" }}>3Y</span>
          </span>
        </span>
      </a>
    </li>
  );
}

/** A bordered card wrapping a list of strategy rows. */
export function StrategyLinkList({
  items,
  showManager = true,
  showCategory = true,
  label,
}: {
  items: StrategyLink[];
  showManager?: boolean;
  showCategory?: boolean;
  /** Accessible name for the list, when the surrounding heading isn't enough. */
  label?: string;
}) {
  if (items.length === 0) return null;
  return (
    <ul
      aria-label={label}
      className="rounded-xl bg-white overflow-hidden list-none p-0 m-0"
      style={{ border: "1px solid var(--line)" }}
    >
      {items.map((s, i) => (
        <StrategyLinkRow key={s.id} s={s} showManager={showManager} showCategory={showCategory} first={i === 0} />
      ))}
    </ul>
  );
}
