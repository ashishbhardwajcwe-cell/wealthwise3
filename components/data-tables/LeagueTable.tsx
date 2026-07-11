"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { LivePmsStrategy } from "@/lib/investment-data";
import {
  Th, PlainTh, pillBtn, fmtPct, fmtAumCr, fmtMinL, fmtAsOf,
  useTableSort, sortRows, latestAmfiDate,
} from "@/components/tables/table-utils";

type Period = "1Y" | "3Y" | "5Y";
type SortKey = "name" | "category" | "return" | "aumCr" | "minInvestmentL";

const TEXT_KEYS = ["name", "category"] as const;
const PERIODS: Period[] = ["1Y", "3Y", "5Y"];

function periodReturn(s: LivePmsStrategy, p: Period): number | undefined {
  return p === "1Y" ? s.returns1y : p === "3Y" ? s.returns3y : s.returns5y;
}

function getValue(s: LivePmsStrategy, key: SortKey, period: Period): string | number | undefined {
  if (key === "name") return `${s.manager} ${s.strategyName}`;
  if (key === "category") return s.category;
  if (key === "return") return periodReturn(s, period);
  if (key === "aumCr") return s.aumCr;
  if (key === "minInvestmentL") return s.minInvestmentL;
  return undefined;
}

interface Props {
  strategies: LivePmsStrategy[];
  /** Neutral, non-superlative heading — no "top"/"best" labelling. */
  heading?: string;
}

/**
 * PMS-Bazaar-style league table: filter by category, switch the return
 * period (1Y / 3Y / 5Y), and sort any column. Rendered NEUTRALLY — no
 * "top"/"best" labelling or rank badges; it is sortable data, stamped with
 * the as-of date, TWRR basis and past-performance disclaimer. Every figure
 * reads from Sanity (APMI / SEBI-mandated disclosures); nothing is hardcoded.
 */
export function LeagueTable({ strategies, heading = "PMS strategy performance" }: Props) {
  const [category, setCategory] = useState("All");
  const [period, setPeriod] = useState<Period>("3Y");
  const { sortBy, sortDir, toggleSort } = useTableSort<SortKey>("return", "desc", TEXT_KEYS);

  const categories = useMemo(() => {
    const set = new Set<string>();
    strategies.forEach((s) => { if (s.category) set.add(s.category); });
    return ["All", ...Array.from(set).sort()];
  }, [strategies]);

  const rows = useMemo(() => {
    let r = strategies;
    if (category !== "All") r = r.filter((s) => s.category === category);
    return sortRows(r, (row, key) => getValue(row, key, period), sortBy, sortDir);
  }, [strategies, category, sortBy, sortDir, period]);

  const latestAsOf = useMemo(
    () => fmtAsOf(latestAmfiDate(strategies.map((s) => s.asOfDate))),
    [strategies],
  );

  return (
    <section className="py-16 bg-white">
      <div className="container-wide">
        <div className="mb-6">
          <span className="eyebrow">Strategy table</span>
          <h2 className="mt-2">{heading}</h2>
          <p className="text-sm text-[var(--color-slate)] mt-2">
            {strategies.length} {strategies.length === 1 ? "strategy" : "strategies"} shown. Filter by category,
            switch the return period, or sort any column. As on {latestAsOf}.
          </p>
        </div>

        {/* Controls: category filter + period tabs */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-5">
          <div className="flex gap-2 flex-wrap">
            {categories.map((c) => (
              <button key={c} onClick={() => setCategory(c)} className={pillBtn(category === c)}>
                {c}
              </button>
            ))}
          </div>
          <div
            className="inline-flex self-start rounded-full border border-[var(--color-silver)]/50 p-1 bg-white"
            role="tablist"
            aria-label="Return period"
          >
            {PERIODS.map((p) => (
              <button
                key={p}
                role="tab"
                aria-selected={period === p}
                onClick={() => setPeriod(p)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                  period === p ? "bg-[var(--color-navy)] text-[var(--color-cream)]" : "text-[var(--color-slate)]"
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-[var(--color-silver)]/40">
          <table className="w-full text-sm min-w-[44rem]">
            <thead className="bg-[var(--color-parchment)]">
              <tr>
                <Th label="Manager · Strategy" k="name" sortBy={sortBy} sortDir={sortDir} onSort={toggleSort} align="left" />
                <Th label="Category" k="category" sortBy={sortBy} sortDir={sortDir} onSort={toggleSort} align="left" />
                <Th
                  label={`${period} Return`}
                  k="return"
                  sortBy={sortBy}
                  sortDir={sortDir}
                  onSort={toggleSort}
                  align="right"
                  tip="Annualised time-weighted rate of return (TWRR)."
                />
                <Th label="AUM" k="aumCr" sortBy={sortBy} sortDir={sortDir} onSort={toggleSort} align="right" />
                <Th label="Min. Investment" k="minInvestmentL" sortBy={sortBy} sortDir={sortDir} onSort={toggleSort} align="right" />
                <PlainTh align="right">Action</PlainTh>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-[var(--color-slate)]">
                    No strategies in this category yet.
                  </td>
                </tr>
              ) : (
                rows.map((s) => (
                  <tr key={s._id} className="border-t border-[var(--color-silver)]/30 hover:bg-[var(--color-parchment)]/40">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-[var(--color-navy)]">{s.strategyName}</div>
                      <div className="text-xs text-[var(--color-slate)] mt-0.5">{s.manager}</div>
                    </td>
                    <td className="px-4 py-3 text-[var(--color-slate)]">{s.category ?? "—"}</td>
                    <td className="px-4 py-3 text-right tabular-nums font-semibold text-[var(--color-navy)]">
                      {fmtPct(periodReturn(s, period))}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-[var(--color-slate)]">{fmtAumCr(s.aumCr)}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-[var(--color-slate)]">{fmtMinL(s.minInvestmentL)}</td>
                    <td className="px-4 py-3 text-right">
                      <Link href="/contact" className="btn-outline text-xs py-1.5 px-3 whitespace-nowrap">
                        Enquire
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <p className="text-[11px] text-[var(--color-slate)] mt-4 italic leading-relaxed">
          As on {latestAsOf}. Returns are annualised (TWRR). Past performance is not indicative of future returns.
          Data is compiled from APMI / SEBI-mandated disclosures for information and education only — it is not a
          recommendation, ranking or an offer to invest. Minimum investment in PMS is ₹50 lakh (SEBI-mandated).
        </p>
      </div>
    </section>
  );
}
