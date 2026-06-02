"use client";

import { useMemo, useState } from "react";
import { ArrowUpDown, ArrowDown, ArrowUp, Search } from "lucide-react";
import type { MFLiveRow } from "@/lib/mutual-funds";

type SortKey = "name" | "amc" | "category" | "nav" | "return1y" | "return3y" | "return5y";

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
  const [sortBy, setSortBy] = useState<SortKey>("return1y");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const filtered = useMemo(() => {
    let r = rows;
    if (filter !== "all") r = r.filter((row) => row.category === filter);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      r = r.filter((row) =>
        row.name.toLowerCase().includes(q) ||
        row.amc.toLowerCase().includes(q),
      );
    }
    const dir = sortDir === "asc" ? 1 : -1;
    return [...r].sort((a, b) => {
      const av = getValue(a, sortBy);
      const bv = getValue(b, sortBy);
      if (typeof av === "string" && typeof bv === "string") return av.localeCompare(bv) * dir;
      const an = Number(av);
      const bn = Number(bv);
      const ainvalid = av == null || Number.isNaN(an);
      const binvalid = bv == null || Number.isNaN(bn);
      if (ainvalid && !binvalid) return 1;
      if (!ainvalid && binvalid) return -1;
      if (ainvalid && binvalid) return 0;
      return (an - bn) * dir;
    });
  }, [rows, filter, search, sortBy, sortDir]);

  function toggleSort(key: SortKey) {
    if (sortBy === key) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else { setSortBy(key); setSortDir(key === "name" || key === "amc" ? "asc" : "desc"); }
  }

  const latestAsOf = useMemo(() => {
    const dates = rows.map((r) => r.asOf).filter(Boolean) as string[];
    return dates.length > 0 ? dates[0] : null;
  }, [rows]);

  return (
    <section className="py-12 md:py-16 bg-white border-y border-[var(--color-silver)]/30">
      <div className="container-wide">
        <div className="mb-6">
          <span className="eyebrow inline-flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--color-emerald)] opacity-60" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[var(--color-emerald)]" />
            </span>
            Indian gold &amp; silver ETFs
          </span>
          <h2 className="mt-2">ETF NAVs &amp; returns</h2>
          <p className="text-sm text-[var(--color-slate)] mt-2">
            Live NAVs of every major Indian gold &amp; silver ETF, priced in INR. From AMFI&apos;s daily feed; returns annualised from MFAPI historical data.
            {latestAsOf && <span> NAV as of {latestAsOf}. Click any column to sort.</span>}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 mb-4">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-slate)]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search ETF or AMC..."
              className="w-full pl-9 pr-3 py-2 text-sm border border-[var(--color-silver)]/50 rounded-lg focus:outline-none focus:border-[var(--color-gold)] bg-white"
            />
          </div>
          <div className="flex gap-1 ml-auto">
            {CATEGORY_PILLS.map((p) => (
              <button key={p.slug} onClick={() => setFilter(p.slug)} className={pillBtn(filter === p.slug)}>
                {p.label}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-[var(--color-silver)]/40">
          <table className="w-full text-sm">
            <thead className="bg-[var(--color-parchment)] sticky top-0 z-10">
              <tr>
                <Th label="ETF"     k="name"     sortBy={sortBy} sortDir={sortDir} onSort={toggleSort} align="left" />
                <Th label="AMC"     k="amc"      sortBy={sortBy} sortDir={sortDir} onSort={toggleSort} align="left" />
                <Th label="Metal"   k="category" sortBy={sortBy} sortDir={sortDir} onSort={toggleSort} align="left" />
                <Th label="NAV (₹)" k="nav"      sortBy={sortBy} sortDir={sortDir} onSort={toggleSort} align="right" />
                <Th label="1Y CAGR" k="return1y" sortBy={sortBy} sortDir={sortDir} onSort={toggleSort} align="right" />
                <Th label="3Y CAGR" k="return3y" sortBy={sortBy} sortDir={sortDir} onSort={toggleSort} align="right" />
                <Th label="5Y CAGR" k="return5y" sortBy={sortBy} sortDir={sortDir} onSort={toggleSort} align="right" />
                <th className="px-4 py-3 text-right font-semibold text-[var(--color-slate)] text-[10px] uppercase tracking-wider">As of</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-12 text-center text-[var(--color-slate)]">No ETFs match the filter.</td></tr>
              ) : filtered.map((r) => (
                <tr key={r.schemeCode + r.name} className="border-t border-[var(--color-silver)]/30 hover:bg-[var(--color-parchment)]/40">
                  <td className="px-4 py-3 font-semibold text-[var(--color-navy)]">{r.name}</td>
                  <td className="px-4 py-3 text-[var(--color-slate)] text-xs">{r.amc}</td>
                  <td className="px-4 py-3 text-xs">
                    <span
                      className="px-2 py-0.5 rounded-full font-semibold"
                      style={{
                        background: r.category === "silver-etf" ? "rgba(196,205,213,0.4)" : "rgba(201,168,76,0.18)",
                        color: r.category === "silver-etf" ? "#5A6B80" : "#A08030",
                      }}
                    >
                      {CATEGORY_LABEL[r.category] ?? r.category}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums font-semibold text-[var(--color-navy)]">
                    {r.nav != null ? r.nav.toFixed(2) : <span className="text-[var(--color-slate)]/60">—</span>}
                  </td>
                  <ReturnCell value={r.return1y} />
                  <ReturnCell value={r.return3y} />
                  <ReturnCell value={r.return5y} />
                  <td className="px-4 py-3 text-right text-xs text-[var(--color-slate)] tabular-nums">{r.asOf ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="text-[11px] text-[var(--color-slate)] mt-4 italic leading-relaxed">
          Indian gold ETFs typically charge 0.3–0.7% expense ratio and track 24K gold prices. Silver ETFs launched in
          2022 — fewer products, shorter histories. Both trade on NSE/BSE during market hours; the NAV here is the daily-published value.
          Not a recommendation. Past performance does not guarantee future returns.
        </p>
      </div>
    </section>
  );
}

function pillBtn(active: boolean) {
  return `px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
    active
      ? "bg-[var(--color-navy)] text-[var(--color-cream)] border-[var(--color-navy)]"
      : "bg-white text-[var(--color-navy)] border-[var(--color-silver)]/40 hover:border-[var(--color-gold)]"
  }`;
}

function getValue(r: MFLiveRow, key: SortKey): string | number | null {
  switch (key) {
    case "name":     return r.name;
    case "amc":      return r.amc;
    case "category": return r.category;
    case "nav":      return r.nav;
    case "return1y": return r.return1y;
    case "return3y": return r.return3y;
    case "return5y": return r.return5y;
  }
}

function Th({ label, k, sortBy, sortDir, onSort, align = "left" }: {
  label: string; k: SortKey;
  sortBy: SortKey; sortDir: "asc" | "desc";
  onSort: (k: SortKey) => void; align?: "left" | "right";
}) {
  const active = sortBy === k;
  const Icon = !active ? ArrowUpDown : sortDir === "asc" ? ArrowUp : ArrowDown;
  return (
    <th className={`px-4 py-3 ${align === "right" ? "text-right" : "text-left"}`}>
      <button
        onClick={() => onSort(k)}
        className={`inline-flex items-center gap-1 text-[10px] uppercase tracking-wider hover:text-[var(--color-navy)] ${
          active ? "text-[var(--color-navy)] font-bold" : "text-[var(--color-slate)] font-semibold"
        }`}
      >
        {label}
        <Icon className={`w-3 h-3 ${active ? "text-[var(--color-gold-dim)]" : "opacity-40"}`} />
      </button>
    </th>
  );
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
