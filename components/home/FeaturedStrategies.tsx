"use client";

import { useMemo, useState } from "react";
import { placeholderStrategies, strategyCategories } from "@/lib/home-content";
import type { PmsManagerLogos } from "@/lib/investment-data";
import type { Benchmark, Period, Strategy } from "@/components/pms/strategy-shared";
import { FALLBACK_BENCHMARK } from "@/components/pms/strategy-shared";
import { StrategyCard, STRATEGY_GRID_COLUMNS } from "@/components/pms/StrategyCard";
import { EnquireModal } from "@/components/pms/EnquireModal";

/**
 * Strategy grid for the homepage.
 *
 * The cards are `StrategyCard` — the SAME component the PMS Explorer renders,
 * so the homepage shows the full tile row, the alpha chip, the consistency
 * dots, the manager logo and the category chip rather than a thinner local
 * copy showing only 1Y/3Y/5Y.
 *
 * Selection happens on the server (lib/pms-featured.ts): this component
 * receives only the handful of already-chosen, already-mapped rows, so the
 * ~1,700-row feed never lands in the homepage payload. It renders what it is
 * given, in the order it is given — the ranking is not re-derived here.
 *
 * When the live feed is empty the illustrative placeholder cards render
 * instead; those carry no figures, so they deliberately do not use
 * StrategyCard.
 */

/** The window the cards headline. Matches the selection's ranking period. */
const CARD_PERIOD: Period = "3Y";

export function FeaturedStrategies({
  strategies,
  benchmark = FALLBACK_BENCHMARK,
  managerLogos = {},
  asOf,
}: {
  /** Pre-selected, pre-mapped rows from selectFeaturedStrategies(). */
  strategies?: Strategy[];
  benchmark?: Benchmark;
  /** manager → logo URL, trimmed server-side to the featured managers. */
  managerLogos?: PmsManagerLogos;
  /** Formatted as-on date for the footnote; null when there's no live data. */
  asOf?: string | null;
}) {
  // Memoised so the `?? []` fallback doesn't hand the filters below a fresh
  // array identity on every render.
  const live = useMemo(() => strategies ?? [], [strategies]);
  const isLive = live.length > 0;
  const [category, setCategory] = useState<string>("All");
  const [enquire, setEnquire] = useState<Strategy | null>(null);

  // Chips reflect the categories present in the SELECTED set, so every chip
  // leads to at least one card.
  const tabs: string[] = useMemo(() => {
    if (!isLive) return [...strategyCategories];
    const set = new Set<string>();
    live.forEach((s) => { if (s.category) set.add(s.category); });
    return ["All", ...Array.from(set).sort()];
  }, [isLive, live]);

  const cards = useMemo(
    () => (category === "All" ? live : live.filter((s) => s.category === category)),
    [category, live],
  );

  const placeholders = useMemo(
    () => (category === "All" ? placeholderStrategies : placeholderStrategies.filter((s) => s.category === category)),
    [category],
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

      {isLive ? (
        cards.length === 0 ? (
          <p className="text-sm text-[var(--color-slate)] italic py-10 text-center">
            Strategies in this category are being onboarded — check back soon.
          </p>
        ) : (
          <div className="grid gap-4" style={{ gridTemplateColumns: STRATEGY_GRID_COLUMNS }}>
            {cards.map((s) => (
              <StrategyCard
                key={s.id}
                s={s}
                period={CARD_PERIOD}
                benchmark={benchmark}
                logoUrl={managerLogos[s.manager]}
                onEnquire={setEnquire}
              />
            ))}
          </div>
        )
      ) : placeholders.length === 0 ? (
        <p className="text-sm text-[var(--color-slate)] italic py-10 text-center">
          Strategies in this category are being onboarded — check back soon.
        </p>
      ) : (
        /* Illustrative placeholders — no live figures exist yet, so these carry
           no returns and are not StrategyCards. */
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {placeholders.map((s, i) => (
            <div key={`${s.category}-${i}`} className="card-soft flex flex-col">
              <div className="flex items-start justify-between gap-3 mb-4">
                <div>
                  <div className="text-[10px] uppercase tracking-wider font-semibold text-[var(--color-slate)]">Strategy</div>
                  <h3 className="text-base font-semibold mt-0.5">{s.strategy}</h3>
                  <div className="text-xs text-[var(--color-slate)] mt-1">
                    <span className="text-[10px] uppercase tracking-wider font-semibold">Fund House</span> · {s.fundHouse}
                  </div>
                </div>
                <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wider px-2 py-1 rounded-full bg-[var(--color-gold)]/15 text-[var(--color-gold-dim)]">
                  {s.category}
                </span>
              </div>
              <dl className="grid grid-cols-3 gap-2 text-center border-y border-[var(--color-silver)]/30 py-3">
                {([["1Y Return", s.returns1y], ["3Y Return", s.returns3y], ["5Y Return", s.returns5y]] as const).map(([label, value]) => (
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
            </div>
          ))}
        </div>
      )}

      <p className="text-[11px] text-[var(--color-slate)] italic text-center mt-6">
        {isLive && asOf ? <>As on {asOf} · Returns are annualised (TWRR) beyond 1 year; 1M and 6M are absolute. Alpha is return minus {benchmark.name}. </> : null}
        Past performance is not indicative of future returns.
      </p>

      {enquire && (
        <EnquireModal strategy={enquire.strategy} source="homepage-featured" onClose={() => setEnquire(null)} />
      )}
    </div>
  );
}
