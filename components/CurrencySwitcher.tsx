"use client";

import { useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import { useCurrency, type CurrencyCode } from "./CurrencyProvider";

const CURRENCIES: { code: CurrencyCode; label: string; symbol: string }[] = [
  { code: "INR", label: "Indian Rupee", symbol: "₹" },
  { code: "USD", label: "US Dollar", symbol: "$" },
  { code: "GBP", label: "British Pound", symbol: "£" },
  { code: "AED", label: "UAE Dirham", symbol: "د.إ" },
  { code: "SGD", label: "Singapore Dollar", symbol: "S$" },
];

export function CurrencySwitcher() {
  const { currency, setCurrency } = useCurrency();
  const [open, setOpen] = useState(false);
  const active = CURRENCIES.find((c) => c.code === currency)!;

  return (
    <div
      className="relative"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onKeyDown={(e) => { if (e.key === "Escape") setOpen(false); }}
    >
      {/* Quiet text trigger — the bar already carries one boxed element (the
          gold CTA); everything else stays calm text. */}
      <button
        className="inline-flex items-center gap-1 px-2 py-1.5 text-[13px] font-semibold text-[var(--color-slate)] hover:text-[var(--color-navy)] hover:bg-[var(--color-sand)]/60 rounded-md transition-colors whitespace-nowrap"
        aria-label="Change currency"
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen(!open)}
      >
        <span>{active.symbol}</span>
        <span>{active.code}</span>
        <ChevronDown className="w-3 h-3 opacity-60" />
      </button>
      {open && (
        <div className="absolute right-0 top-full pt-2 w-56 z-50">
          <div className="bg-white border border-[var(--color-silver)]/50 rounded-xl shadow-lg p-1.5">
            {CURRENCIES.map((c) => (
              <button
                key={c.code}
                onClick={() => { setCurrency(c.code); setOpen(false); }}
                className="w-full text-left px-3 py-2 rounded-lg hover:bg-[var(--color-sand)]/60 flex items-center gap-2"
              >
                <span className="w-6 text-sm font-semibold text-[var(--color-navy)]">{c.symbol}</span>
                <div className="flex-1">
                  <div className="text-sm font-semibold text-[var(--color-navy)]">{c.code}</div>
                  <div className="text-[11px] text-[var(--color-slate)]">{c.label}</div>
                </div>
                {currency === c.code && <Check className="w-4 h-4 text-[var(--color-gold-dim)]" />}
              </button>
            ))}
            <p className="text-[10px] text-[var(--color-slate)] mt-2 px-3 pb-1 italic">
              Affects display only. Calculators use INR.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
