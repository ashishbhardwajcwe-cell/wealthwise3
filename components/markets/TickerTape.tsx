"use client";

import { useEffect, useRef } from "react";

interface TickerSymbol {
  proName: string;        // e.g. "BSE:SENSEX", "NSE:NIFTY", "NSE:RELIANCE"
  title: string;          // display label
}

interface Props {
  symbols?: TickerSymbol[];
}

const DEFAULT_SYMBOLS: TickerSymbol[] = [
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
  { proName: "NSE:MARUTI",      title: "Maruti Suzuki" },
  { proName: "NSE:TITAN",       title: "Titan" },
  { proName: "NSE:WIPRO",       title: "Wipro" },
  { proName: "NSE:AXISBANK",    title: "Axis Bank" },
  { proName: "NSE:ULTRACEMCO",  title: "UltraTech" },
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
