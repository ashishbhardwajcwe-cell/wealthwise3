"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

export type CurrencyCode = "INR" | "USD" | "GBP" | "AED" | "SGD";

interface CurrencyContextValue {
  currency: CurrencyCode;
  setCurrency: (c: CurrencyCode) => void;
}

const CurrencyContext = createContext<CurrencyContextValue>({
  currency: "INR",
  setCurrency: () => {},
});

const STORAGE_KEY = "auris.currency";

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const [currency, setCurrencyState] = useState<CurrencyCode>("INR");

  useEffect(() => {
    const stored = typeof window !== "undefined" ? window.localStorage.getItem(STORAGE_KEY) : null;
    if (stored && ["INR", "USD", "GBP", "AED", "SGD"].includes(stored)) {
      setCurrencyState(stored as CurrencyCode);
    }
  }, []);

  const setCurrency = useCallback((c: CurrencyCode) => {
    setCurrencyState(c);
    if (typeof window !== "undefined") window.localStorage.setItem(STORAGE_KEY, c);
  }, []);

  // Stable context value — without the memo every consumer re-renders
  // whenever this provider (near the root) re-renders.
  const value = useMemo(() => ({ currency, setCurrency }), [currency, setCurrency]);

  return (
    <CurrencyContext.Provider value={value}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  return useContext(CurrencyContext);
}

export const CURRENCY_SYMBOLS: Record<CurrencyCode, string> = {
  INR: "₹", USD: "$", GBP: "£", AED: "AED ", SGD: "S$",
};
