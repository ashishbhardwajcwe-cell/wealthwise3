"use client";

import { useState } from "react";
import { Download, FileText, Check, Loader2 } from "lucide-react";
import { Hero } from "@/components/Hero";

const DOWNLOADS = [
  {
    slug: "financial-health-check",
    title: "The 15-minute financial health check for professionals",
    desc: "12 questions, 1 score, and 3 concrete next steps. Used by 500+ professionals to identify the biggest gap in their plan in under 15 minutes.",
    pages: 8,
  },
  {
    slug: "defence-transition-planner",
    title: "The defence officer's transition financial planner",
    desc: "A 24-page workbook covering pension election, AGIF deployment, healthcare transition, second-career planning. Built by Col Ashish from his own transition.",
    pages: 24,
  },
  {
    slug: "nri-india-cheatsheet",
    title: "NRI investing in India: 2026 cheat sheet",
    desc: "FEMA rules, NRE vs NRO mechanics, GIFT City structures, DTAA usage, ESOP repatriation. The reference doc serious NRI investors keep open.",
    pages: 16,
  },
  {
    slug: "pms-empanelment-guide",
    title: "PMS empanelment: how to evaluate a manager",
    desc: "The 7-point framework Auris uses to evaluate any PMS before recommending. Includes the questions to ask in your discovery call.",
    pages: 12,
  },
];

export default function DownloadsPage() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState<string | null>(null);
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent, slug: string) {
    e.preventDefault();
    if (!email.includes("@")) return;
    setError(null);
    setLoading(slug);
    try {
      const res = await fetch("/api/download", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, slug }),
      });
      if (!res.ok) throw new Error();
      setSubmitted(slug);
    } catch {
      setError("Couldn't queue the download. Please try again.");
    } finally {
      setLoading(null);
    }
  }

  return (
    <>
      <Hero
        eyebrow="Free Resources"
        title="Free PDF guides"
        subtitle="Four practical PDFs we&apos;ve refined with hundreds of clients. Drop your email — we&apos;ll send the link and a calm weekly note, nothing else."
      />

      <section className="py-16">
        <div className="container-narrow">
          <div className="grid md:grid-cols-2 gap-6">
            {DOWNLOADS.map((d) => (
              <div key={d.slug} className="card-soft">
                <div className="flex items-start gap-3 mb-3">
                  <FileText className="w-6 h-6 text-[var(--color-gold-dim)] flex-shrink-0 mt-1" />
                  <div>
                    <h3 className="text-lg font-semibold leading-tight">{d.title}</h3>
                    <div className="text-xs text-[var(--color-slate)] mt-1">{d.pages}-page PDF</div>
                  </div>
                </div>
                <p className="text-sm text-[var(--color-slate)] leading-relaxed mb-4">{d.desc}</p>

                {submitted === d.slug ? (
                  <div className="flex items-center gap-2 text-sm font-semibold text-[var(--color-emerald)]">
                    <Check className="w-4 h-4" /> Check your inbox for the link.
                  </div>
                ) : (
                  <form onSubmit={(e) => handleSubmit(e, d.slug)} className="flex gap-2">
                    <input
                      type="email" required value={email}
                      disabled={loading === d.slug}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="flex-1 px-3 py-2 border border-[var(--color-silver)]/40 rounded text-sm focus:outline-none focus:border-[var(--color-gold)] disabled:opacity-60"
                    />
                    <button type="submit" disabled={loading === d.slug} className="px-3 py-2 bg-[var(--color-navy)] text-[var(--color-cream)] text-sm font-semibold rounded inline-flex items-center gap-1.5 disabled:opacity-60">
                      {loading === d.slug ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                      Get
                    </button>
                  </form>
                )}
              </div>
            ))}
          </div>

          {error && (
            <div className="mt-8 p-4 bg-[var(--color-ruby)]/10 border border-[var(--color-ruby)]/30 rounded-lg text-sm text-[var(--color-ruby)]">
              {error}
            </div>
          )}

          <div className="mt-12 p-5 bg-[var(--color-parchment)] rounded-xl border border-[var(--color-gold)]/20 text-sm text-[var(--color-slate)]">
            <strong className="text-[var(--color-navy)]">Privacy:</strong> We use your email only to send the PDF and our weekly note.
            One-click unsubscribe from any email. We never sell or share your email with third parties.
          </div>
        </div>
      </section>
    </>
  );
}
