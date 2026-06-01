import { TickerTape } from "./TickerTape";
import { MiniSymbolOverview } from "./MiniSymbolOverview";
import { TradingViewChart } from "@/components/TradingViewChart";

const TOP_STOCKS = [
  { symbol: "NSE:RELIANCE",   name: "Reliance Industries" },
  { symbol: "NSE:TCS",        name: "Tata Consultancy" },
  { symbol: "NSE:HDFCBANK",   name: "HDFC Bank" },
  { symbol: "NSE:INFY",       name: "Infosys" },
  { symbol: "NSE:ICICIBANK",  name: "ICICI Bank" },
  { symbol: "NSE:HINDUNILVR", name: "Hindustan Unilever" },
  { symbol: "NSE:ITC",        name: "ITC" },
  { symbol: "NSE:LT",         name: "Larsen & Toubro" },
];

/**
 * "Live Markets" section for the direct-equity product page.
 *
 * Layout:
 *  - Ticker tape (scrolling) at the top
 *  - Nifty 50 large chart + Sensex chart side by side
 *  - Bank Nifty mini chart
 *  - 8-tile grid of top NSE stocks
 *
 * Everything is powered by free TradingView embed widgets — no API keys,
 * no server work. Each widget renders a TradingView-hosted iframe.
 */
export function LiveMarketsSection() {
  return (
    <section className="bg-[var(--color-parchment)]/30 border-t border-[var(--color-silver)]/30">
      <TickerTape />

      <div className="container-wide py-16">
        <div className="mb-8">
          <span className="eyebrow inline-flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--color-emerald)] opacity-60" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[var(--color-emerald)]" />
            </span>
            Live markets
          </span>
          <h2 className="mt-2">Indian indices and top stocks</h2>
          <p className="text-sm text-[var(--color-slate)] mt-2 max-w-2xl">
            Live charts via TradingView. Click any chart to zoom in, draw, or change timeframe.
            Use the ticker tape above to scan the broader index movement at a glance.
          </p>
        </div>

        {/* Nifty 50 + Sensex */}
        <div className="grid lg:grid-cols-2 gap-5 mb-5">
          <div>
            <div className="text-xs uppercase tracking-wider font-semibold text-[var(--color-gold-dim)] mb-2">Nifty 50</div>
            <TradingViewChart symbol="NSE:NIFTY" interval="1Y" height={420} caption="NSE:NIFTY — live chart" />
          </div>
          <div>
            <div className="text-xs uppercase tracking-wider font-semibold text-[var(--color-gold-dim)] mb-2">Sensex</div>
            <TradingViewChart symbol="BSE:SENSEX" interval="1Y" height={420} caption="BSE:SENSEX — live chart" />
          </div>
        </div>

        {/* Bank Nifty + Mid/Small cap */}
        <div className="grid md:grid-cols-3 gap-5 mb-10">
          <div>
            <div className="text-xs uppercase tracking-wider font-semibold text-[var(--color-gold-dim)] mb-2">Bank Nifty</div>
            <MiniSymbolOverview symbol="NSE:BANKNIFTY" dateRange="12M" height={200} />
          </div>
          <div>
            <div className="text-xs uppercase tracking-wider font-semibold text-[var(--color-gold-dim)] mb-2">Nifty Midcap 150</div>
            <MiniSymbolOverview symbol="NSE:NIFTYMIDCAP150" dateRange="12M" height={200} />
          </div>
          <div>
            <div className="text-xs uppercase tracking-wider font-semibold text-[var(--color-gold-dim)] mb-2">Nifty Smallcap 250</div>
            <MiniSymbolOverview symbol="NSE:NIFTYSMLCAP250" dateRange="12M" height={200} />
          </div>
        </div>

        {/* Top 8 stocks */}
        <div className="mb-3">
          <h3 className="text-lg font-semibold">Top 8 by market cap</h3>
          <p className="text-xs text-[var(--color-slate)] mt-1">Click any tile for a full chart with indicators.</p>
        </div>
        <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-4">
          {TOP_STOCKS.map((s) => (
            <div key={s.symbol}>
              <div className="text-xs uppercase tracking-wider font-semibold text-[var(--color-gold-dim)] mb-2">{s.name}</div>
              <MiniSymbolOverview symbol={s.symbol} dateRange="12M" height={180} />
            </div>
          ))}
        </div>

        <p className="text-[11px] text-[var(--color-slate)] mt-6 italic leading-relaxed">
          Charts and prices via TradingView. Past performance does not guarantee future returns.
          Not a recommendation to buy or sell any specific security. Please read all scheme-related documents and
          consult a SEBI-registered investment adviser before making investment decisions.
        </p>
      </div>
    </section>
  );
}
