"use client";

import { useEffect, useState } from "react";
import { LineChart, Bitcoin, TrendingUp, Coins } from "lucide-react";

interface NavSection {
  id: string;
  label: string;
  Icon: React.ComponentType<{ className?: string }>;
}

const SECTIONS: NavSection[] = [
  { id: "stocks",       label: "Stocks",        Icon: LineChart },
  { id: "crypto",       label: "Crypto",        Icon: Bitcoin },
  { id: "mutual-funds", label: "Mutual Funds",  Icon: TrendingUp },
  { id: "gold",         label: "Gold & Silver", Icon: Coins },
];

export function MarketsNav() {
  const [active, setActive] = useState<string>("stocks");

  // Highlight whichever section's top edge is closest to the viewport top
  // (accounting for the sticky header + this sub-nav).
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: "-25% 0px -60% 0px", threshold: [0, 0.25, 0.5, 1] },
    );
    for (const s of SECTIONS) {
      const el = document.getElementById(s.id);
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, []);

  return (
    <nav
      className="sticky top-16 z-40 bg-[var(--color-offwhite)]/95 backdrop-blur-md border-b border-[var(--color-silver)]/40"
      aria-label="Markets sections"
    >
      <div className="container-wide">
        <div className="flex gap-1 overflow-x-auto py-3 -mx-1 px-1 scrollbar-hide">
          {SECTIONS.map(({ id, label, Icon }) => {
            const isActive = active === id;
            return (
              <a
                key={id}
                href={`#${id}`}
                className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold border whitespace-nowrap transition-colors ${
                  isActive
                    ? "bg-[var(--color-navy)] text-[var(--color-cream)] border-[var(--color-navy)]"
                    : "bg-white text-[var(--color-navy)] border-[var(--color-silver)]/40 hover:border-[var(--color-gold)]"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {label}
              </a>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
