import type { Metadata } from "next";
import { BookOpen, Download, FileText } from "lucide-react";
import { Hero } from "@/components/Hero";
import { NewsletterBand } from "@/components/pms/NewsletterBand";
import { NEWSLETTERS } from "@/lib/newsletters";
import { fmtAsOf } from "@/lib/format";

/**
 * Public archive of the Monthly PMS Brief. Open access — reading and
 * downloading are never gated on an email; the signup band is optional.
 * Issues come from lib/newsletters.ts (newest first). With an empty manifest
 * the page still renders the hero and the signup band, never a blank state.
 */

const TITLE = "The Monthly PMS Brief — archive | PlanMyCashflows";
const DESCRIPTION =
  "Read or download every issue of the Monthly PMS Brief: PMS strategies ranked on alpha over the S&P BSE 500 TRI, built from APMI data. Free, no signup required.";

export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: DESCRIPTION,
  alternates: { canonical: "/resources/newsletter" },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: "https://planmycashflows.com/resources/newsletter",
    type: "website",
    // An openGraph block replaces the inherited one wholesale, so the
    // site-wide card image is named explicitly (see app/(site)/compare).
    siteName: "PlanMyCashflows",
    locale: "en_IN",
    images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: TITLE }],
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
    images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: TITLE }],
  },
};

/** "Brief-September-2026.pdf" from "/newsletters/…" — the saved file's name. */
const fileName = (file: string) => file.split("/").pop() ?? file;

export default function NewsletterArchivePage() {
  const [latest, ...past] = NEWSLETTERS;

  return (
    <>
      <Hero
        eyebrow="Resources"
        title="The Monthly PMS Brief"
        subtitle="PMS strategies ranked on alpha over the S&P BSE 500 TRI, built from APMI data. Read any issue online or download the PDF — no signup needed."
      />

      <section className="py-16">
        <div className="container-narrow">
          {latest ? (
            <div className="card-soft">
              <div className="flex items-start gap-3 mb-3">
                <FileText className="w-6 h-6 text-[var(--color-gold-dim)] flex-shrink-0 mt-1" />
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wider text-[var(--color-gold-dim)]">
                    Latest issue · {latest.label}
                  </div>
                  <h2 className="text-2xl font-semibold leading-tight mt-1">{latest.title}</h2>
                </div>
              </div>
              <p className="text-[var(--color-slate)] leading-relaxed mb-3">{latest.summary}</p>
              <p className="text-xs text-[var(--color-slate)] mb-5">
                Data as on {fmtAsOf(latest.asOfDate)} · Source: APMI monthly report · {latest.pages} pages
              </p>
              <div className="flex flex-wrap gap-3">
                <a href={latest.file} target="_blank" rel="noopener noreferrer" className="btn-primary inline-flex items-center gap-2">
                  <BookOpen className="w-4 h-4" /> Read the brief
                </a>
                <a href={latest.file} download={fileName(latest.file)} className="btn-outline inline-flex items-center gap-2">
                  <Download className="w-4 h-4" /> Download PDF
                </a>
              </div>
            </div>
          ) : (
            <p className="text-[var(--color-slate)]">
              The first issue is on its way. Subscribe below and it will reach your inbox when it is published.
            </p>
          )}

          {past.length > 0 && (
            <div className="mt-12">
              <h2 className="text-xl font-semibold mb-4">Past issues</h2>
              <ul className="divide-y divide-[var(--color-silver)]/30 border-y border-[var(--color-silver)]/30">
                {past.map((n) => (
                  <li key={n.slug} className="py-4 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6">
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-semibold uppercase tracking-wider text-[var(--color-gold-dim)]">{n.label}</div>
                      <a href={n.file} target="_blank" rel="noopener noreferrer" className="font-semibold hover:text-[var(--color-gold-dim)]">
                        {n.title}
                      </a>
                      <div className="text-xs text-[var(--color-slate)] mt-0.5">Data as on {fmtAsOf(n.asOfDate)}</div>
                    </div>
                    <a
                      href={n.file}
                      download={fileName(n.file)}
                      className="inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--color-navy)] hover:text-[var(--color-gold-dim)] shrink-0"
                      aria-label={`Download the ${n.label} brief (PDF)`}
                    >
                      <Download className="w-4 h-4" /> Download PDF
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <NewsletterBand source="newsletter-archive" />

          <p className="mt-8 text-xs text-[var(--color-slate)]">
            Past performance is not indicative of future returns. For information and education only — not investment advice.
          </p>
        </div>
      </section>
    </>
  );
}
