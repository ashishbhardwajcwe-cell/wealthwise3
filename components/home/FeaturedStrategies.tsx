"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { placeholderStrategies, strategyCategories, type StrategyCategory } from "@/lib/home-content";

/**
 * Placeholder-friendly strategy grid: 6 cards rendered from a data array
 * so live APMI-backed rows can be swapped in without touching the layout.
 */
export function FeaturedStrategies() {
  const [category, setCategory] = useState<StrategyCategory>("All");

  const cards = useMemo(
    () => (category === "All" ? placeholderStrategies : placeholderStrategies.filter((s) => s.category === category)),
    [category],
  );

  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-8" role="tablist" aria-label="Strategy categories">
        {strategyCategories.map((c) => (
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
          {cards.map((s, i) => (
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
    </div>
  );
}
