"use client";

import { useMemo, useState } from "react";
import { Search, TrendingUp, TrendingDown, Minus, Download } from "lucide-react";
import type { CoinMarketRow } from "@/lib/crypto";
import { Sparkline } from "@/components/markets/Sparkline";
import { StarButton } from "@/components/markets/StarButton";
import { InfoTip } from "@/components/InfoTip";
import {
  Th, PlainTh, FilterStatus, LiveEyebrow,
  useTableSort, sortRows,
} from "@/components/tables/table-utils";
import { downloadCsv } from "@/lib/csv-export";
import { useWatchlist } from "@/lib/use-watchlist";

type SortKey =
  | "rank" | "name" | "priceInr"
  | "change24h" | "change7d" | "change30d"
  | "change1y" | "change2y" | "change3y" | "change5y" | "change10y"
  | "volume" | "marketCap" | "athChange";

type Period = "short" | "long";

interface Props {
  coins: CoinMarketRow[];
  usdPrices?: Record<string, number>;
}

const TOP_FILTERS = [10, 25, 50, 100];

// text columns and rank sort ascending by default; numeric columns descending.
const ASC_KEYS = ["rank", "name"] as const;

export function CryptoLiveTable({ coins, usdPrices = {} }: Props) {
  const [topN, setTopN] = useState(50);
  const [search, setSearch] = useState("");
  const [watchOnly, setWatchOnly] = useState(false);
  const [period, setPeriod] = useState<Period>("short");
  const { sortBy, sortDir, toggleSort, setSortBy, setSortDir } =
    useTableSort<SortKey>("rank", "asc", ASC_KEYS);
  const watchlist = useWatchlist();

  // 3Y/5Y/10Y are only populated when a paid CoinGecko data plan is configured
  // (the free tier can't return multi-year history). Hide those columns rather
  // than show empty/mislabeled figures; they appear automatically once data exists.
  const hasLongTerm = coins.some(
    (c) => c.change2yPct != null || c.change3yPct != null || c.change5yPct != null || c.change10yPct != null,
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let rows = coins.slice(0, topN);
    if (watchOnly) rows = rows.filter((c) => watchlist.has(`crypto:${c.id}`));
    if (q) {
      rows = rows.filter((c) =>
        c.name.toLowerCase().includes(q) ||
        c.symbol.toLowerCase().includes(q),
      );
    }
    return sortRows(rows, getValue, sortBy, sortDir);
  }, [coins, topN, search, sortBy, sortDir, watchOnly, watchlist]);

  const filtersActive = search.trim() !== "" || topN !== 50 || watchOnly;

  function resetFilters() {
    setSearch("");
    setTopN(50);
    setWatchOnly(false);
  }

  if (coins.length === 0) {
    return (
      <section className="py-12 bg-white">
        <div className="container-wide">
          <p className="text-sm text-[var(--color-slate)] text-center italic">
            Live prices are refreshing — please check back in a moment.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="py-12 md:py-16 bg-white border-y border-[var(--color-silver)]/30">
      <div className="container-wide">
        <div className="mb-6">
          <LiveEyebrow>Live screener</LiveEyebrow>
          <h2 className="mt-2">Cryptocurrency screener</h2>
          <p className="text-sm text-[var(--color-slate)] mt-2">
            {coins.length} coins, refreshed every 5 minutes. Click any column header to sort.
            <span className="text-[var(--color-slate)]/70"> Prices via CoinGecko.</span>
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
              placeholder="Search coin name or symbol..."
              className="w-full pl-9 pr-3 py-2 text-sm border border-[var(--color-silver)]/50 rounded-lg focus:outline-none focus:border-[var(--color-gold)] bg-white"
            />
          </div>
          <div className="flex gap-1">
            {TOP_FILTERS.map((n) => (
              <button
                key={n}
                onClick={() => setTopN(n)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                  topN === n
                    ? "bg-[var(--color-navy)] text-[var(--color-cream)] border-[var(--color-navy)]"
                    : "bg-white text-[var(--color-navy)] border-[var(--color-silver)]/40 hover:border-[var(--color-gold)]"
                }`}
              >
                Top {n}
              </button>
            ))}
          </div>
          <div className="flex gap-1 p-0.5 bg-[var(--color-sand)]/40 rounded-lg border border-[var(--color-silver)]/40">
            <button
              onClick={() => { setPeriod("short"); if (["change1y","change2y","change3y","change5y","change10y"].includes(sortBy)) { setSortBy("change24h"); setSortDir("desc"); } }}
              className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors ${
                period === "short" ? "bg-white text-[var(--color-navy)] shadow-sm" : "text-[var(--color-slate)] hover:text-[var(--color-navy)]"
              }`}
              title="Show 24h / 7d / 30d returns"
            >
              Short
            </button>
            <button
              onClick={() => { setPeriod("long"); if (["change24h","change7d","change30d"].includes(sortBy)) { setSortBy("change1y"); setSortDir("desc"); } }}
              className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors ${
                period === "long" ? "bg-white text-[var(--color-navy)] shadow-sm" : "text-[var(--color-slate)] hover:text-[var(--color-navy)]"
              }`}
              title="Show 1Y / 2Y / 3Y / 5Y / 10Y returns"
            >
              Long
            </button>
          </div>
          <button
            onClick={() => setWatchOnly((v) => !v)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
              watchOnly
                ? "bg-[var(--color-navy)] text-[var(--color-cream)] border-[var(--color-navy)]"
                : "bg-white text-[var(--color-navy)] border-[var(--color-silver)]/40 hover:border-[var(--color-gold)]"
            }`}
            title={watchOnly ? "Show all" : "Show only starred"}
          >
            ★ Watchlist{watchlist.count > 0 && <span className="ml-1 opacity-70">({watchlist.count})</span>}
          </button>
          <button
            onClick={() => {
              const headers = ["Rank", "Coin", "Symbol", "Price (INR)", "Price (USD)", "24h %", "7d %", "30d %", "1Y %", ...(hasLongTerm ? ["2Y %", "3Y %", "5Y %", "10Y %"] : []), "24h Volume (INR)", "Market Cap (INR)", "From ATH %"];
              downloadCsv(`pmc-crypto-${new Date().toISOString().slice(0, 10)}.csv`, headers, filtered, (c, h) => {
                switch (h) {
                  case "Rank":              return c.rank;
                  case "Coin":              return c.name;
                  case "Symbol":            return c.symbol.toUpperCase();
                  case "Price (INR)":       return c.priceInr.toFixed(4);
                  case "Price (USD)":       return usdPrices[c.id]?.toFixed(4) ?? "";
                  case "24h %":             return c.change24hPct?.toFixed(2) ?? "";
                  case "7d %":              return c.change7dPct?.toFixed(2) ?? "";
                  case "30d %":             return c.change30dPct?.toFixed(2) ?? "";
                  case "1Y %":              return c.change1yPct?.toFixed(2) ?? "";
                  case "2Y %":              return c.change2yPct?.toFixed(2) ?? "";
                  case "3Y %":              return c.change3yPct?.toFixed(2) ?? "";
                  case "5Y %":              return c.change5yPct?.toFixed(2) ?? "";
                  case "10Y %":             return c.change10yPct?.toFixed(2) ?? "";
                  case "24h Volume (INR)":  return c.volume24hInr;
                  case "Market Cap (INR)":  return c.marketCapInr;
                  case "From ATH %":        return c.athChangePct?.toFixed(2) ?? "";
                  default:                  return "";
                }
              });
            }}
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
          total={Math.min(topN, coins.length)}
          onReset={resetFilters}
        />

        <div className="overflow-x-auto rounded-xl border border-[var(--color-silver)]/40">
          <table className="w-full text-sm">
            <thead className="bg-[var(--color-parchment)] sticky top-0 z-10">
              <tr>
                <th className="px-2 py-3 w-8"></th>
                <Th label="#"           k="rank"       sortBy={sortBy} sortDir={sortDir} onSort={toggleSort} align="left"  tip="Rank by market capitalisation (largest first), per CoinGecko." />
                <Th label="Coin"        k="name"       sortBy={sortBy} sortDir={sortDir} onSort={toggleSort} align="left" />
                <Th label="Price (INR)" k="priceInr"   sortBy={sortBy} sortDir={sortDir} onSort={toggleSort} align="right" tip="Last traded price in Indian Rupees, derived from CoinGecko's INR feed." />
                <PlainTh align="right">USD</PlainTh>
                {period === "short" ? (
                  <>
                    <Th label="24h %"       k="change24h"  sortBy={sortBy} sortDir={sortDir} onSort={toggleSort} align="right" tip="Percent change over the last 24 hours." />
                    <Th label="7d %"        k="change7d"   sortBy={sortBy} sortDir={sortDir} onSort={toggleSort} align="right" tip="Percent change over the last 7 days." />
                    <Th label="30d %"       k="change30d"  sortBy={sortBy} sortDir={sortDir} onSort={toggleSort} align="right" tip="Percent change over the last 30 days." />
                  </>
                ) : (
                  <>
                    <Th label="1Y"  k="change1y"  sortBy={sortBy} sortDir={sortDir} onSort={toggleSort} align="right" tip="Percent change over the trailing 1 year. From CoinGecko's live feed." />
                    {hasLongTerm && (
                      <>
                        <Th label="2Y"  k="change2y"  sortBy={sortBy} sortDir={sortDir} onSort={toggleSort} align="right" tip="Total percent change over the trailing 2 years (not annualised — crypto convention). Available for the top coins by market cap." />
                        <Th label="3Y"  k="change3y"  sortBy={sortBy} sortDir={sortDir} onSort={toggleSort} align="right" tip="Total percent change over the trailing 3 years (not annualised — crypto convention). Available for the top coins by market cap." />
                        <Th label="5Y"  k="change5y"  sortBy={sortBy} sortDir={sortDir} onSort={toggleSort} align="right" tip="Total percent change over the trailing 5 years. Many coins didn't exist that long — shown as ‘—’ where data is missing." />
                        <Th label="10Y" k="change10y" sortBy={sortBy} sortDir={sortDir} onSort={toggleSort} align="right" tip="Total percent change over the trailing 10 years. Mostly meaningful for BTC, LTC, XRP, ETH — others didn't exist." />
                      </>
                    )}
                  </>
                )}
                <Th label="24h Volume"  k="volume"     sortBy={sortBy} sortDir={sortDir} onSort={toggleSort} align="right" tip="Total INR value traded across exchanges in the last 24 hours. High volume = better liquidity." />
                <Th label="Market Cap"  k="marketCap"  sortBy={sortBy} sortDir={sortDir} onSort={toggleSort} align="right" tip="Circulating supply × current price. The total market value of the coin." />
                <Th label="From ATH"    k="athChange"  sortBy={sortBy} sortDir={sortDir} onSort={toggleSort} align="right" tip="Distance from the All-Time High. -40% means the coin is 40% below its peak ever." />
                <PlainTh align="center">
                  <span className="inline-flex items-center gap-1 justify-center">7d chart <InfoTip text="Hourly price sparkline for the past 7 days." /></span>
                </PlainTh>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={14} className="px-4 py-12 text-center text-[var(--color-slate)]">No coins match the filter.</td></tr>
              ) : filtered.map((c) => (
                <tr key={c.id} className="border-t border-[var(--color-silver)]/30 hover:bg-[var(--color-parchment)]/40">
                  <td className="px-2 py-3 text-center">
                    <StarButton id={`crypto:${c.id}`} starred={watchlist.has(`crypto:${c.id}`)} onToggle={watchlist.toggle} />
                  </td>
                  <td className="px-4 py-3 text-xs tabular-nums text-[var(--color-slate)]">{c.rank}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={c.image} alt="" width={22} height={22} className="rounded-full" loading="lazy" />
                      <div className="leading-tight min-w-0">
                        <div className="font-semibold text-[var(--color-navy)] truncate">{c.name}</div>
                        <div className="text-[11px] text-[var(--color-slate)] tracking-wider">{c.symbol}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums font-semibold text-[var(--color-navy)]">{fmtPriceINR(c.priceInr)}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-xs text-[var(--color-slate)]">
                    {usdPrices[c.id] != null ? fmtPriceUSD(usdPrices[c.id]) : "—"}
                  </td>
                  {period === "short" ? (
                    <>
                      <ChangeCell value={c.change24hPct} />
                      <ChangeCell value={c.change7dPct} />
                      <ChangeCell value={c.change30dPct} />
                    </>
                  ) : (
                    <>
                      <ChangeCell value={c.change1yPct} big />
                      {hasLongTerm && (
                        <>
                          <ChangeCell value={c.change2yPct} big />
                          <ChangeCell value={c.change3yPct} big />
                          <ChangeCell value={c.change5yPct} big />
                          <ChangeCell value={c.change10yPct} big />
                        </>
                      )}
                    </>
                  )}
                  <td className="px-4 py-3 text-right tabular-nums text-xs text-[var(--color-slate)]">{fmtMarketCap(c.volume24hInr)}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-xs text-[var(--color-slate)]">{fmtMarketCap(c.marketCapInr)}</td>
                  <ChangeCell value={c.athChangePct} muted />
                  <td className="px-4 py-3">
                    <div className="flex justify-center">
                      <Sparkline points={c.sparkline7d} positive={(c.change7dPct ?? 0) >= 0} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="text-[11px] text-[var(--color-slate)] mt-4 italic leading-relaxed">
          Prices via CoinGecko, INR conversion live. India taxes crypto at 30% flat with 1% TDS on transactions over
          ₹50,000/year; losses cannot be set off against gains in other asset classes. Highly volatile. Not a
          recommendation.
        </p>
      </div>
    </section>
  );
}

function getValue(c: CoinMarketRow, k: SortKey): string | number | null {
  switch (k) {
    case "rank":       return c.rank;
    case "name":       return c.name;
    case "priceInr":   return c.priceInr;
    case "change24h":  return c.change24hPct;
    case "change7d":   return c.change7dPct;
    case "change30d":  return c.change30dPct;
    case "change1y":   return c.change1yPct;
    case "change2y":   return c.change2yPct;
    case "change3y":   return c.change3yPct;
    case "change5y":   return c.change5yPct;
    case "change10y":  return c.change10yPct;
    case "volume":     return c.volume24hInr;
    case "marketCap":  return c.marketCapInr;
    case "athChange":  return c.athChangePct;
  }
}

function ChangeCell({ value, muted, big }: { value: number | null; muted?: boolean; big?: boolean }) {
  if (value == null) return <td className="px-4 py-3 text-right text-[var(--color-slate)]/50 tabular-nums">—</td>;
  const positive = value > 0;
  const flat = Math.abs(value) < 0.01;
  const color = muted
    ? "text-[var(--color-slate)]"
    : flat
    ? "text-[var(--color-slate)]"
    : positive
    ? "text-[var(--color-emerald)]"
    : "text-[var(--color-ruby)]";
  const Icon = flat ? Minus : positive ? TrendingUp : TrendingDown;
  // Long-period returns can run into the thousands of percent for early
  // crypto holders. Switch to compact "12.4×" / "3,400%" formatting
  // when the magnitude crosses 1,000% so the table stays readable.
  const formatted = big
    ? fmtBigPct(value)
    : `${positive && !muted ? "+" : ""}${value.toFixed(2)}%`;
  return (
    <td className={`px-4 py-3 text-right tabular-nums font-semibold ${color}`}>
      <span className="inline-flex items-center gap-1 justify-end">
        {!muted && <Icon className="w-3 h-3" />}
        {formatted}
      </span>
    </td>
  );
}

function fmtBigPct(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 100_000) return `${value > 0 ? "+" : "−"}${(abs / 100).toFixed(0)}×`;
  if (abs >= 10_000)  return `${value > 0 ? "+" : "−"}${(abs / 100).toFixed(1)}×`;
  if (abs >= 1_000)   return `${value > 0 ? "+" : ""}${value.toFixed(0)}%`;
  return `${value > 0 ? "+" : ""}${value.toFixed(1)}%`;
}

// ─── Formatters ─────────────────────────────────────────────

function fmtPriceINR(n: number): string {
  if (n >= 1e7) return `₹${(n / 1e7).toFixed(2)} Cr`;
  if (n >= 1e5) return `₹${(n / 1e5).toFixed(2)} L`;
  if (n >= 100) return `₹${n.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
  if (n >= 1) return `₹${n.toFixed(2)}`;
  return `₹${n.toFixed(4)}`;
}

function fmtPriceUSD(n: number): string {
  if (n >= 1000) return `$${n.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
  if (n >= 1) return `$${n.toFixed(2)}`;
  return `$${n.toFixed(4)}`;
}

function fmtMarketCap(n: number): string {
  if (!n || n <= 0) return "—";
  if (n >= 1e12) return `₹${(n / 1e12).toFixed(2)} L Cr`;
  if (n >= 1e7) return `₹${(n / 1e7).toFixed(0)} Cr`;
  if (n >= 1e5) return `₹${(n / 1e5).toFixed(1)} L`;
  return `₹${Math.round(n).toLocaleString("en-IN")}`;
}
