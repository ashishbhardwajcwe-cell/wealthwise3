"use client";

import Link from "next/link";
import { ArrowRight, LineChart, Bitcoin, Coins, TrendingUp } from "lucide-react";
import { MiniSymbolOverview } from "@/components/markets/MiniSymbolOverview";

interface TileSpec {
  label: string;
  symbol: string;
  caption: string;
  href: string;
  Icon: React.ComponentType<{ className?: string }>;
}

const TILES: TileSpec[] = [
  {
    label: "Sensex",
    symbol: "BSE:SENSEX",
    caption: "Indian equities",
    href: "/markets#stocks",
    Icon: LineChart,
  },
  {
    label: "Bitcoin",
    symbol: "BINANCE:BTCUSDT",
    caption: "Top cryptocurrency",
    href: "/markets#crypto",
    Icon: Bitcoin,
  },
  {
    label: "Gold Spot",
    symbol: "OANDA:XAUUSD",
    caption: "USD per troy oz",
    href: "/markets#gold",
    Icon: Coins,
  },
  {
    label: "USD/INR",
    symbol: "FX_IDC:USDINR",
    caption: "Rupee vs dollar",
    href: "/markets#stocks",
    Icon: TrendingUp,
  },
];

/**
 * Homepage teaser for /markets. Four small live charts that link into
 * the consolidated markets hub. Pure-client component — uses TradingView
 * mini-symbol embeds so the homepage incurs no server-side data fetch.
 */
export function HomeMarketsTeaser() {
  return (
    <section className="py-16 md:py-20 bg-white border-y border-[var(--color-silver)]/30">
      <div className="container-wide">
        <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
          <div>
            <span className="eyebrow inline-flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--color-emerald)] opacity-60" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[var(--color-emerald)]" />
              </span>
              Live markets
            </span>
            <h2 className="mt-2">Markets at a glance</h2>
            <p className="text-sm text-[var(--color-slate)] mt-2 max-w-xl">
              A quick look across the four asset classes we track. Open the markets hub for sortable, searchable screeners on every instrument.
            </p>
          </div>
          <Link
            href="/markets"
            className="text-sm font-semibold text-[var(--color-gold-dim)] inline-flex items-center gap-1.5 hover:gap-2 transition-all"
          >
            Open markets hub <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {TILES.map((t) => (
            <Link key={t.symbol} href={t.href} className="group">
              <div className="bg-white border border-[var(--color-silver)]/40 rounded-xl overflow-hidden hover:border-[var(--color-gold)] hover:shadow-md transition-all">
                <div className="px-4 py-3 flex items-center justify-between border-b border-[var(--color-silver)]/30">
                  <div>
                    <div className="text-sm font-semibold text-[var(--color-navy)] flex items-center gap-2">
                      <t.Icon className="w-3.5 h-3.5 text-[var(--color-gold-dim)]" />
                      {t.label}
                    </div>
                    <div className="text-[11px] text-[var(--color-slate)] mt-0.5">{t.caption}</div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-[var(--color-slate)] group-hover:text-[var(--color-gold-dim)] group-hover:translate-x-0.5 transition-all" />
                </div>
                <MiniSymbolOverview symbol={t.symbol} dateRange="3M" height={140} />
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
