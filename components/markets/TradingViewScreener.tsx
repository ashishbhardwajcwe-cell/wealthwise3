"use client";

import { useEffect, useRef } from "react";

interface Props {
  /** "india" | "america" | "uk" | "japan" | "crypto" etc. */
  market?: string;
  /** Default column-set tab */
  defaultColumn?: "overview" | "performance" | "valuation" | "dividends" | "profitability" | "technicals";
  /** Default screen */
  defaultScreen?: string;
  height?: number;
}

/**
 * TradingView "Stock Screener" widget — a fully-functional screener
 * with sortable columns, filters by market cap / volume / sector,
 * column tabs (Overview / Performance / Valuation / Dividends / Profitability /
 * Technicals), and pagination. Built and hosted by TradingView; we just embed.
 */
export function TradingViewScreener({
  market = "india",
  defaultColumn = "overview",
  defaultScreen = "general",
  height = 600,
}: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    ref.current.innerHTML = "";

    const container = document.createElement("div");
    container.className = "tradingview-widget-container__widget";
    ref.current.appendChild(container);

    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-screener.js";
    script.async = true;
    script.type = "text/javascript";
    script.innerHTML = JSON.stringify({
      width: "100%",
      height,
      defaultColumn,
      defaultScreen,
      market,
      showToolbar: true,
      colorTheme: "light",
      locale: "en",
      isTransparent: true,
    });
    ref.current.appendChild(script);
  }, [market, defaultColumn, defaultScreen, height]);

  return (
    <div className="tradingview-widget-container border border-[var(--color-silver)]/40 rounded-xl overflow-hidden bg-white" style={{ minHeight: height }}>
      <div ref={ref} className="tradingview-widget-container__widget" style={{ height }} />
    </div>
  );
}
