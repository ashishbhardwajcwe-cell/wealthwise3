import { TickerTape } from "./TickerTape";
import { MiniSymbolOverview } from "./MiniSymbolOverview";
import { TradingViewChart } from "@/components/TradingViewChart";

/**
 * Live metals section for the gold + silver product page.
 *
 * IMPORTANT: TradingView's free embed widgets do NOT include MCX data
 * (paid subscription required). So we use international spot prices
 * (OANDA XAU/XAG in USD) for the live charts, plus USD/INR for context.
 *
 * For Indian-INR exposure the user can use the gold/silver ETF table
 * (GoldSilverETFTable component) rendered alongside this section —
 * it pulls live NAVs of Indian gold/silver ETFs from AMFI's daily feed.
 */
export function LiveMetalsSection() {
  return (
    <section className="bg-[var(--color-parchment)]/30 border-t border-[var(--color-silver)]/30">
      <TickerTape
        symbols={[
          { proName: "OANDA:XAUUSD", title: "Gold Spot $/oz" },
          { proName: "OANDA:XAGUSD", title: "Silver Spot $/oz" },
          { proName: "FX_IDC:USDINR", title: "USD/INR" },
          { proName: "TVC:GOLD", title: "Gold ($)" },
          { proName: "TVC:SILVER", title: "Silver ($)" },
        ]}
      />

      <div className="container-wide py-12 md:py-16">
        <div className="mb-6">
          <span className="eyebrow inline-flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--color-emerald)] opacity-60" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[var(--color-emerald)]" />
            </span>
            Live prices
          </span>
          <h2 className="mt-2">Gold and silver — live</h2>
          <p className="text-sm text-[var(--color-slate)] mt-2 max-w-2xl">
            International spot prices in USD per troy ounce, plus the USD/INR rate.
            For Indian-INR exposure, see the gold &amp; silver ETF table below — it tracks live NAVs
            of every major Indian metal ETF.
          </p>
        </div>

        {/* Hero: international gold + silver spot */}
        <div className="grid lg:grid-cols-2 gap-5 mb-5">
          <div>
            <div className="text-xs uppercase tracking-wider font-semibold text-[var(--color-gold-dim)] mb-2">Gold Spot (USD per troy ounce)</div>
            <TradingViewChart symbol="OANDA:XAUUSD" interval="1Y" height={420} caption="XAU/USD — international gold spot" />
          </div>
          <div>
            <div className="text-xs uppercase tracking-wider font-semibold text-[var(--color-gold-dim)] mb-2">Silver Spot (USD per troy ounce)</div>
            <TradingViewChart symbol="OANDA:XAGUSD" interval="1Y" height={420} caption="XAG/USD — international silver spot" />
          </div>
        </div>

        {/* Secondary: gold/silver ratio + USDINR */}
        <div className="grid md:grid-cols-3 gap-5">
          <div>
            <div className="text-xs uppercase tracking-wider font-semibold text-[var(--color-gold-dim)] mb-2">USD/INR (for INR conversion)</div>
            <MiniSymbolOverview symbol="FX_IDC:USDINR" dateRange="12M" height={200} />
          </div>
          <div>
            <div className="text-xs uppercase tracking-wider font-semibold text-[var(--color-gold-dim)] mb-2">Gold-Silver Ratio</div>
            <MiniSymbolOverview symbol="TVC:GOLD/TVC:SILVER" dateRange="12M" height={200} />
          </div>
          <div>
            <div className="text-xs uppercase tracking-wider font-semibold text-[var(--color-gold-dim)] mb-2">DXY (USD strength)</div>
            <MiniSymbolOverview symbol="TVC:DXY" dateRange="12M" height={200} />
          </div>
        </div>

        <p className="text-[11px] text-[var(--color-slate)] mt-6 italic leading-relaxed">
          International spot prices via OANDA in USD per troy ounce (1 oz = 31.1035 g). For an Indian-INR conversion:
          per-gram INR ≈ (XAU price × USD/INR) ÷ 31.1035. Indian retail prices (24K, 22K) include making charges and
          local premium over international spot. Past performance does not guarantee future returns. Not a recommendation.
        </p>
      </div>
    </section>
  );
}
