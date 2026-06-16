"use client";

import { useMemo, useState } from "react";
import { ArrowUpDown, ArrowDown, ArrowUp, Search, Download, X } from "lucide-react";
import type { MFLiveRow } from "@/lib/mutual-funds";
import { MF_CATEGORIES } from "@/lib/mutual-funds";
import { Sparkline } from "./Sparkline";
import { StarButton } from "./StarButton";
import { InfoTip } from "@/components/InfoTip";
import { downloadCsv } from "@/lib/csv-export";
import { useWatchlist } from "@/lib/use-watchlist";

type SortKey = "name" | "amc" | "category" | "nav" | "return6m" | "return1y" | "return3y" | "return5y";

interface Props {
  rows: MFLiveRow[];
  /** Heading for the section. Defaults to "Mutual funds we track". */
  title?: string;
  /** Subtitle. */
  subtitle?: string;
  /** Eyebrow label. */
  eyebrow?: string;
  /** Whether to show the category filter pills. */
  showCategoryFilter?: boolean;
}

export function MFLiveTable({
  rows,
  title = "Mutual funds we track",
  subtitle,
  eyebrow = "Live tracker",
  showCategoryFilter = true,
}: Props) {
  const [filter, setFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<SortKey>("return3y");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [watchOnly, setWatchOnly] = useState(false);
  const watchlist = useWatchlist();

  const filtered = useMemo(() => {
    let r = rows;
    if (filter !== "all") r = r.filter((row) => row.category === filter);
    if (watchOnly) r = r.filter((row) => watchlist.has(`mf:${row.schemeCode}`));
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
  }, [rows, filter, search, sortBy, sortDir, watchOnly, watchlist]);

  function toggleSort(key: SortKey) {
    if (sortBy === key) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else {
      setSortBy(key);
      setSortDir(key === "name" || key === "amc" || key === "category" ? "asc" : "desc");
    }
  }

  const latestAsOf = useMemo(() => {
    const dates = rows.map((r) => r.asOf).filter(Boolean) as string[];
    return dates.length > 0 ? dates[0] : null;
  }, [rows]);

  const categoryName = (slug: string) => MF_CATEGORIES.find((c) => c.slug === slug)?.name ?? slug;
  const usedCategories = useMemo(() => {
    const set = new Set(rows.map((r) => r.category));
    return MF_CATEGORIES.filter((c) => set.has(c.slug));
  }, [rows]);

  const filtersActive = filter !== "all" || search.trim() !== "" || watchOnly;

  function resetFilters() {
    setFilter("all");
    setSearch("");
    setWatchOnly(false);
  }

  function exportCsv() {
    const headers = ["Fund", "AMC", "Category", "CRISIL Rating", "NAV (INR)", "6M %", "1Y CAGR %", "3Y CAGR %", "5Y CAGR %", "Expense %", "As of", "Scheme code"];
    downloadCsv(`auris-mutual-funds-${new Date().toISOString().slice(0, 10)}.csv`, headers, filtered, (r, h) => {
      switch (h) {
        case "Fund":        return r.name;
        case "AMC":         return r.amc;
        case "Category":    return categoryName(r.category);
        case "CRISIL Rating": return r.crisilRating ?? "";
        case "NAV (INR)":   return r.nav?.toFixed(4) ?? "";
        case "6M %":        return r.return6m?.toFixed(2) ?? "";
        case "1Y CAGR %":   return r.return1y?.toFixed(2) ?? "";
        case "3Y CAGR %":   return r.return3y?.toFixed(2) ?? "";
        case "5Y CAGR %":   return r.return5y?.toFixed(2) ?? "";
        case "Expense %":   return r.expenseRatio?.toFixed(2) ?? "";
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
          <span className="eyebrow inline-flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--color-emerald)] opacity-60" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[var(--color-emerald)]" />
            </span>
            {eyebrow}
          </span>
          <h2 className="mt-2">{title}</h2>
          <p className="text-sm text-[var(--color-slate)] mt-2">
            {subtitle ?? (
              <>
                {rows.length} hand-picked funds across {usedCategories.length} categories. NAVs from AMFI India daily feed; returns from MFAPI historical NAVs.
                {latestAsOf && <span> NAV as of {latestAsOf}. Click any column to sort.</span>}
              </>
            )}
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
              placeholder="Search fund name or AMC..."
              className="w-full pl-9 pr-3 py-2 text-sm border border-[var(--color-silver)]/50 rounded-lg focus:outline-none focus:border-[var(--color-gold)] bg-white"
            />
          </div>
          {showCategoryFilter && (
            <div className="flex gap-1 flex-wrap">
              <button onClick={() => setFilter("all")} className={pillBtn(filter === "all")}>All</button>
              {usedCategories.map((c) => (
                <button key={c.slug} onClick={() => setFilter(c.slug)} className={pillBtn(filter === c.slug)}>
                  {c.name}
                </button>
              ))}
            </div>
          )}
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
                <Th label="Fund"     k="name"     sortBy={sortBy} sortDir={sortDir} onSort={toggleSort} align="left" />
                <Th label="AMC"      k="amc"      sortBy={sortBy} sortDir={sortDir} onSort={toggleSort} align="left"  tip="Asset Management Company — the firm that runs the fund (e.g. SBI, HDFC, ICICI Prudential)." />
                <Th label="Category" k="category" sortBy={sortBy} sortDir={sortDir} onSort={toggleSort} align="left" />
                <th className="px-4 py-3 text-center font-semibold text-[var(--color-slate)] text-[10px] uppercase tracking-wider">
                  <span className="inline-flex items-center gap-1 justify-center">Rating <InfoTip text="CRISIL rating (1–5), via Kuvera — based on risk-adjusted returns. Higher is better. Shown where available." /></span>
                </th>
                <Th label="NAV (₹)"  k="nav"      sortBy={sortBy} sortDir={sortDir} onSort={toggleSort} align="right" tip="Net Asset Value — the per-unit price of the fund as published daily by AMFI." />
                <Th label="6M"       k="return6m" sortBy={sortBy} sortDir={sortDir} onSort={toggleSort} align="right" tip="Simple percent change over the trailing 6 months (not annualised — the window is shorter than a year)." />
                <Th label="1Y CAGR"  k="return1y" sortBy={sortBy} sortDir={sortDir} onSort={toggleSort} align="right" tip="Compound Annual Growth Rate over the trailing 1 year. Annualised return as if it compounded smoothly." />
                <Th label="3Y CAGR"  k="return3y" sortBy={sortBy} sortDir={sortDir} onSort={toggleSort} align="right" tip="Annualised return over the trailing 3 years — a more honest read than 1Y." />
                <Th label="5Y CAGR"  k="return5y" sortBy={sortBy} sortDir={sortDir} onSort={toggleSort} align="right" tip="Annualised return over the trailing 5 years — the timeframe SEBI suggests for equity funds." />
                <th className="px-4 py-3 text-center font-semibold text-[var(--color-slate)] text-[10px] uppercase tracking-wider">
                  <span className="inline-flex items-center gap-1">30d <InfoTip text="Sparkline of the last 30 NAV points from MFAPI, oldest left, newest right." /></span>
                </th>
                <th className="px-4 py-3 text-right font-semibold text-[var(--color-slate)] text-[10px] uppercase tracking-wider">As of</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={13} className="px-4 py-12 text-center text-[var(--color-slate)]">No funds match the filter.</td></tr>
              ) : filtered.map((r) => {
                const sparklineUp =
                  r.sparkline30d.length >= 2 &&
                  r.sparkline30d[r.sparkline30d.length - 1] >= r.sparkline30d[0];
                const wid = `mf:${r.schemeCode}`;
                return (
                  <tr key={r.schemeCode + r.name} className="border-t border-[var(--color-silver)]/30 hover:bg-[var(--color-parchment)]/40">
                    <td className="px-2 py-3 text-center">
                      <StarButton id={wid} starred={watchlist.has(wid)} onToggle={watchlist.toggle} />
                    </td>
                    <td className="px-4 py-3 font-semibold text-[var(--color-navy)]">{r.name}</td>
                    <td className="px-4 py-3 text-[var(--color-slate)] text-xs">{r.amc}</td>
                    <td className="px-4 py-3 text-xs">
                      <span className="px-2 py-0.5 rounded-full bg-[var(--color-sand)]/60 text-[var(--color-slate)] font-semibold">
                        {categoryName(r.category)}
                      </span>
                    </td>
                    <RatingCell value={r.crisilRating} />
                    <td className="px-4 py-3 text-right tabular-nums font-semibold text-[var(--color-navy)]">
                      {r.nav != null ? r.nav.toFixed(2) : <span className="text-[var(--color-slate)]/60">—</span>}
                    </td>
                    <ReturnCell value={r.return6m} />
                    <ReturnCell value={r.return1y} />
                    <ReturnCell value={r.return3y} />
                    <ReturnCell value={r.return5y} />
                    <ExpenseCell value={r.expenseRatio} />
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
          NAVs from AMFI India&apos;s daily feed (~10 PM IST). Returns computed as annualised CAGR using historical NAVs from MFAPI.
          CRISIL rating and expense ratio via Kuvera, shown where available. All schemes shown are Direct/Growth plans. Past
          performance is not indicative of future returns. This list is editorial, not a recommendation. Read scheme-related
          documents carefully before investing.
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

export function FilterStatus({
  active,
  shown,
  total,
  onReset,
}: {
  active: boolean;
  shown: number;
  total: number;
  onReset: () => void;
}) {
  if (!active) return <div className="h-2" />;
  return (
    <div className="flex items-center justify-between gap-2 mb-2 text-xs text-[var(--color-slate)]">
      <span>
        Showing <strong className="text-[var(--color-navy)]">{shown}</strong> of {total}
      </span>
      <button
        onClick={onReset}
        className="inline-flex items-center gap-1 text-[var(--color-gold-dim)] hover:text-[var(--color-navy)] font-semibold"
      >
        <X className="w-3 h-3" /> Reset filters
      </button>
    </div>
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

function Th({ label, k, sortBy, sortDir, onSort, align = "left", tip }: {
  label: string; k: SortKey;
  sortBy: SortKey; sortDir: "asc" | "desc";
  onSort: (k: SortKey) => void; align?: "left" | "right";
  tip?: string;
}) {
  const active = sortBy === k;
  const Icon = !active ? ArrowUpDown : sortDir === "asc" ? ArrowUp : ArrowDown;
  return (
    <th className={`px-4 py-3 ${align === "right" ? "text-right" : "text-left"}`}>
      <span className={`inline-flex items-center gap-1.5 ${align === "right" ? "justify-end" : ""}`}>
        <button
          onClick={() => onSort(k)}
          className={`inline-flex items-center gap-1 text-[10px] uppercase tracking-wider hover:text-[var(--color-navy)] ${
            active ? "text-[var(--color-navy)] font-bold" : "text-[var(--color-slate)] font-semibold"
          }`}
        >
          {label}
          <Icon className={`w-3 h-3 ${active ? "text-[var(--color-gold-dim)]" : "opacity-40"}`} />
        </button>
        {tip && <InfoTip text={tip} />}
      </span>
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

function RatingCell({ value }: { value: number | null }) {
  if (value == null) {
    return <td className="px-4 py-3 text-center text-[var(--color-slate)]/40 tabular-nums">—</td>;
  }
  const n = Math.max(0, Math.min(5, Math.round(value)));
  return (
    <td className="px-4 py-3 text-center whitespace-nowrap" title={`CRISIL ${n}/5`}>
      <span className="text-[var(--color-gold-dim)] tracking-tight">{"★".repeat(n)}</span>
      <span className="text-[var(--color-silver)] tracking-tight">{"★".repeat(5 - n)}</span>
    </td>
  );
}

function ExpenseCell({ value }: { value: number | null }) {
  if (value == null) {
    return <td className="px-4 py-3 text-right text-[var(--color-slate)]/40 tabular-nums">—</td>;
  }
  return <td className="px-4 py-3 text-right tabular-nums text-[var(--color-navy)]">{value.toFixed(2)}%</td>;
}
