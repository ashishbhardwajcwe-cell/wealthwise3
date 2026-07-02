import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const fmtINR = (n: number): string => {
  if (n === undefined || n === null || isNaN(n)) return "₹0";
  const a = Math.abs(n);
  if (a >= 1e7) return `₹${(n / 1e7).toFixed(2)} Cr`;
  if (a >= 1e5) return `₹${(n / 1e5).toFixed(2)} L`;
  return `₹${Math.round(n).toLocaleString("en-IN")}`;
};

export const fmtCurrency = (n: number, currency: string = "INR"): string => {
  if (n === undefined || n === null || isNaN(n)) return currency === "INR" ? "₹0" : "0";
  if (currency === "INR") return fmtINR(n);
  const symbol: Record<string, string> = { USD: "$", GBP: "£", AED: "AED ", SGD: "S$" };
  const s = symbol[currency] ?? "";
  return `${s}${Math.round(n).toLocaleString("en-US")}`;
};

/** Country → reporting currency for the AI snapshot flows. Shared by the
 *  client form and the /api/wealth-snapshot route so they can't drift. */
export const COUNTRY_CURRENCY: Record<string, string> = {
  India: "INR",
  US: "USD",
  UK: "GBP",
  UAE: "AED",
  Singapore: "SGD",
  Other: "USD",
};

export const currencyForCountry = (country: string): string =>
  COUNTRY_CURRENCY[country] ?? "USD";

export const fv = (p: number, r: number, y: number) => p * Math.pow(1 + r, y);
export const pv = (f: number, r: number, y: number) => (y > 0 ? f / Math.pow(1 + r, y) : f);

// Both SIP helpers assume the instalment is invested at the START of each
// month (annuity-due) — the convention used by standard Indian SIP
// calculators. They are exact inverses of each other:
// sipFutureValue(sipRequired(T, r, y), r, y) === T.
export const sipRequired = (target: number, r: number, y: number): number => {
  if (y <= 0) return target;
  const rm = r / 12;
  const n = y * 12;
  return rm === 0 ? target / n : (target * rm) / ((Math.pow(1 + rm, n) - 1) * (1 + rm));
};
export const sipFutureValue = (monthly: number, r: number, y: number): number => {
  if (y <= 0) return 0;
  const rm = r / 12;
  const n = y * 12;
  return rm === 0 ? monthly * n : monthly * ((Math.pow(1 + rm, n) - 1) / rm) * (1 + rm);
};
