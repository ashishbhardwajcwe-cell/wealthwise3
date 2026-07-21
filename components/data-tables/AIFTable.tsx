"use client";

import { useState, useMemo } from "react";
import type { AifFund } from "@/lib/investment-data";
import {
  Th, PlainTh, fmtPct, pillBtn,
  useTableSort, sortRows, latestAmfiDate,
} from "@/components/tables/table-utils";

type SortKey = "fundName" | "manager" | "category" | "vintage" | "fundSize" | "netIrr" | "moic";

const TEXT_KEYS = ["fundName", "manager", "category"] as const;

export function AIFTable({ funds }: { funds: AifFund[] }) {
  const [filter, setFilter] = useState<string>("All");
  const { sortBy, sortDir, toggleSort } = useTableSort<SortKey>("netIrr", "desc", TEXT_KEYS);

  const categories = useMemo(() => {
    const set = new Set<string>();
    funds.forEach((f) => { if (f.category) set.add(f.category); });
    return ["All", ...Array.from(set).sort()];
  }, [funds]);

  const rows = useMemo(() => {
    let r = funds;
    if (filter !== "All") r = r.filter((f) => f.category === filter);
    return sortRows(r, getValue, sortBy, sortDir);
  }, [funds, filter, sortBy, sortDir]);

  const latestAsOf = useMemo(() => latestAmfiDate(funds.map((f) => f.asOfDate)), [funds]);

  return (
    <section className="py-16 bg-white">
      <div className="container-wide">
        <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
          <div>
            <span className="eyebrow">Live tracker</span>
            <h2 className="mt-2">AIF funds on our radar</h2>
            <p className="text-sm text-[var(--color-slate)] mt-2">
              {funds.length} {funds.length === 1 ? "fund" : "funds"} tracked.
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
                <Th label="Fund" k="fundName" sortBy={sortBy} sortDir={sortDir} onSort={toggleSort} align="left" />
                <Th label="Manager" k="manager" sortBy={sortBy} sortDir={sortDir} onSort={toggleSort} align="left" />
                <Th label="Category" k="category" sortBy={sortBy} sortDir={sortDir} onSort={toggleSort} align="left" />
                <Th label="Vintage" k="vintage" sortBy={sortBy} sortDir={sortDir} onSort={toggleSort} align="right" />
                <Th label="Size" k="fundSize" sortBy={sortBy} sortDir={sortDir} onSort={toggleSort} align="right" />
                <Th label="Net IRR" k="netIrr" sortBy={sortBy} sortDir={sortDir} onSort={toggleSort} align="right" />
                <Th label="MOIC" k="moic" sortBy={sortBy} sortDir={sortDir} onSort={toggleSort} align="right" />
                <PlainTh align="right">Fees</PlainTh>
                <PlainTh align="right">As of</PlainTh>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr><td colSpan={9} className="px-4 py-12 text-center text-[var(--color-slate)]">No funds in this category yet.</td></tr>
              ) : rows.map((f) => (
                <tr key={f._id} className="border-t border-[var(--color-silver)]/30 hover:bg-[var(--color-parchment)]/40">
                  <td className="px-4 py-3 font-semibold text-[var(--color-navy)]">{f.fundName}</td>
                  <td className="px-4 py-3 text-[var(--color-slate)]">{f.manager ?? f.sponsor ?? "—"}</td>
                  <td className="px-4 py-3 text-[var(--color-slate)] text-xs">{f.category ?? "—"}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{f.vintage ?? "—"}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{f.fundSize ? `₹${f.fundSize.toLocaleString("en-IN")} Cr` : "—"}</td>
                  <td className={`px-4 py-3 text-right tabular-nums font-semibold ${returnColor(f.returns?.netIrr)}`}>{fmtPct(f.returns?.netIrr)}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{f.returns?.moic ? `${f.returns.moic.toFixed(2)}x` : "—"}</td>
                  <td className="px-4 py-3 text-right text-xs text-[var(--color-slate)] tabular-nums">{fmtFees(f.fees)}</td>
                  <td className="px-4 py-3 text-right text-xs text-[var(--color-slate)] tabular-nums">{f.asOfDate ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="text-[11px] text-[var(--color-slate)] mt-4 italic leading-relaxed">
          Data sourced from manager PPMs and public disclosures. Net IRR and MOIC for closed-ended funds are vintage-dependent;
          comparing across vintages is misleading. SEBI minimum commitment for AIF is ₹1 Cr. Not a recommendation.
        </p>
      </div>
    </section>
  );
}

function getValue(f: AifFund, key: SortKey): string | number | undefined {
  if (key === "fundName") return f.fundName;
  if (key === "manager") return f.manager;
  if (key === "category") return f.category;
  if (key === "vintage") return f.vintage;
  if (key === "fundSize") return f.fundSize;
  if (key === "netIrr") return f.returns?.netIrr;
  if (key === "moic") return f.returns?.moic;
  return undefined;
}

function returnColor(v?: number) {
  if (v === undefined || v === null) return "text-[var(--color-slate)]";
  if (v >= 18) return "text-[var(--color-emerald)]";
  if (v >= 10) return "text-[var(--color-navy)]";
  if (v >= 0) return "text-[var(--color-slate)]";
  return "text-[var(--color-ruby)]";
}

function fmtFees(fees?: AifFund["fees"]) {
  if (!fees) return "—";
  const parts: string[] = [];
  if (fees.management !== undefined) parts.push(`${fees.management}%`);
  if (fees.carry !== undefined) parts.push(`+ ${fees.carry}%`);
  if (fees.hurdle !== undefined) parts.push(`(${fees.hurdle}%)`);
  return parts.join(" ") || "—";
}
