"use client";

import { useEffect, useState } from "react";

/**
 * Thin gold bar at the very top of the viewport showing how far the reader
 * has scrolled through the article. Subtle but appreciated on long reads.
 */
export function ReadingProgress() {
  const [pct, setPct] = useState(0);

  useEffect(() => {
    function onScroll() {
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (docHeight <= 0) {
        setPct(0);
        return;
      }
      const scrolled = (window.scrollY / docHeight) * 100;
      setPct(Math.max(0, Math.min(100, scrolled)));
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  return (
    <div
      className="fixed top-0 left-0 right-0 h-[3px] z-50 pointer-events-none"
      aria-hidden
    >
      <div
        className="h-full bg-gradient-to-r from-[var(--color-gold)] to-[var(--color-gold-light)] transition-[width] duration-100"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
