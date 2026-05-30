"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { slugifyHeading } from "@/lib/slugify";

export interface TocItem {
  id: string;
  text: string;
  level: 2 | 3;
}

/** Reads the rendered article DOM and pulls out an ordered list of H2 and H3
 *  ids. Lives outside Sanity so it works for BOTH Sanity posts and local
 *  fallback posts. */
function readDomToc(scopeSelector: string): TocItem[] {
  if (typeof document === "undefined") return [];
  const root = document.querySelector(scopeSelector);
  if (!root) return [];
  const items: TocItem[] = [];
  root.querySelectorAll("h2, h3").forEach((el) => {
    const text = (el.textContent ?? "").trim();
    if (!text) return;
    let id = el.id;
    if (!id) {
      id = slugifyHeading(text);
      el.id = id;
    }
    items.push({
      id,
      text,
      level: el.tagName === "H2" ? 2 : 3,
    });
  });
  return items;
}

interface Props {
  /** CSS selector for the article body whose H2/H3s we should scan. */
  scopeSelector?: string;
  /** Minimum H2 count to actually render. */
  minHeadings?: number;
  className?: string;
}

export function TableOfContents({ scopeSelector = ".prose-article", minHeadings = 3, className }: Props) {
  const [items, setItems] = useState<TocItem[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);

  // Build the TOC after first paint
  useEffect(() => {
    const id = window.requestAnimationFrame(() => setItems(readDomToc(scopeSelector)));
    return () => window.cancelAnimationFrame(id);
  }, [scopeSelector]);

  // Highlight whichever heading is closest to the top of the viewport
  useEffect(() => {
    if (items.length === 0) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActiveId(visible[0].target.id);
      },
      { rootMargin: "-15% 0px -70% 0px", threshold: 0 },
    );
    items.forEach((it) => {
      const el = document.getElementById(it.id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, [items]);

  // Only show if the article has enough structure to warrant a TOC
  const h2Count = items.filter((i) => i.level === 2).length;
  if (h2Count < minHeadings) return null;

  return (
    <nav
      className={cn(
        "text-sm",
        className,
      )}
      aria-label="Table of contents"
    >
      <div className="text-xs uppercase tracking-wider font-semibold text-[var(--color-slate)] mb-3">
        On this page
      </div>
      <ol className="space-y-1.5 border-l border-[var(--color-silver)]/40">
        {items.map((it) => (
          <li key={it.id} className={it.level === 3 ? "pl-3" : ""}>
            <a
              href={`#${it.id}`}
              onClick={(e) => {
                e.preventDefault();
                const el = document.getElementById(it.id);
                if (el) {
                  const y = el.getBoundingClientRect().top + window.scrollY - 80;
                  window.scrollTo({ top: y, behavior: "smooth" });
                  history.replaceState(null, "", `#${it.id}`);
                }
              }}
              className={cn(
                "block py-1 -ml-px pl-3 border-l-2 transition-all leading-snug",
                activeId === it.id
                  ? "border-[var(--color-gold)] text-[var(--color-navy)] font-semibold"
                  : "border-transparent text-[var(--color-slate)] hover:text-[var(--color-navy)] hover:border-[var(--color-silver)]",
                it.level === 3 && "text-[13px]",
              )}
            >
              {it.text}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}
