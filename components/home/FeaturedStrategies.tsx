"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { placeholderStrategies, strategyCategories } from "@/lib/home-content";
import type { LivePmsStrategy } from "@/lib/investment-data";
import { pmsManagerSlug } from "@/lib/pms";
import { fmtPct, fmtAumCr, fmtMinL, fmtAsOf, latestAmfiDate } from "@/components/tables/table-utils";

/** Normalised card shape shared by live and placeholder rows. */
interface DisplayCard {
  key: string;
  strategy: string;
  house: string;
  /** /pms/amc/[slug] for live rows; null for the illustrative placeholders,
   *  whose fund houses aren't real managers in the feed. */
  houseSlug: string | null;
  category: string;
  returns1y: string;
  returns3y: string;
  returns5y: string;
  aum: string;
  minInvestment: string;
}

const MAX_CARDS = 6;

/**
 * Strategy grid for the homepage. Renders the first ~6 live PMS strategies
 * (from Sanity via `getLivePmsStrategies`) when available, and falls back to
 * the illustrative placeholder array when the query returns empty. No returns
 * figures are hardcoded — live cards format numbers straight from Sanity.
 */
export function FeaturedStrategies({ strategies }: { strategies?: LivePmsStrategy[] }) {
  const isLive = !!strategies && strategies.length > 0;
  const [category, setCategory] = useState<string>("All");

  const allCards: DisplayCard[] = useMemo(() => {
    if (isLive) {
      return strategies!.map((s) => ({
        key: s._id,
        strategy: s.strategyName,
        house: s.manager,
        houseSlug: pmsManagerSlug(s.manager),
        category: s.category ?? "—",
        returns1y: fmtPct(s.returns1y),
        returns3y: fmtPct(s.returns3y),
        returns5y: fmtPct(s.returns5y),
        aum: fmtAumCr(s.aumCr),
        minInvestment: fmtMinL(s.minInvestmentL),
      }));
    }
    return placeholderStrategies.map((s, i) => ({
      key: `${s.category}-${i}`,
      strategy: s.strategy,
      house: s.fundHouse,
      houseSlug: null,
      category: s.category,
      returns1y: s.returns1y,
      returns3y: s.returns3y,
      returns5y: s.returns5y,
      aum: s.aum,
      minInvestment: s.minInvestment,
    }));
  }, [isLive, strategies]);

  const tabs: string[] = useMemo(() => {
    if (!isLive) return [...strategyCategories];
    const set = new Set<string>();
    strategies!.forEach((s) => { if (s.category) set.add(s.category); });
    return ["All", ...Array.from(set).sort()];
  }, [isLive, strategies]);

  const houseLabel = isLive ? "Manager" : "Fund House";

  const cards = useMemo(() => {
    const base = category === "All" ? allCards : allCards.filter((c) => c.category === category);
    return base.slice(0, MAX_CARDS);
  }, [category, allCards]);

  const latestAsOf = useMemo(
    () => (isLive ? fmtAsOf(latestAmfiDate(strategies!.map((s) => s.asOfDate))) : null),
    [isLive, strategies],
  );

  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-8" role="tablist" aria-label="Strategy categories">
        {tabs.map((c) => (
          <button
            key={c}
            role="tab"
            aria-selected={category === c}
            onClick={() => setCategory(c)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
              category === c
                ? "bg-[var(--color-navy)] text-[var(--color-cream)] border-[var(--color-navy)]"
                : "bg-white text-[var(--color-slate)] border-[var(--color-silver)]/60 hover:border-[var(--color-gold)]"
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      {cards.length === 0 ? (
        <p className="text-sm text-[var(--color-slate)] italic py-10 text-center">
          Strategies in this category are being onboarded — check back soon.
        </p>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {cards.map((s) => (
            <div key={s.key} className="card-soft flex flex-col">
              <div className="flex items-start justify-between gap-3 mb-4">
                <div>
                  <div className="text-[10px] uppercase tracking-wider font-semibold text-[var(--color-slate)]">Strategy</div>
                  <h3 className="text-base font-semibold mt-0.5">{s.strategy}</h3>
                  {/* Manager → its AMC page: one click from the homepage to a
                      hub listing that firm's whole range. The strategy name is
                      deliberately NOT linked here — this component receives a
                      trimmed subset of the feed (featuredPmsSubset), and
                      pmsStrategySlug needs the FULL feed to resolve name
                      collisions, so a slug built here could point at the wrong
                      page. The manager slug has no such dependency. */}
                  <div className="text-xs text-[var(--color-slate)] mt-1">
                    <span className="text-[10px] uppercase tracking-wider font-semibold">{houseLabel}</span> ·{" "}
                    {s.houseSlug ? (
                      <a href={`/pms/amc/${s.houseSlug}`} className="hover:underline">{s.house}</a>
                    ) : (
                      s.house
                    )}
                  </div>
                </div>
                <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wider px-2 py-1 rounded-full bg-[var(--color-gold)]/15 text-[var(--color-gold-dim)]">
                  {s.category}
                </span>
              </div>

              <dl className="grid grid-cols-3 gap-2 text-center border-y border-[var(--color-silver)]/30 py-3">
                {(
                  [
                    ["1Y Return", s.returns1y],
                    ["3Y Return", s.returns3y],
                    ["5Y Return", s.returns5y],
                  ] as const
                ).map(([label, value]) => (
                  <div key={label}>
                    <dt className="text-[10px] uppercase tracking-wider text-[var(--color-slate)]">{label}</dt>
                    <dd className="text-sm font-semibold text-[var(--color-navy)] mt-0.5">{value}</dd>
                  </div>
                ))}
              </dl>

              <dl className="flex justify-between text-xs text-[var(--color-slate)] py-3 flex-1">
                <div>
                  <dt className="text-[10px] uppercase tracking-wider">AUM</dt>
                  <dd className="font-semibold text-[var(--color-navy)] mt-0.5">{s.aum}</dd>
                </div>
                <div className="text-right">
                  <dt className="text-[10px] uppercase tracking-wider">Min. Investment</dt>
                  <dd className="font-semibold text-[var(--color-navy)] mt-0.5">{s.minInvestment}</dd>
                </div>
              </dl>

              <Link href="/contact" className="btn-outline text-sm w-full justify-center mt-auto">
                Enquire
              </Link>
            </div>
          ))}
        </div>
      )}

      <p className="text-[11px] text-[var(--color-slate)] italic text-center mt-6">
        {isLive && latestAsOf ? <>As on {latestAsOf} · Returns are annualised (TWRR). </> : null}
        Past performance is not indicative of future returns.
      </p>
    </div>
  );
}
