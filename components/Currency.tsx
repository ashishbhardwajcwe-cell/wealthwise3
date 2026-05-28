"use client";

import { fmtCurrency } from "@/lib/utils";

interface CurrencyProps {
  value: number;
  currency?: string;
}

export function Currency({ value, currency = "INR" }: CurrencyProps) {
  return <span>{fmtCurrency(value, currency)}</span>;
}
