"use client";

import { useState } from "react";
import { Info } from "lucide-react";

interface Props {
  /** Plain-English one-liner explainer. */
  text: string;
  /** Optional override of the trigger icon size. */
  size?: number;
}

/**
 * Hover/tap tooltip used on screener column headers. CSS-only positioning
 * (no portal needed since headers don't sit inside backdrop-filter
 * containers). Becomes click-toggle on touch screens.
 */
export function InfoTip({ text, size = 12 }: Props) {
  const [tapped, setTapped] = useState(false);
  return (
    <span
      className="relative inline-flex group/info"
      onClick={(e) => {
        e.stopPropagation();
        e.preventDefault();
        setTapped((t) => !t);
      }}
      onBlur={() => setTapped(false)}
      tabIndex={0}
    >
      <Info
        className="text-[var(--color-slate)]/50 hover:text-[var(--color-gold-dim)] transition-colors cursor-help"
        style={{ width: size, height: size }}
      />
      <span
        className={`pointer-events-none absolute z-50 left-1/2 -translate-x-1/2 bottom-full mb-1.5 px-2.5 py-1.5 rounded-md bg-[var(--color-navy)] text-[var(--color-cream)] text-[11px] font-normal leading-snug normal-case tracking-normal w-56 text-center shadow-lg transition-opacity ${
          tapped ? "opacity-100" : "opacity-0 group-hover/info:opacity-100"
        }`}
        role="tooltip"
      >
        {text}
      </span>
    </span>
  );
}
