"use client";

import { useState } from "react";
import { Globe, TrendingUp } from "lucide-react";
import { TickerTape } from "./TickerTape";
import { MiniSymbolOverview } from "./MiniSymbolOverview";
import { TradingViewChart } from "@/components/TradingViewChart";
import { TradingViewScreener } from "./TradingViewScreener";

type Market = "india" | "us";

// TradingView's free embed widgets do NOT have a licence for NSE
// real-time *stock* data, so individual stocks use BSE:<TICKER> (every
// Indian large-cap is dual-listed) with BSE:SENSEX as the headline index.
// The old BSE index codes for breadth (BSE:BANKEX / BSE:MIDCAP /
// BSE:SMLCAP) stopped resolving on TradingView ("Invalid symbol"), so
// the breadth cards use the NSE index symbols below — swap them here if
// TradingView ever renames them.
const INDIA_TICKERS = [
  { proName: "BSE:SENSEX",      title: "Sensex" },
  { proName: "BSE:BSE500",      title: "BSE 500" },
  { proName: "NSE:BANKNIFTY",   title: "Bank Nifty" },
  { proName: "BSE:RELIANCE",    title: "Reliance" },
  { proName: "BSE:TCS",         title: "TCS" },
  { proName: "BSE:HDFCBANK",    title: "HDFC Bank" },
  { proName: "BSE:INFY",        title: "Infosys" },
  { proName: "BSE:ICICIBANK",   title: "ICICI Bank" },
  { proName: "BSE:HINDUNILVR",  title: "HUL" },
  { proName: "BSE:ITC",         title: "ITC" },
  { proName: "BSE:LT",          title: "L&T" },
  { proName: "BSE:SBIN",        title: "SBI" },
  { proName: "BSE:BHARTIARTL",  title: "Bharti Airtel" },
  { proName: "BSE:KOTAKBANK",   title: "Kotak Bank" },
  { proName: "BSE:ASIANPAINT",  title: "Asian Paints" },
  { proName: "BSE:MARUTI",      title: "Maruti" },
  { proName: "BSE:TITAN",       title: "Titan" },
  { proName: "BSE:WIPRO",       title: "Wipro" },
  { proName: "BSE:AXISBANK",    title: "Axis Bank" },
  { proName: "BSE:ULTRACEMCO",  title: "UltraTech" },
];

const US_TICKERS = [
  { proName: "FOREXCOM:SPXUSD",  title: "S&P 500" },
  { proName: "FOREXCOM:NSXUSD",  title: "Nasdaq 100" },
  { proName: "FOREXCOM:DJI",     title: "Dow Jones" },
  { proName: "NASDAQ:AAPL",      title: "Apple" },
  { proName: "NASDAQ:MSFT",      title: "Microsoft" },
  { proName: "NASDAQ:NVDA",      title: "NVIDIA" },
  { proName: "NASDAQ:GOOGL",     title: "Alphabet" },
  { proName: "NASDAQ:AMZN",      title: "Amazon" },
  { proName: "NASDAQ:META",      title: "Meta" },
  { proName: "NASDAQ:TSLA",      title: "Tesla" },
  { proName: "NASDAQ:AVGO",      title: "Broadcom" },
  { proName: "NYSE:BRK.B",       title: "Berkshire Hathaway" },
  { proName: "NYSE:JPM",         title: "JPMorgan" },
  { proName: "NYSE:V",           title: "Visa" },
  { proName: "NYSE:WMT",         title: "Walmart" },
  { proName: "NYSE:UNH",         title: "UnitedHealth" },
  { proName: "NASDAQ:NFLX",      title: "Netflix" },
  { proName: "NASDAQ:COST",      title: "Costco" },
  { proName: "NYSE:JNJ",         title: "Johnson & Johnson" },
  { proName: "NASDAQ:AMD",       title: "AMD" },
];

const US_TOP_STOCKS = [
  { symbol: "NASDAQ:AAPL", name: "Apple",      ticker: "AAPL" },
  { symbol: "NASDAQ:MSFT", name: "Microsoft",  ticker: "MSFT" },
  { symbol: "NASDAQ:NVDA", name: "NVIDIA",     ticker: "NVDA" },
  { symbol: "NASDAQ:TSLA", name: "Tesla",      ticker: "TSLA" },
  { symbol: "NASDAQ:GOOGL", name: "Alphabet",  ticker: "GOOGL" },
  { symbol: "NASDAQ:AMZN", name: "Amazon",     ticker: "AMZN" },
  { symbol: "NASDAQ:META", name: "Meta",       ticker: "META" },
  { symbol: "NASDAQ:AVGO", name: "Broadcom",   ticker: "AVGO" },
];

const INDIA_TOP_STOCKS = [
  { symbol: "BSE:RELIANCE",   name: "Reliance Industries", ticker: "RELIANCE" },
  { symbol: "BSE:TCS",        name: "Tata Consultancy",    ticker: "TCS" },
  { symbol: "BSE:HDFCBANK",   name: "HDFC Bank",           ticker: "HDFCBANK" },
  { symbol: "BSE:INFY",       name: "Infosys",             ticker: "INFY" },
  { symbol: "BSE:ICICIBANK",  name: "ICICI Bank",          ticker: "ICICIBANK" },
  { symbol: "BSE:HINDUNILVR", name: "Hindustan Unilever",  ticker: "HINDUNILVR" },
  { symbol: "BSE:ITC",        name: "ITC",                 ticker: "ITC" },
  { symbol: "BSE:LT",         name: "Larsen & Toubro",     ticker: "LT" },
];

export function LiveMarketsSection() {
  const [market, setMarket] = useState<Market>("india");
  const isIndia = market === "india";

  return (
    <section className="bg-[var(--color-parchment)]/30 border-y border-[var(--color-silver)]/30">
      <TickerTape symbols={isIndia ? INDIA_TICKERS : US_TICKERS} />

      <div className="container-wide py-14 md:py-20">
        {/* Section header — eyebrow + title + market toggle on a single line */}
        <div className="flex flex-wrap items-end justify-between gap-6 mb-10 pb-6 border-b border-[var(--color-silver)]/30">
          <div className="max-w-2xl">
            <span className="eyebrow inline-flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--color-emerald)] opacity-60" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[var(--color-emerald)]" />
              </span>
              Live markets
            </span>
            <h2 className="mt-2.5">{isIndia ? "Indian equity markets" : "US equity markets"}</h2>
            <p className="text-sm text-[var(--color-slate)] mt-3 leading-relaxed">
              {isIndia
                ? "NSE & BSE indices and large-caps in real time. The screener below lets you sort by market cap, P/E, dividend yield, performance and technicals — and filter by sector."
                : "S&P 500, Nasdaq 100 and the largest US listings. The screener below sorts by market cap, P/E, dividends and more — Tesla, Apple, NVIDIA and the rest."}
            </p>
          </div>

          <div role="tablist" aria-label="Select market" className="inline-flex p-1 bg-white border border-[var(--color-silver)]/40 rounded-lg shadow-sm">
            <MarketTab
              label="India"
              meta="NSE / BSE"
              active={isIndia}
              onClick={() => setMarket("india")}
            />
            <MarketTab
              label="United States"
              meta="NYSE / Nasdaq"
              active={!isIndia}
              onClick={() => setMarket("us")}
            />
          </div>
        </div>

        {/* Block 1 — primary indices */}
        <Block
          eyebrow="Headline indices"
          title={isIndia ? "Sensex & BSE 500" : "S&P 500 & Nasdaq 100"}
          subtitle="One-year view. Click any chart to expand on TradingView."
        >
          <div className="grid lg:grid-cols-2 gap-5">
            {isIndia ? (
              <>
                <ChartCard label="Sensex" symbol="BSE:SENSEX" />
                <ChartCard label="BSE 500" symbol="BSE:BSE500" />
              </>
            ) : (
              <>
                <ChartCard label="S&P 500" symbol="FOREXCOM:SPXUSD" />
                <ChartCard label="Nasdaq 100" symbol="FOREXCOM:NSXUSD" />
              </>
            )}
          </div>
        </Block>

        {/* Block 2 — secondary indices */}
        <Block
          eyebrow="Across the curve"
          title={isIndia ? "Bank Nifty, Midcap & Smallcap" : "Dow, Russell & VIX"}
          subtitle={isIndia
            ? "Banking, mid-caps and small-caps — where the rotations show up first."
            : "Broad-market and volatility context."}
        >
          <div className="grid md:grid-cols-3 gap-5">
            {isIndia ? (
              <>
                <MiniCard label="Nifty Bank" symbol="NSE:BANKNIFTY" />
                <MiniCard label="Nifty Midcap 100" symbol="NSE:CNXMIDCAP" />
                <MiniCard label="Nifty Smallcap 100" symbol="NSE:CNXSMALLCAP" />
              </>
            ) : (
              <>
                <MiniCard label="Dow Jones" symbol="FOREXCOM:DJI" />
                <MiniCard label="Russell 2000" symbol="TVC:RUT" />
                <MiniCard label="VIX (Volatility)" symbol="TVC:VIX" />
              </>
            )}
          </div>
        </Block>

        {/* Block 3 — screener */}
        <Block
          eyebrow="Screener"
          title={isIndia ? "Indian stock screener" : "US stock screener"}
          subtitle="Switch tabs at the top of the screener for Overview, Performance, Valuation, Dividends, Profitability and Technicals. Click any column header to sort. Filter by sector and market cap from the toolbar."
          icon={<Globe className="w-4 h-4" />}
        >
          <div className="rounded-2xl border border-[var(--color-silver)]/40 overflow-hidden bg-white shadow-sm">
            <TradingViewScreener
              key={market}
              market={isIndia ? "india" : "america"}
              defaultColumn="overview"
              defaultScreen="most_capitalized"
              height={620}
            />
          </div>
        </Block>

        {/* Block 4 — top 8 watch list */}
        <Block
          eyebrow="Top to watch"
          title={isIndia ? "Eight Indian large-caps" : "Eight US tech leaders"}
          subtitle="Click any tile to open a full chart with indicators on TradingView."
          icon={<TrendingUp className="w-4 h-4" />}
        >
          <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-4">
            {(isIndia ? INDIA_TOP_STOCKS : US_TOP_STOCKS).map((s) => (
              <div key={s.symbol} className="group">
                <div className="flex items-baseline justify-between mb-2">
                  <div className="text-xs uppercase tracking-wider font-semibold text-[var(--color-gold-dim)]">{s.name}</div>
                  <div className="text-[10px] font-mono text-[var(--color-slate)]/60">{s.ticker}</div>
                </div>
                <div className="rounded-xl border border-[var(--color-silver)]/40 overflow-hidden bg-white group-hover:border-[var(--color-gold)] transition-colors">
                  <MiniSymbolOverview symbol={s.symbol} dateRange="12M" height={180} />
                </div>
              </div>
            ))}
          </div>
        </Block>

        <p className="text-[11px] text-[var(--color-slate)] mt-10 italic leading-relaxed border-t border-[var(--color-silver)]/30 pt-6">
          Charts, screener and prices via TradingView (Asia/Kolkata time). Past performance does not guarantee future returns. Not a
          recommendation to buy or sell any security. Consult a SEBI-registered investment adviser before investing.
        </p>
      </div>
    </section>
  );
}

function MarketTab({ label, meta, active, onClick }: { label: string; meta: string; active: boolean; onClick: () => void }) {
  return (
    <button
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`relative px-4 py-2 rounded-md text-sm font-semibold transition-all ${
        active
          ? "bg-[var(--color-navy)] text-[var(--color-cream)]"
          : "text-[var(--color-navy)] hover:bg-[var(--color-sand)]/50"
      }`}
    >
      <div className="flex flex-col items-start leading-tight">
        <span>{label}</span>
        <span className={`text-[9px] uppercase tracking-wider font-mono ${active ? "text-[var(--color-gold-light)]/80" : "text-[var(--color-slate)]/70"}`}>
          {meta}
        </span>
      </div>
    </button>
  );
}

function Block({
  eyebrow,
  title,
  subtitle,
  icon,
  children,
}: {
  eyebrow: string;
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-12 last:mb-0">
      <div className="mb-5 max-w-3xl">
        <div className="text-[10px] uppercase tracking-wider font-semibold text-[var(--color-gold-dim)] inline-flex items-center gap-1.5">
          {icon}
          {eyebrow}
        </div>
        <h3 className="text-xl md:text-2xl font-semibold mt-1.5 text-[var(--color-navy)]" style={{ fontFamily: "var(--font-display)" }}>
          {title}
        </h3>
        {subtitle && <p className="text-sm text-[var(--color-slate)] mt-2 leading-relaxed">{subtitle}</p>}
      </div>
      {children}
    </section>
  );
}

function ChartCard({ label, symbol }: { label: string; symbol: string }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wider font-semibold text-[var(--color-gold-dim)] mb-2">{label}</div>
      <TradingViewChart symbol={symbol} interval="1Y" height={420} caption={`${symbol} — live chart`} />
    </div>
  );
}

function MiniCard({ label, symbol }: { label: string; symbol: string }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wider font-semibold text-[var(--color-gold-dim)] mb-2">{label}</div>
      <MiniSymbolOverview symbol={symbol} dateRange="12M" height={200} />
    </div>
  );
}
