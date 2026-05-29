"use client";

import { useEffect, useRef } from "react";

interface TradingViewChartProps {
  symbol: string;
  interval?: string;
  height?: number;
  caption?: string;
}

interface TradingViewWindow extends Window {
  TradingView?: {
    widget: new (config: Record<string, unknown>) => unknown;
  };
}

declare const window: TradingViewWindow;

const intervalMap: Record<string, string> = {
  "1D": "D",
  "1W": "W",
  "1M": "M",
  "3M": "M",
  "1Y": "W",
  "5Y": "M",
};

const rangeMap: Record<string, string> = {
  "1D": "5D",
  "1W": "1M",
  "1M": "3M",
  "3M": "6M",
  "1Y": "12M",
  "5Y": "60M",
};

export function TradingViewChart({ symbol, interval = "1Y", height = 400, caption }: TradingViewChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const containerId = `tv-${symbol.replace(/[^a-z0-9]/gi, "-")}-${Math.random().toString(36).slice(2, 8)}`;

  useEffect(() => {
    const scriptId = "tradingview-widget-script";
    function mount() {
      if (!containerRef.current || !window.TradingView) return;
      containerRef.current.innerHTML = "";
      const widgetContainer = document.createElement("div");
      widgetContainer.id = containerId;
      widgetContainer.style.height = `${height}px`;
      containerRef.current.appendChild(widgetContainer);
      new window.TradingView.widget({
        container_id: containerId,
        symbol,
        interval: intervalMap[interval] ?? "W",
        timezone: "Asia/Kolkata",
        theme: "light",
        style: "1",
        locale: "en",
        toolbar_bg: "#fafaf7",
        enable_publishing: false,
        hide_top_toolbar: false,
        hide_side_toolbar: true,
        save_image: false,
        autosize: true,
        range: rangeMap[interval] ?? "12M",
      });
    }
    const existing = document.getElementById(scriptId) as HTMLScriptElement | null;
    if (existing && window.TradingView) {
      mount();
      return;
    }
    if (existing) {
      existing.addEventListener("load", mount);
      return;
    }
    const script = document.createElement("script");
    script.id = scriptId;
    script.src = "https://s3.tradingview.com/tv.js";
    script.async = true;
    script.onload = mount;
    document.body.appendChild(script);
  }, [symbol, interval, height, containerId]);

  return (
    <figure className="my-6">
      <div
        ref={containerRef}
        className="rounded-lg overflow-hidden border border-[var(--color-silver)]/40 bg-[var(--color-offwhite)]"
        style={{ minHeight: height }}
      />
      <figcaption className="text-xs text-[var(--color-slate)] mt-2 text-center italic">
        {caption ?? `${symbol} — chart data by TradingView`}
      </figcaption>
    </figure>
  );
}
