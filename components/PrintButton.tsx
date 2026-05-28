"use client";

import { Printer } from "lucide-react";

export function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => {
        if (typeof window !== "undefined") window.print();
      }}
      className="inline-flex items-center gap-1.5 text-[var(--color-gold-dim)] hover:underline"
    >
      <Printer className="w-4 h-4" /> Save as PDF
    </button>
  );
}
