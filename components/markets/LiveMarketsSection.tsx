"use client";

import { useState } from "react";
import { TickerTape } from "./TickerTape";
import { MiniSymbolOverview } from "./MiniSymbolOverview";
import { TradingViewChart } from "@/components/TradingViewChart";
import { TradingViewScreener } from "./TradingViewScreener";

type Market = "india" | "us";

const INDIA_TICKERS = [
  { proName: "BSE:SENSEX",      title: "Sensex" },
  { proName: "NSE:NIFTY",       title: "Nifty 50" },
  { proName: "NSE:BANKNIFTY",   title: "Bank Nifty" },
  { proName: "NSE:RELIANCE",    title: "Reliance" },
  { proName: "NSE:TCS",         title: "TCS" },
  { proName: "NSE:HDFCBANK",    title: "HDFC Bank" },
  { proName: "NSE:INFY",        title: "Infosys" },
  { proName: "NSE:ICICIBANK",   title: "ICICI Bank" },
  { proName: "NSE:HINDUNILVR",  title: "HUL" },
  { proName: "NSE:ITC",         title: "ITC" },
  { proName: "NSE:LT",          title: "L&T" },
  { proName: "NSE:SBIN",        title: "SBI" },
  { proName: "NSE:BHARTIARTL",  title: "Bharti Airtel" },
  { proName: "NSE:KOTAKBANK",   title: "Kotak Bank" },
  { proName: "NSE:ASIANPAINT",  title: "Asian Paints" },
  { proName: "NSE:MARUTI",      title: "Maruti" },
  { proName: "NSE:TITAN",       title: "Titan" },
  { proName: "NSE:WIPRO",       title: "Wipro" },
  { proName: "NSE:AXISBANK",    title: "Axis Bank" },
  { proName: "NSE:ULTRACEMCO",  title: "UltraTech" },
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
  { symbol: "NASDAQ:AAPL", name: "Apple" },
  { symbol: "NASDAQ:MSFT", name: "Microsoft" },
  { symbol: "NASDAQ:NVDA", name: "NVIDIA" },
  { symbol: "NASDAQ:TSLA", name: "Tesla" },
  { symbol: "NASDAQ:GOOGL", name: "Alphabet" },
  { symbol: "NASDAQ:AMZN", name: "Amazon" },
  { symbol: "NASDAQ:META", name: "Meta" },
  { symbol: "NASDAQ:AVGO", name: "Broadcom" },
];

const INDIA_TOP_STOCKS = [
  { symbol: "NSE:RELIANCE",   name: "Reliance Industries" },
  { symbol: "NSE:TCS",        name: "Tata Consultancy" },
  { symbol: "NSE:HDFCBANK",   name: "HDFC Bank" },
  { symbol: "NSE:INFY",       name: "Infosys" },
  { symbol: "NSE:ICICIBANK",  name: "ICICI Bank" },
  { symbol: "NSE:HINDUNILVR", name: "Hindustan Unilever" },
  { symbol: "NSE:ITC",        name: "ITC" },
  { symbol: "NSE:LT",         name: "Larsen & Toubro" },
];

export function LiveMarketsSection() {
  const [market, setMarket] = useState<Market>("india");
  const isIndia = market === "india";

  return (
    <section className="bg-[var(--color-parchment)]/30 border-y border-[var(--color-silver)]/30">
      <TickerTape symbols={isIndia ? INDIA_TICKERS : US_TICKERS} />

      <div className="container-wide py-12 md:py-16">
        <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
          <div>
            <span className="eyebrow inline-flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--color-emerald)] opacity-60" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[var(--color-emerald)]" />
              </span>
              Live markets
            </span>
            <h2 className="mt-2">{isIndia ? "Indian markets" : "US markets"}</h2>
            <p className="text-sm text-[var(--color-slate)] mt-2 max-w-2xl">
              {isIndia
                ? "NSE & BSE indices and top stocks. Use the screener below to sort by market cap, P/E, volume, performance and more."
                : "S&P 500, Nasdaq 100, and top US large-caps including Tesla, Apple, NVIDIA. Use the screener below to filter and sort."}
            </p>
          </div>

          <div className="flex gap-1 p-1 bg-white border border-[var(--color-silver)]/40 rounded-lg">
            <button
              onClick={() => setMarket("india")}
              className={tabBtn(isIndia)}
            >
              🇮🇳 Indian markets
            </button>
            <button
              onClick={() => setMarket("us")}
              className={tabBtn(!isIndia)}
            >
              🇺🇸 US markets
            </button>
          </div>
        </div>

        {/* Hero charts — change based on market */}
        <div className="grid lg:grid-cols-2 gap-5 mb-5">
          {isIndia ? (
            <>
              <ChartCard label="Nifty 50" symbol="NSE:NIFTY" />
              <ChartCard label="Sensex" symbol="BSE:SENSEX" />
            </>
          ) : (
            <>
              <ChartCard label="S&P 500" symbol="FOREXCOM:SPXUSD" />
              <ChartCard label="Nasdaq 100" symbol="FOREXCOM:NSXUSD" />
            </>
          )}
        </div>

        {/* Secondary indices */}
        <div className="grid md:grid-cols-3 gap-5 mb-10">
          {isIndia ? (
            <>
              <MiniCard label="Bank Nifty" symbol="NSE:BANKNIFTY" />
              <MiniCard label="Nifty Midcap 150" symbol="NSE:NIFTYMIDCAP150" />
              <MiniCard label="Nifty Smallcap 250" symbol="NSE:NIFTYSMLCAP250" />
            </>
          ) : (
            <>
              <MiniCard label="Dow Jones" symbol="FOREXCOM:DJI" />
              <MiniCard label="Russell 2000" symbol="TVC:RUT" />
              <MiniCard label="VIX (Volatility)" symbol="TVC:VIX" />
            </>
          )}
        </div>

        {/* Stock Screener — sortable + filterable */}
        <div className="mb-3">
          <h3 className="text-lg font-semibold">{isIndia ? "Indian stock screener" : "US stock screener"}</h3>
          <p className="text-xs text-[var(--color-slate)] mt-1">
            Switch between Overview, Performance, Valuation, Dividends, Profitability, and Technicals using the tabs at the top
            of the screener. Click any column header to sort. Filter by market cap, sector, and more.
          </p>
        </div>
        <TradingViewScreener
          key={market}
          market={isIndia ? "india" : "america"}
          defaultColumn="overview"
          defaultScreen={isIndia ? "most_capitalized" : "most_capitalized"}
          height={620}
        />

        {/* Top 8 watch tiles */}
        <div className="mt-10 mb-3">
          <h3 className="text-lg font-semibold">Top 8 to watch</h3>
          <p className="text-xs text-[var(--color-slate)] mt-1">Click any tile for a full chart with indicators.</p>
        </div>
        <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-4">
          {(isIndia ? INDIA_TOP_STOCKS : US_TOP_STOCKS).map((s) => (
            <div key={s.symbol}>
              <div className="text-xs uppercase tracking-wider font-semibold text-[var(--color-gold-dim)] mb-2">{s.name}</div>
              <MiniSymbolOverview symbol={s.symbol} dateRange="12M" height={180} />
            </div>
          ))}
        </div>

        <p className="text-[11px] text-[var(--color-slate)] mt-6 italic leading-relaxed">
          Charts, screener and prices via TradingView. Past performance does not guarantee future returns. Not a
          recommendation to buy or sell any security. Consult a SEBI-registered investment adviser before investing.
        </p>
      </div>
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

function tabBtn(active: boolean) {
  return `px-4 py-2 rounded-md text-sm font-semibold transition-colors ${
    active
      ? "bg-[var(--color-navy)] text-[var(--color-cream)]"
      : "text-[var(--color-navy)] hover:bg-[var(--color-sand)]/50"
  }`;
}
