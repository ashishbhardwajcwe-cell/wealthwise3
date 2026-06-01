import Image from "next/image";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import type { CoinMarketRow } from "@/lib/crypto";

interface Props {
  coins: CoinMarketRow[];
  usdPrices?: Record<string, number>;
}

/**
 * Live crypto market table. Server component — receives already-fetched
 * data so the rows are pre-rendered HTML (great for SEO and load time).
 *
 * Sparklines are inline SVGs (no Recharts overhead for 168 hourly points).
 */
export function CryptoLiveTable({ coins, usdPrices = {} }: Props) {
  if (coins.length === 0) {
    return (
      <section className="py-16 bg-white">
        <div className="container-wide">
          <p className="text-sm text-[var(--color-slate)] text-center italic">
            Live prices are refreshing — please check back in a moment.
          </p>
        </div>
      </section>
    );
  }

  const updatedAt = new Date().toLocaleTimeString("en-IN", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: "Asia/Kolkata",
  });

  return (
    <section className="py-16 bg-white">
      <div className="container-wide">
        <div className="flex flex-wrap items-end justify-between gap-3 mb-6">
          <div>
            <span className="eyebrow inline-flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--color-emerald)] opacity-60" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[var(--color-emerald)]" />
              </span>
              Live tracker
            </span>
            <h2 className="mt-2">Cryptocurrency prices</h2>
            <p className="text-sm text-[var(--color-slate)] mt-2">
              Top {coins.length} by market cap. Auto-refreshes every 5 minutes.
              Last updated {updatedAt} IST · Data via CoinGecko.
            </p>
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-[var(--color-silver)]/40">
          <table className="w-full text-sm">
            <thead className="bg-[var(--color-parchment)]">
              <tr>
                <Th align="left">#</Th>
                <Th align="left">Coin</Th>
                <Th align="right">Price (INR)</Th>
                <Th align="right">USD</Th>
                <Th align="right">24h</Th>
                <Th align="right">7d</Th>
                <Th align="right">Market Cap</Th>
                <Th align="center">7-day chart</Th>
              </tr>
            </thead>
            <tbody>
              {coins.map((c) => (
                <tr key={c.id} className="border-t border-[var(--color-silver)]/30 hover:bg-[var(--color-parchment)]/40">
                  <td className="px-4 py-3 text-xs tabular-nums text-[var(--color-slate)]">{c.rank}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={c.image} alt="" width={22} height={22} className="rounded-full" loading="lazy" />
                      <div className="leading-tight">
                        <div className="font-semibold text-[var(--color-navy)]">{c.name}</div>
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
                  <td className="px-4 py-3 text-right tabular-nums text-xs text-[var(--color-slate)]">{fmtMarketCap(c.marketCapInr)}</td>
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
          Prices via CoinGecko, INR conversion at live rate. Cryptocurrency in India is taxed at 30% flat with 1% TDS on
          transactions over ₹50,000/year; losses cannot be set off against gains in other asset classes. Cryptocurrency is
          highly volatile and may result in loss of all invested capital. Not a recommendation.
        </p>
      </div>
    </section>
  );
}

function Th({ children, align = "left" }: { children: React.ReactNode; align?: "left" | "right" | "center" }) {
  return (
    <th className={`px-4 py-3 text-${align} font-semibold text-[var(--color-slate)] text-[10px] uppercase tracking-wider`}>
      {children}
    </th>
  );
}

function ChangeCell({ value }: { value: number | null }) {
  if (value == null) {
    return <td className="px-4 py-3 text-right text-[var(--color-slate)]">—</td>;
  }
  const positive = value > 0;
  const flat = Math.abs(value) < 0.01;
  const color = flat ? "text-[var(--color-slate)]" : positive ? "text-[var(--color-emerald)]" : "text-[var(--color-ruby)]";
  const Icon = flat ? Minus : positive ? TrendingUp : TrendingDown;
  return (
    <td className={`px-4 py-3 text-right tabular-nums font-semibold ${color}`}>
      <span className="inline-flex items-center gap-1 justify-end">
        <Icon className="w-3 h-3" />
        {positive ? "+" : ""}{value.toFixed(2)}%
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
  if (n >= 1e12) return `₹${(n / 1e12).toFixed(2)} L Cr`;   // Lakh crore
  if (n >= 1e7) return `₹${(n / 1e7).toFixed(0)} Cr`;
  if (n >= 1e5) return `₹${(n / 1e5).toFixed(0)} L`;
  return `₹${Math.round(n).toLocaleString("en-IN")}`;
}
