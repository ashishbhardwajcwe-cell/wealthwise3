"use client";

import { useEffect, useRef } from "react";

interface TickerSymbol {
  proName: string;        // e.g. "BSE:SENSEX", "BSE:RELIANCE", "NASDAQ:AAPL"
  title: string;          // display label
}

interface Props {
  symbols?: TickerSymbol[];
}

// BSE: prefix throughout — NSE data is paid on the free TradingView
// embed widget and renders "This symbol is only available on TradingView".
const DEFAULT_SYMBOLS: TickerSymbol[] = [
  { proName: "BSE:SENSEX",      title: "Sensex" },
  { proName: "BSE:BSE500",      title: "BSE 500" },
  { proName: "BSE:BANKEX",      title: "Bankex" },
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
  { proName: "BSE:MARUTI",      title: "Maruti Suzuki" },
  { proName: "BSE:TITAN",       title: "Titan" },
  { proName: "BSE:WIPRO",       title: "Wipro" },
  { proName: "BSE:AXISBANK",    title: "Axis Bank" },
  { proName: "BSE:ULTRACEMCO",  title: "UltraTech" },
];

/**
 * TradingView "ticker tape" — a horizontal scrolling marquee of prices.
 * Lightweight (no API key needed), official widget. Mounted as a child
 * iframe-like script by TradingView.
 */
export function TickerTape({ symbols = DEFAULT_SYMBOLS }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    ref.current.innerHTML = ""; // clear any previous mount
    const container = document.createElement("div");
    container.className = "tradingview-widget-container__widget";
    ref.current.appendChild(container);

    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-ticker-tape.js";
    script.async = true;
    script.type = "text/javascript";
    script.innerHTML = JSON.stringify({
      symbols,
      showSymbolLogo: true,
      isTransparent: true,
      displayMode: "regular",
      colorTheme: "light",
      locale: "en",
    });
    ref.current.appendChild(script);
  }, [symbols]);

  return (
    <div className="tradingview-widget-container border-y border-[var(--color-silver)]/40 bg-white">
      <div ref={ref} className="tradingview-widget-container__widget" style={{ minHeight: 46 }} />
    </div>
  );
}
