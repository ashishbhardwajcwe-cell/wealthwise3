"use client";

import { useEffect, useRef } from "react";

interface Props {
  /** TradingView symbol, e.g. "NSE:TCS", "BSE:RELIANCE", "NASDAQ:AAPL" */
  symbol: string;
  height?: number;
}

/**
 * TradingView "symbol info" widget — a compact card showing current
 * price, change, day range, and key fundamentals. Used inline within
 * blog posts (via the stockQuote body block) and at the top of every
 * stock analysis detail page.
 */
export function SymbolInfo({ symbol, height = 180 }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    ref.current.innerHTML = "";

    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-symbol-info.js";
    script.async = true;
    script.type = "text/javascript";
    script.innerHTML = JSON.stringify({
      symbol,
      width: "100%",
      locale: "en",
      colorTheme: "light",
      isTransparent: true,
    });
    ref.current.appendChild(script);
  }, [symbol]);

  return (
    <div className="tradingview-widget-container bg-white border border-[var(--color-silver)]/40 rounded-xl overflow-hidden my-6" style={{ minHeight: height }}>
      <div ref={ref} className="tradingview-widget-container__widget" />
    </div>
  );
}
