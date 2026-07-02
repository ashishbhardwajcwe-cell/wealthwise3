"use client";

import { useState, useMemo } from "react";
import type { PmsStrategy } from "@/lib/investment-data";
import {
  Th, PlainTh, fmtPct, pillBtn,
  useTableSort, sortRows, latestAmfiDate,
} from "@/components/tables/table-utils";

type SortKey = "strategyName" | "manager" | "category" | "aumCr" | "y1" | "y3" | "y5";

const TEXT_KEYS = ["strategyName", "manager", "category"] as const;

interface Props {
  strategies: PmsStrategy[];
}

export function PMSTable({ strategies }: Props) {
  const [filter, setFilter] = useState<string>("All");
  const { sortBy, sortDir, toggleSort } = useTableSort<SortKey>("y3", "desc", TEXT_KEYS);

  const categories = useMemo(() => {
    const set = new Set<string>();
    strategies.forEach((s) => { if (s.category) set.add(s.category); });
    return ["All", ...Array.from(set).sort()];
  }, [strategies]);

  const rows = useMemo(() => {
    let r = strategies;
    if (filter !== "All") r = r.filter((s) => s.category === filter);
    return sortRows(r, getValue, sortBy, sortDir);
  }, [strategies, filter, sortBy, sortDir]);

  const latestAsOf = useMemo(() => latestAmfiDate(strategies.map((s) => s.asOfDate)), [strategies]);

  return (
    <section className="py-16 bg-white">
      <div className="container-wide">
        <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
          <div>
            <span className="eyebrow">Live tracker</span>
            <h2 className="mt-2">PMS strategies on our radar</h2>
            <p className="text-sm text-[var(--color-slate)] mt-2">
              {strategies.length} {strategies.length === 1 ? "strategy" : "strategies"} tracked. Updated monthly.
              {latestAsOf && <span> Latest data: {latestAsOf}</span>}
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            {categories.map((c) => (
              <button key={c} onClick={() => setFilter(c)} className={pillBtn(filter === c)}>
                {c}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-[var(--color-silver)]/40">
          <table className="w-full text-sm">
            <thead className="bg-[var(--color-parchment)]">
              <tr>
                <Th label="Strategy" k="strategyName" sortBy={sortBy} sortDir={sortDir} onSort={toggleSort} align="left" />
                <Th label="Manager" k="manager" sortBy={sortBy} sortDir={sortDir} onSort={toggleSort} align="left" />
                <Th label="Category" k="category" sortBy={sortBy} sortDir={sortDir} onSort={toggleSort} align="left" />
                <Th label="AUM" k="aumCr" sortBy={sortBy} sortDir={sortDir} onSort={toggleSort} align="right" />
                <Th label="1Y" k="y1" sortBy={sortBy} sortDir={sortDir} onSort={toggleSort} align="right" />
                <Th label="3Y" k="y3" sortBy={sortBy} sortDir={sortDir} onSort={toggleSort} align="right" />
                <Th label="5Y" k="y5" sortBy={sortBy} sortDir={sortDir} onSort={toggleSort} align="right" />
                <PlainTh align="right">Fees</PlainTh>
                <PlainTh align="right">As of</PlainTh>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr><td colSpan={9} className="px-4 py-12 text-center text-[var(--color-slate)]">No strategies in this category yet.</td></tr>
              ) : rows.map((s) => (
                <tr key={s._id} className="border-t border-[var(--color-silver)]/30 hover:bg-[var(--color-parchment)]/40">
                  <td className="px-4 py-3 font-semibold text-[var(--color-navy)]">{s.strategyName}</td>
                  <td className="px-4 py-3 text-[var(--color-slate)]">{s.manager}</td>
                  <td className="px-4 py-3 text-[var(--color-slate)]">{s.category ?? "—"}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{s.aumCr ? `₹${s.aumCr.toLocaleString("en-IN")} Cr` : "—"}</td>
                  <td className={`px-4 py-3 text-right tabular-nums font-semibold ${returnColor(s.returns?.y1)}`}>{fmtPct(s.returns?.y1)}</td>
                  <td className={`px-4 py-3 text-right tabular-nums font-semibold ${returnColor(s.returns?.y3)}`}>{fmtPct(s.returns?.y3)}</td>
                  <td className={`px-4 py-3 text-right tabular-nums font-semibold ${returnColor(s.returns?.y5)}`}>{fmtPct(s.returns?.y5)}</td>
                  <td className="px-4 py-3 text-right text-xs text-[var(--color-slate)] tabular-nums">{fmtFees(s.fees)}</td>
                  <td className="px-4 py-3 text-right text-xs text-[var(--color-slate)] tabular-nums">{s.asOfDate ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="text-[11px] text-[var(--color-slate)] mt-4 italic leading-relaxed">
          Data sourced from PMS Bazaar monthly digests, manager factsheets, and our own diligence. Returns are CAGR.
          Past performance does not guarantee future performance. Minimum investment in PMS is ₹50L per SEBI mandate.
          Not a recommendation.
        </p>
      </div>
    </section>
  );
}

function getValue(s: PmsStrategy, key: SortKey): string | number | undefined {
  if (key === "strategyName") return s.strategyName;
  if (key === "manager") return s.manager;
  if (key === "category") return s.category;
  if (key === "aumCr") return s.aumCr;
  if (key === "y1") return s.returns?.y1;
  if (key === "y3") return s.returns?.y3;
  if (key === "y5") return s.returns?.y5;
  return undefined;
}

function returnColor(v?: number) {
  if (v === undefined || v === null) return "text-[var(--color-slate)]";
  if (v >= 15) return "text-[var(--color-emerald)]";
  if (v >= 8) return "text-[var(--color-navy)]";
  if (v >= 0) return "text-[var(--color-slate)]";
  return "text-[var(--color-ruby)]";
}

function fmtFees(fees?: PmsStrategy["fees"]) {
  if (!fees) return "—";
  const parts: string[] = [];
  if (fees.fixed !== undefined) parts.push(`${fees.fixed}%`);
  if (fees.performance !== undefined) parts.push(`+ ${fees.performance}%`);
  if (fees.hurdle !== undefined) parts.push(`(${fees.hurdle}%)`);
  return parts.join(" ") || "—";
}
