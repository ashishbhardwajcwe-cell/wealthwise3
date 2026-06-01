"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { ArrowUpDown, ArrowDown, ArrowUp, Search, TrendingUp, TrendingDown, Minus } from "lucide-react";
import type { CoinMarketRow } from "@/lib/crypto";

type SortKey =
  | "rank" | "name" | "priceInr"
  | "change24h" | "change7d"
  | "volume" | "marketCap" | "athChange";

interface Props {
  coins: CoinMarketRow[];
  usdPrices?: Record<string, number>;
}

const TOP_FILTERS = [10, 25, 50, 100];

export function CryptoLiveTable({ coins, usdPrices = {} }: Props) {
  const [topN, setTopN] = useState(50);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<SortKey>("rank");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let rows = coins.slice(0, topN);
    if (q) {
      rows = rows.filter((c) =>
        c.name.toLowerCase().includes(q) ||
        c.symbol.toLowerCase().includes(q),
      );
    }
    const dir = sortDir === "asc" ? 1 : -1;
    return [...rows].sort((a, b) => {
      const av = getValue(a, sortBy);
      const bv = getValue(b, sortBy);
      if (typeof av === "string" && typeof bv === "string") return av.localeCompare(bv) * dir;
      const an = Number(av);
      const bn = Number(bv);
      if (Number.isNaN(an) && !Number.isNaN(bn)) return 1;
      if (!Number.isNaN(an) && Number.isNaN(bn)) return -1;
      if (Number.isNaN(an) && Number.isNaN(bn)) return 0;
      return (an - bn) * dir;
    });
  }, [coins, topN, search, sortBy, sortDir]);

  function toggleSort(key: SortKey) {
    if (sortBy === key) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else {
      setSortBy(key);
      // numeric columns default to descending (biggest first); text ascending.
      setSortDir(key === "name" || key === "rank" ? "asc" : "desc");
    }
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

  const updatedAt = new Date().toLocaleTimeString("en-IN", {
    hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata",
  });

  return (
    <section className="py-12 md:py-16 bg-white border-y border-[var(--color-silver)]/30">
      <div className="container-wide">
        <div className="mb-6">
          <span className="eyebrow inline-flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--color-emerald)] opacity-60" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[var(--color-emerald)]" />
            </span>
            Live screener
          </span>
          <h2 className="mt-2">Cryptocurrency screener</h2>
          <p className="text-sm text-[var(--color-slate)] mt-2">
            {coins.length} coins, auto-refreshes every 5 min. Click any column header to sort.
            <span className="text-[var(--color-slate)]/70"> Last updated {updatedAt} IST · CoinGecko</span>
          </p>
        </div>

        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-3 mb-4">
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
          <div className="flex gap-1 ml-auto">
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
        </div>

        <div className="overflow-x-auto rounded-xl border border-[var(--color-silver)]/40">
          <table className="w-full text-sm">
            <thead className="bg-[var(--color-parchment)] sticky top-0 z-10">
              <tr>
                <Th label="#"           k="rank"       sortBy={sortBy} sortDir={sortDir} onSort={toggleSort} align="left" />
                <Th label="Coin"        k="name"       sortBy={sortBy} sortDir={sortDir} onSort={toggleSort} align="left" />
                <Th label="Price (INR)" k="priceInr"   sortBy={sortBy} sortDir={sortDir} onSort={toggleSort} align="right" />
                <th className="px-4 py-3 text-right font-semibold text-[var(--color-slate)] text-[10px] uppercase tracking-wider">USD</th>
                <Th label="24h %"       k="change24h"  sortBy={sortBy} sortDir={sortDir} onSort={toggleSort} align="right" />
                <Th label="7d %"        k="change7d"   sortBy={sortBy} sortDir={sortDir} onSort={toggleSort} align="right" />
                <Th label="24h Volume"  k="volume"     sortBy={sortBy} sortDir={sortDir} onSort={toggleSort} align="right" />
                <Th label="Market Cap"  k="marketCap"  sortBy={sortBy} sortDir={sortDir} onSort={toggleSort} align="right" />
                <Th label="From ATH"    k="athChange"  sortBy={sortBy} sortDir={sortDir} onSort={toggleSort} align="right" />
                <th className="px-4 py-3 text-center font-semibold text-[var(--color-slate)] text-[10px] uppercase tracking-wider">7d chart</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={10} className="px-4 py-12 text-center text-[var(--color-slate)]">No coins match &ldquo;{search}&rdquo;.</td></tr>
              ) : filtered.map((c) => (
                <tr key={c.id} className="border-t border-[var(--color-silver)]/30 hover:bg-[var(--color-parchment)]/40">
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
                  <ChangeCell value={c.change24hPct} />
                  <ChangeCell value={c.change7dPct} />
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
    case "volume":     return c.volume24hInr;
    case "marketCap":  return c.marketCapInr;
    case "athChange":  return c.athChangePct;
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
    <th className={`px-4 py-3 ${align === "right" ? "text-right" : "text-left"} font-semibold`}>
      <button
        onClick={() => onSort(k)}
        className={`inline-flex items-center gap-1 text-[10px] uppercase tracking-wider hover:text-[var(--color-navy)] ${
          active ? "text-[var(--color-navy)] font-bold" : "text-[var(--color-slate)]"
        }`}
      >
        {label}
        <Icon className={`w-3 h-3 ${active ? "text-[var(--color-gold-dim)]" : "opacity-40"}`} />
      </button>
    </th>
  );
}

function ChangeCell({ value, muted }: { value: number | null; muted?: boolean }) {
  if (value == null) return <td className="px-4 py-3 text-right text-[var(--color-slate)]">—</td>;
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
  return (
    <td className={`px-4 py-3 text-right tabular-nums font-semibold ${color}`}>
      <span className="inline-flex items-center gap-1 justify-end">
        {!muted && <Icon className="w-3 h-3" />}
        {positive && !muted ? "+" : ""}{value.toFixed(2)}%
      </span>
    </td>
  );
}

function Sparkline({ points, positive }: { points: number[]; positive: boolean }) {
  if (points.length === 0) return <span className="text-xs text-[var(--color-slate)]/40">—</span>;
  const w = 88;
  const h = 28;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;
  const stepX = w / (points.length - 1 || 1);
  const path = points.map((p, i) => {
    const x = i * stepX;
    const y = h - ((p - min) / range) * h;
    return `${i === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`;
  }).join(" ");
  const stroke = positive ? "var(--color-emerald)" : "var(--color-ruby)";
  const fill = positive ? "rgba(16,185,129,0.10)" : "rgba(239,68,68,0.10)";
  const areaPath = `${path} L${w},${h} L0,${h} Z`;
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden>
      <path d={areaPath} fill={fill} />
      <path d={path} fill="none" stroke={stroke} strokeWidth={1.4} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
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
