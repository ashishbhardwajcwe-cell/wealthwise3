"use client";

import { useMemo, useState } from "react";
import { Search, Download } from "lucide-react";
import type { MFLiveRow } from "@/lib/mutual-funds";
import { Sparkline } from "./Sparkline";
import { StarButton } from "./StarButton";
import {
  Th, PlainTh, FilterStatus, LiveEyebrow, pillBtn,
  useTableSort, sortRows, latestAmfiDate,
} from "@/components/tables/table-utils";
import { downloadCsv } from "@/lib/csv-export";
import { useWatchlist } from "@/lib/use-watchlist";

type SortKey = "name" | "amc" | "category" | "nav" | "return6m" | "return1y" | "return3y" | "return5y";

const TEXT_KEYS = ["name", "amc", "category"] as const;

const CATEGORY_LABEL: Record<string, string> = {
  "gold-etf": "Gold ETF",
  "silver-etf": "Silver ETF",
};

const CATEGORY_PILLS: Array<{ slug: string; label: string }> = [
  { slug: "all", label: "All" },
  { slug: "gold-etf", label: "Gold" },
  { slug: "silver-etf", label: "Silver" },
];

interface Props {
  rows: MFLiveRow[];
}

export function GoldSilverETFTable({ rows }: Props) {
  const [filter, setFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [watchOnly, setWatchOnly] = useState(false);
  const { sortBy, sortDir, toggleSort } = useTableSort<SortKey>("return1y", "desc", TEXT_KEYS);
  const watchlist = useWatchlist();

  const filtered = useMemo(() => {
    let r = rows;
    if (filter !== "all") r = r.filter((row) => row.category === filter);
    if (watchOnly) r = r.filter((row) => watchlist.has(`etf:${row.schemeCode}`));
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      r = r.filter((row) =>
        row.name.toLowerCase().includes(q) ||
        row.amc.toLowerCase().includes(q),
      );
    }
    return sortRows(r, getValue, sortBy, sortDir);
  }, [rows, filter, search, sortBy, sortDir, watchOnly, watchlist]);

  const latestAsOf = useMemo(() => latestAmfiDate(rows.map((r) => r.asOf)), [rows]);

  const filtersActive = filter !== "all" || search.trim() !== "" || watchOnly;

  function resetFilters() {
    setFilter("all");
    setSearch("");
    setWatchOnly(false);
  }

  function exportCsv() {
    const headers = ["ETF", "AMC", "Metal", "NAV (INR)", "6M %", "1Y CAGR %", "3Y CAGR %", "5Y CAGR %", "As of", "Scheme code"];
    downloadCsv(`auris-gold-silver-etfs-${new Date().toISOString().slice(0, 10)}.csv`, headers, filtered, (r, h) => {
      switch (h) {
        case "ETF":         return r.name;
        case "AMC":         return r.amc;
        case "Metal":       return CATEGORY_LABEL[r.category] ?? r.category;
        case "NAV (INR)":   return r.nav?.toFixed(4) ?? "";
        case "6M %":        return r.return6m?.toFixed(2) ?? "";
        case "1Y CAGR %":   return r.return1y?.toFixed(2) ?? "";
        case "3Y CAGR %":   return r.return3y?.toFixed(2) ?? "";
        case "5Y CAGR %":   return r.return5y?.toFixed(2) ?? "";
        case "As of":       return r.asOf ?? "";
        case "Scheme code": return r.schemeCode;
        default:            return "";
      }
    });
  }

  return (
    <section className="py-12 md:py-16 bg-white border-y border-[var(--color-silver)]/30">
      <div className="container-wide">
        <div className="mb-6">
          <LiveEyebrow>Indian gold &amp; silver ETFs</LiveEyebrow>
          <h2 className="mt-2">ETF NAVs &amp; returns</h2>
          <p className="text-sm text-[var(--color-slate)] mt-2">
            Live NAVs of every major Indian gold &amp; silver ETF, priced in INR. From AMFI&apos;s daily feed; returns annualised from MFAPI historical data.
            {latestAsOf && <span> NAV as of {latestAsOf}. Click any column to sort.</span>}
          </p>
        </div>

        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-3 mb-2">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-slate)]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search ETF name or AMC..."
              className="w-full pl-9 pr-3 py-2 text-sm border border-[var(--color-silver)]/50 rounded-lg focus:outline-none focus:border-[var(--color-gold)] bg-white"
            />
          </div>
          <div className="flex gap-1">
            {CATEGORY_PILLS.map((c) => (
              <button key={c.slug} onClick={() => setFilter(c.slug)} className={pillBtn(filter === c.slug)}>
                {c.label}
              </button>
            ))}
          </div>
          <button
            onClick={() => setWatchOnly((v) => !v)}
            className={pillBtn(watchOnly)}
            title={watchOnly ? "Show all" : "Show only starred"}
          >
            ★ Watchlist{watchlist.count > 0 && <span className="ml-1 opacity-70">({watchlist.count})</span>}
          </button>
          <button
            onClick={exportCsv}
            className="ml-auto inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-[var(--color-silver)]/40 text-[var(--color-navy)] bg-white hover:border-[var(--color-gold)] transition-colors"
            title="Download current view as CSV"
          >
            <Download className="w-3.5 h-3.5" />
            CSV
          </button>
        </div>

        <FilterStatus
          active={filtersActive}
          shown={filtered.length}
          total={rows.length}
          onReset={resetFilters}
        />

        <div className="overflow-x-auto rounded-xl border border-[var(--color-silver)]/40">
          <table className="w-full text-sm">
            <thead className="bg-[var(--color-parchment)] sticky top-0 z-10">
              <tr>
                <th className="px-2 py-3 w-8"></th>
                <Th label="ETF"     k="name"     sortBy={sortBy} sortDir={sortDir} onSort={toggleSort} align="left" />
                <Th label="AMC"     k="amc"      sortBy={sortBy} sortDir={sortDir} onSort={toggleSort} align="left"  tip="Asset Management Company that issues the ETF." />
                <Th label="Metal"   k="category" sortBy={sortBy} sortDir={sortDir} onSort={toggleSort} align="left" />
                <Th label="NAV (₹)" k="nav"      sortBy={sortBy} sortDir={sortDir} onSort={toggleSort} align="right" tip="Net Asset Value per ETF unit, published daily by AMFI." />
                <Th label="6M"      k="return6m" sortBy={sortBy} sortDir={sortDir} onSort={toggleSort} align="right" tip="Simple percent change over the trailing 6 months." />
                <Th label="1Y CAGR" k="return1y" sortBy={sortBy} sortDir={sortDir} onSort={toggleSort} align="right" tip="Annualised return over the trailing 1 year." />
                <Th label="3Y CAGR" k="return3y" sortBy={sortBy} sortDir={sortDir} onSort={toggleSort} align="right" tip="Annualised return over the trailing 3 years." />
                <Th label="5Y CAGR" k="return5y" sortBy={sortBy} sortDir={sortDir} onSort={toggleSort} align="right" tip="Annualised return over the trailing 5 years. Silver ETFs only launched in 2022, so most show no 5Y." />
                <PlainTh align="center">30d</PlainTh>
                <PlainTh align="right">As of</PlainTh>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={11} className="px-4 py-12 text-center text-[var(--color-slate)]">No ETFs match the filter.</td></tr>
              ) : filtered.map((r) => {
                const sparklineUp =
                  r.sparkline30d.length >= 2 &&
                  r.sparkline30d[r.sparkline30d.length - 1] >= r.sparkline30d[0];
                const wid = `etf:${r.schemeCode}`;
                return (
                  <tr key={r.schemeCode + r.name} className="border-t border-[var(--color-silver)]/30 hover:bg-[var(--color-parchment)]/40">
                    <td className="px-2 py-3 text-center">
                      <StarButton id={wid} starred={watchlist.has(wid)} onToggle={watchlist.toggle} />
                    </td>
                    <td className="px-4 py-3 font-semibold text-[var(--color-navy)]">{r.name}</td>
                    <td className="px-4 py-3 text-[var(--color-slate)] text-xs">{r.amc}</td>
                    <td className="px-4 py-3 text-xs">
                      <span className={`px-2 py-0.5 rounded-full font-semibold ${
                        r.category === "gold-etf"
                          ? "bg-[var(--color-gold)]/15 text-[var(--color-gold-dim)]"
                          : "bg-[var(--color-silver)]/25 text-[var(--color-slate)]"
                      }`}>
                        {CATEGORY_LABEL[r.category] ?? r.category}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums font-semibold text-[var(--color-navy)]">
                      {r.nav != null ? r.nav.toFixed(2) : <span className="text-[var(--color-slate)]/60">—</span>}
                    </td>
                    <ReturnCell value={r.return6m} />
                    <ReturnCell value={r.return1y} />
                    <ReturnCell value={r.return3y} />
                    <ReturnCell value={r.return5y} />
                    <td className="px-4 py-3">
                      <div className="flex justify-center">
                        <Sparkline points={r.sparkline30d} positive={sparklineUp} />
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right text-xs text-[var(--color-slate)] tabular-nums">{r.asOf ?? "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <p className="text-[11px] text-[var(--color-slate)] mt-4 italic leading-relaxed">
          Indian gold ETFs typically charge 0.3–0.7% expense ratio and track 24K gold prices. Silver ETFs launched in
          2022 — fewer products, shorter histories. Both trade on NSE/BSE during market hours; the NAV here is the
          daily-published value, and the exchange price can trade at a small premium or discount to it.
          Not a recommendation. Past performance does not guarantee future returns.
        </p>
      </div>
    </section>
  );
}

function getValue(r: MFLiveRow, key: SortKey): string | number | null {
  switch (key) {
    case "name":     return r.name;
    case "amc":      return r.amc;
    case "category": return r.category;
    case "nav":      return r.nav;
    case "return6m": return r.return6m;
    case "return1y": return r.return1y;
    case "return3y": return r.return3y;
    case "return5y": return r.return5y;
  }
}

function ReturnCell({ value }: { value: number | null }) {
  if (value == null) {
    return <td className="px-4 py-3 text-right text-[var(--color-slate)]/50 tabular-nums">—</td>;
  }
  const positive = value > 0;
  const flat = Math.abs(value) < 0.01;
  const color = flat
    ? "text-[var(--color-slate)]"
    : positive
    ? "text-[var(--color-emerald)]"
    : "text-[var(--color-ruby)]";
  return (
    <td className={`px-4 py-3 text-right tabular-nums font-semibold ${color}`}>
      {positive ? "+" : ""}{value.toFixed(1)}%
    </td>
  );
}
