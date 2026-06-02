import Link from "next/link";
import { ArrowUpRight, ArrowDownRight, LineChart, Bitcoin, TrendingUp, Coins } from "lucide-react";
import type { CoinMarketRow } from "@/lib/crypto";
import type { MFLiveRow } from "@/lib/mutual-funds";

interface Props {
  coins: CoinMarketRow[];
  mfRows: MFLiveRow[];
  etfRows: MFLiveRow[];
}

interface Mover {
  asset: string;
  href: string;
  Icon: React.ComponentType<{ className?: string }>;
  winnerName: string;
  winnerMetric: string;
  winnerChange: number | null;
  loserName: string;
  loserChange: number | null;
  metricLabel: string;
}

/**
 * Server component that summarises the biggest mover in each asset
 * class so the top of /markets reads as an at-a-glance dashboard
 * before the screeners. All four numbers come from data already
 * fetched on the page — no additional API calls.
 */
export function MarketsTopMovers({ coins, mfRows, etfRows }: Props) {
  const movers: Mover[] = [
    cryptoMover(coins),
    mfMover(mfRows),
    etfMover(etfRows),
    // Stocks left out — we don't fetch index-level data on the page,
    // and TradingView's free embed doesn't expose specific numbers.
    // The crypto/MF/ETF columns are already a strong representative
    // sample of "what's happening today" without it.
  ];

  // Stocks placeholder card: link to the screener for live discovery
  // since we don't have a programmatic data source here.
  const stocksCard: Mover = {
    asset: "Stocks",
    href: "#stocks",
    Icon: LineChart,
    winnerName: "NSE & NYSE screener",
    winnerMetric: "Live",
    winnerChange: null,
    loserName: "",
    loserChange: null,
    metricLabel: "Sortable by P/E, market cap, dividend, performance and more.",
  };

  return (
    <section className="bg-[var(--color-parchment)]/40 border-b border-[var(--color-silver)]/30 py-8">
      <div className="container-wide">
        <div className="flex items-center justify-between gap-3 mb-4">
          <h2 className="text-xs uppercase tracking-wider font-semibold text-[var(--color-slate)]">
            Today&apos;s movers
          </h2>
          <span className="text-[11px] text-[var(--color-slate)]/70 italic">
            From the data on this page
          </span>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {movers.map((m) => <MoverCard key={m.asset} mover={m} />)}
          <MoverCard mover={stocksCard} />
        </div>
      </div>
    </section>
  );
}

function MoverCard({ mover }: { mover: Mover }) {
  const noData = mover.winnerChange == null && mover.loserChange == null;
  return (
    <Link
      href={mover.href}
      className="group bg-white border border-[var(--color-silver)]/40 rounded-xl p-4 hover:border-[var(--color-gold)] hover:shadow-sm transition-all"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="text-[10px] uppercase tracking-wider font-semibold text-[var(--color-slate)] inline-flex items-center gap-1.5">
          <mover.Icon className="w-3 h-3 text-[var(--color-gold-dim)]" />
          {mover.asset}
        </div>
        <span className="text-[10px] text-[var(--color-slate)] group-hover:text-[var(--color-gold-dim)] transition-colors">
          View →
        </span>
      </div>

      {noData ? (
        <>
          <div className="text-sm font-semibold text-[var(--color-navy)] truncate">{mover.winnerName}</div>
          <p className="text-[11px] text-[var(--color-slate)] mt-1 leading-snug">{mover.metricLabel}</p>
        </>
      ) : (
        <>
          <div className="text-[10px] uppercase tracking-wider text-[var(--color-slate)] mb-1">
            Top — {mover.metricLabel}
          </div>
          <div className="flex items-baseline justify-between gap-2 mb-2">
            <div className="text-sm font-semibold text-[var(--color-navy)] truncate">{mover.winnerName}</div>
            {mover.winnerChange != null && (
              <div className="text-sm font-semibold text-[var(--color-emerald)] tabular-nums inline-flex items-center gap-0.5 whitespace-nowrap">
                <ArrowUpRight className="w-3 h-3" />
                {mover.winnerChange > 0 ? "+" : ""}{mover.winnerChange.toFixed(1)}%
              </div>
            )}
          </div>

          {mover.loserName && (
            <>
              <div className="text-[10px] uppercase tracking-wider text-[var(--color-slate)] mb-1 mt-2 pt-2 border-t border-[var(--color-silver)]/30">
                Bottom
              </div>
              <div className="flex items-baseline justify-between gap-2">
                <div className="text-xs text-[var(--color-slate)] truncate">{mover.loserName}</div>
                {mover.loserChange != null && (
                  <div className="text-xs font-semibold text-[var(--color-ruby)] tabular-nums inline-flex items-center gap-0.5 whitespace-nowrap">
                    <ArrowDownRight className="w-3 h-3" />
                    {mover.loserChange.toFixed(1)}%
                  </div>
                )}
              </div>
            </>
          )}
        </>
      )}
    </Link>
  );
}

function cryptoMover(coins: CoinMarketRow[]): Mover {
  const withChange = coins.filter((c) => c.change24hPct != null);
  const sorted = [...withChange].sort((a, b) => (b.change24hPct ?? 0) - (a.change24hPct ?? 0));
  const winner = sorted[0];
  const loser = sorted[sorted.length - 1];
  return {
    asset: "Crypto",
    href: "#crypto",
    Icon: Bitcoin,
    winnerName: winner ? `${winner.name} (${winner.symbol.toUpperCase()})` : "—",
    winnerMetric: "24h",
    winnerChange: winner?.change24hPct ?? null,
    loserName: loser && loser !== winner ? `${loser.name} (${loser.symbol.toUpperCase()})` : "",
    loserChange: loser && loser !== winner ? loser.change24hPct ?? null : null,
    metricLabel: "24h",
  };
}

function mfMover(rows: MFLiveRow[]): Mover {
  const withReturn = rows.filter((r) => r.return1y != null);
  const sorted = [...withReturn].sort((a, b) => (b.return1y ?? 0) - (a.return1y ?? 0));
  const winner = sorted[0];
  const loser = sorted[sorted.length - 1];
  return {
    asset: "Mutual Funds",
    href: "#mutual-funds",
    Icon: TrendingUp,
    winnerName: winner ? `${winner.amc} ${winner.name}` : "—",
    winnerMetric: "1Y",
    winnerChange: winner?.return1y ?? null,
    loserName: loser && loser !== winner ? `${loser.amc} ${loser.name}` : "",
    loserChange: loser && loser !== winner ? loser.return1y ?? null : null,
    metricLabel: "1Y CAGR",
  };
}

function etfMover(rows: MFLiveRow[]): Mover {
  const withReturn = rows.filter((r) => r.return1y != null);
  const sorted = [...withReturn].sort((a, b) => (b.return1y ?? 0) - (a.return1y ?? 0));
  const winner = sorted[0];
  const loser = sorted[sorted.length - 1];
  return {
    asset: "Gold & Silver",
    href: "#gold",
    Icon: Coins,
    winnerName: winner ? `${winner.amc} ${winner.name}` : "—",
    winnerMetric: "1Y",
    winnerChange: winner?.return1y ?? null,
    loserName: loser && loser !== winner ? `${loser.amc} ${loser.name}` : "",
    loserChange: loser && loser !== winner ? loser.return1y ?? null : null,
    metricLabel: "1Y CAGR",
  };
}
