"use client";

import Link from "next/link";
import { useState, useMemo } from "react";
import { Search } from "lucide-react";
import { Hero } from "@/components/Hero";
import { GLOSSARY } from "@/lib/glossary-data";

export default function GlossaryPage() {
  const [q, setQ] = useState("");
  const filtered = useMemo(() => {
    if (!q.trim()) return GLOSSARY;
    const needle = q.toLowerCase();
    return GLOSSARY.filter((t) => t.term.toLowerCase().includes(needle) || t.short.toLowerCase().includes(needle));
  }, [q]);

  const grouped = useMemo(() => {
    const g: Record<string, typeof GLOSSARY> = {};
    for (const t of filtered) {
      const letter = t.term[0].toUpperCase();
      if (!g[letter]) g[letter] = [];
      g[letter].push(t);
    }
    return Object.entries(g).sort(([a], [b]) => a.localeCompare(b));
  }, [filtered]);

  return (
    <>
      <Hero
        eyebrow="Resources"
        title="Finance glossary"
        subtitle="60+ terms every Indian investor will run into. Plain English, with links to deeper reading where it helps."
      />

      <section className="py-12">
        <div className="container-narrow">
          <div className="relative max-w-md mb-10">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-slate)]" />
            <input
              type="text"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search glossary..."
              className="w-full pl-9 pr-3 py-3 border border-[var(--color-silver)]/40 rounded-lg text-sm focus:outline-none focus:border-[var(--color-gold)]"
            />
          </div>

          {filtered.length === 0 && (
            <p className="text-[var(--color-slate)] text-center py-10">No terms match &ldquo;{q}&rdquo;.</p>
          )}

          {grouped.map(([letter, terms]) => (
            <div key={letter} className="mb-10">
              <h2 className="text-2xl mb-4 text-[var(--color-gold-dim)]">{letter}</h2>
              <dl className="space-y-4">
                {terms.map((t) => (
                  <div key={t.term} className="bg-white border border-[var(--color-silver)]/40 rounded-lg p-5">
                    <dt className="font-semibold text-[var(--color-navy)] text-lg mb-2">{t.term}</dt>
                    <dd className="text-sm text-[var(--color-slate)] leading-relaxed">
                      {t.short}{" "}
                      {t.related && (
                        <Link href={t.related} className="text-[var(--color-gold-dim)] font-semibold">
                          Read more →
                        </Link>
                      )}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
