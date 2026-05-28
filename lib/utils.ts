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

export const fv = (p: number, r: number, y: number) => p * Math.pow(1 + r, y);
export const pv = (f: number, r: number, y: number) => (y > 0 ? f / Math.pow(1 + r, y) : f);
export const sipRequired = (target: number, r: number, y: number): number => {
  if (y <= 0) return target;
  const rm = r / 12;
  const n = y * 12;
  return rm === 0 ? target / n : (target * rm) / (Math.pow(1 + rm, n) - 1);
};
export const sipFutureValue = (monthly: number, r: number, y: number): number => {
  if (y <= 0) return 0;
  const rm = r / 12;
  const n = y * 12;
  return rm === 0 ? monthly * n : monthly * ((Math.pow(1 + rm, n) - 1) / rm) * (1 + rm);
};
