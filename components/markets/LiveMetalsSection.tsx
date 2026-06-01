import { TickerTape } from "./TickerTape";
import { MiniSymbolOverview } from "./MiniSymbolOverview";
import { TradingViewChart } from "@/components/TradingViewChart";

/**
 * Live metals section for the precious-metals product page.
 * Uses TradingView's MCX feed for Indian gold & silver futures (priced
 * in INR — per 10g for gold, per kg for silver) and OANDA spot prices
 * for international context.
 */
export function LiveMetalsSection() {
  return (
    <section className="bg-[var(--color-parchment)]/30 border-t border-[var(--color-silver)]/30">
      {/* Custom ticker tape — gold-and-silver focused */}
      <TickerTape
        symbols={[
          { proName: "MCX:GOLD1!",   title: "Gold MCX (per 10g)" },
          { proName: "MCX:SILVER1!", title: "Silver MCX (per kg)" },
          { proName: "OANDA:XAUUSD", title: "Gold Spot $/oz" },
          { proName: "OANDA:XAGUSD", title: "Silver Spot $/oz" },
          { proName: "FX_IDC:USDINR", title: "USD/INR" },
        ]}
      />

      <div className="container-wide py-16">
        <div className="mb-8">
          <span className="eyebrow inline-flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--color-emerald)] opacity-60" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[var(--color-emerald)]" />
            </span>
            Live prices
          </span>
          <h2 className="mt-2">Gold and silver — live</h2>
          <p className="text-sm text-[var(--color-slate)] mt-2 max-w-2xl">
            Indian MCX futures (priced in INR) and international spot (in USD per troy ounce).
            Click any chart to zoom, change timeframe, or overlay indicators.
          </p>
        </div>

        {/* Hero: gold + silver MCX */}
        <div className="grid lg:grid-cols-2 gap-5 mb-5">
          <div>
            <div className="text-xs uppercase tracking-wider font-semibold text-[var(--color-gold-dim)] mb-2">Gold · MCX (per 10g, INR)</div>
            <TradingViewChart symbol="MCX:GOLD1!" interval="1Y" height={420} caption="MCX Gold futures — live, per 10g INR" />
          </div>
          <div>
            <div className="text-xs uppercase tracking-wider font-semibold text-[var(--color-gold-dim)] mb-2">Silver · MCX (per kg, INR)</div>
            <TradingViewChart symbol="MCX:SILVER1!" interval="1Y" height={420} caption="MCX Silver futures — live, per kg INR" />
          </div>
        </div>

        {/* International context: spot prices + USDINR */}
        <div className="grid md:grid-cols-3 gap-5 mb-3">
          <div>
            <div className="text-xs uppercase tracking-wider font-semibold text-[var(--color-gold-dim)] mb-2">Gold Spot ($/oz)</div>
            <MiniSymbolOverview symbol="OANDA:XAUUSD" dateRange="12M" height={200} />
          </div>
          <div>
            <div className="text-xs uppercase tracking-wider font-semibold text-[var(--color-gold-dim)] mb-2">Silver Spot ($/oz)</div>
            <MiniSymbolOverview symbol="OANDA:XAGUSD" dateRange="12M" height={200} />
          </div>
          <div>
            <div className="text-xs uppercase tracking-wider font-semibold text-[var(--color-gold-dim)] mb-2">USD/INR</div>
            <MiniSymbolOverview symbol="FX_IDC:USDINR" dateRange="12M" height={200} />
          </div>
        </div>

        <p className="text-[11px] text-[var(--color-slate)] mt-6 italic leading-relaxed">
          MCX gold futures trade per 10 grams of 999 purity. To convert to 22K gold per gram, multiply by 0.9167 ÷ 10.
          Silver MCX futures trade per kilogram. International spot prices via OANDA (USD per troy ounce; 1 oz = 31.1035 g).
          Past performance is not indicative of future returns. Not a recommendation.
        </p>
      </div>
    </section>
  );
}
