"use client";

import { fmtCurrency } from "@/lib/utils";
import { useCurrency } from "./CurrencyProvider";

interface CurrencyProps {
  value: number;
  /** Override the global currency (e.g. for calculators that are India-only) */
  currency?: string;
}

export function Currency({ value, currency }: CurrencyProps) {
  const { currency: globalCurrency } = useCurrency();
  return <span>{fmtCurrency(value, currency ?? globalCurrency)}</span>;
}
