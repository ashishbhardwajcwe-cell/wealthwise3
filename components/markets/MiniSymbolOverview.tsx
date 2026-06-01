"use client";

import { useEffect, useRef } from "react";

interface Props {
  /** e.g. "NSE:NIFTY", "BSE:SENSEX", "NSE:RELIANCE" */
  symbol: string;
  /** "1M", "3M", "12M", "60M", "all" */
  dateRange?: string;
  height?: number;
}

/**
 * TradingView "mini symbol overview" — a small chart card showing a
 * single instrument's recent trend. Used in grids on the direct-equity
 * product page.
 */
export function MiniSymbolOverview({ symbol, dateRange = "12M", height = 220 }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    ref.current.innerHTML = "";
    const container = document.createElement("div");
    container.className = "tradingview-widget-container__widget";
    ref.current.appendChild(container);

    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-mini-symbol-overview.js";
    script.async = true;
    script.type = "text/javascript";
    script.innerHTML = JSON.stringify({
      symbol,
      width: "100%",
      height,
      locale: "en",
      dateRange,
      colorTheme: "light",
      isTransparent: true,
      autosize: false,
      largeChartUrl: "",
      trendLineColor: "rgba(201, 168, 76, 1)",
      underLineColor: "rgba(201, 168, 76, 0.10)",
      underLineBottomColor: "rgba(201, 168, 76, 0)",
      noTimeScale: false,
    });
    ref.current.appendChild(script);
  }, [symbol, dateRange, height]);

  return (
    <div className="tradingview-widget-container bg-white border border-[var(--color-silver)]/40 rounded-xl overflow-hidden" style={{ height }}>
      <div ref={ref} className="tradingview-widget-container__widget h-full" />
    </div>
  );
}
