"use client";

import { Star } from "lucide-react";

interface Props {
  /** "mf:120586", "etf:118819", "crypto:bitcoin" — namespaced ID. */
  id: string;
  starred: boolean;
  onToggle: (id: string) => void;
}

export function StarButton({ id, starred, onToggle }: Props) {
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onToggle(id);
      }}
      className={`inline-flex items-center justify-center w-6 h-6 rounded transition-colors ${
        starred
          ? "text-[var(--color-gold)] hover:text-[var(--color-gold-dim)]"
          : "text-[var(--color-slate)]/30 hover:text-[var(--color-gold)]"
      }`}
      aria-label={starred ? "Remove from watchlist" : "Add to watchlist"}
      title={starred ? "Remove from watchlist" : "Add to watchlist"}
    >
      <Star className="w-4 h-4" fill={starred ? "currentColor" : "none"} />
    </button>
  );
}
