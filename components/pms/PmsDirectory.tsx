/**
 * The A–Z PMS directory rendered at /pms/all (page 1) and /pms/all/[page].
 *
 * Why this page exists: the ~1,700 /pms/[slug] strategy pages were orphans.
 * The explorer only ever renders a windowed slice of the feed in the client,
 * so all but the first couple of dozen strategies had no inbound link anywhere
 * on the site — nothing for a crawler to follow, and nothing for a reader who
 * wants to see the whole universe rather than a filtered view. This directory
 * is the flat, paginated, entirely server-rendered index that fixes that: 100
 * plain <a> links per page, grouped by first letter, with prev/next so the
 * chain is walkable from either end.
 *
 * Both routes share this module so the copy, pagination maths and rel
 * prev/next can't drift between page 1 and the rest.
 */

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getLivePmsStrategies } from "@/lib/investment-data";
import {
  cleanPmsStrategies,
  sortPmsAlphabetically,
  pmsAlphaBucket,
  pmsDirectoryHref,
  pmsDirectoryPageCount,
  PMS_DIRECTORY_PAGE_SIZE,
} from "@/lib/pms";
import { fmtAsOf, latestAmfiDate } from "@/lib/format";
import { siteConfig } from "@/lib/site-config";
import { StrategyLinkList, toStrategyLink, type StrategyLink } from "@/components/pms/StrategyLinks";
import { ComplianceFootnote, BENCH_NAME } from "@/components/pms/strategy-shared";
import { StructuredData, breadcrumbSchema } from "@/components/StructuredData";

/** Anchor id for a letter section ("#" has no place in a fragment id). */
const bucketId = (bucket: string) => (bucket === "#" ? "letter-other" : `letter-${bucket.toLowerCase()}`);

interface DirectoryData {
  page: number;
  totalPages: number;
  total: number;
  managerCount: number;
  asOn: string;
  /** This page's slice, in A–Z order. */
  items: StrategyLink[];
  /** First page each letter appears on, in display order. */
  letterPages: Array<[string, number]>;
}

/** Load and shape everything both the page and its metadata need. Returns null
 *  when the feed is empty (Sanity unconfigured / offline) or the page number is
 *  out of range — callers turn that into a 404. */
async function loadDirectory(page: number): Promise<DirectoryData | null> {
  if (!Number.isInteger(page) || page < 1) return null;

  const clean = cleanPmsStrategies(await getLivePmsStrategies());
  if (clean.length === 0) return null;

  const sorted = sortPmsAlphabetically(clean);
  const totalPages = pmsDirectoryPageCount(sorted.length);
  if (page > totalPages) return null;

  const letterPages = new Map<string, number>();
  sorted.forEach((s, i) => {
    const bucket = pmsAlphaBucket(s.strategyName);
    if (!letterPages.has(bucket)) letterPages.set(bucket, Math.floor(i / PMS_DIRECTORY_PAGE_SIZE) + 1);
  });

  const start = (page - 1) * PMS_DIRECTORY_PAGE_SIZE;
  const items = sorted.slice(start, start + PMS_DIRECTORY_PAGE_SIZE).map((s) => toStrategyLink(s, clean));

  return {
    page,
    totalPages,
    total: sorted.length,
    managerCount: new Set(clean.map((s) => s.manager)).size,
    asOn: fmtAsOf(latestAmfiDate(clean.map((s) => s.asOfDate))),
    items,
    letterPages: Array.from(letterPages).sort(([a], [b]) => (a === "#" ? 1 : b === "#" ? -1 : a.localeCompare(b))),
  };
}

export async function pmsDirectoryMetadata(page: number): Promise<Metadata> {
  const data = await loadDirectory(page);
  if (!data) return { title: "PMS directory" };

  const suffix = data.page > 1 ? ` — Page ${data.page} of ${data.totalPages}` : "";
  const title = `All PMS Strategies in India — Complete A–Z Directory${suffix}`;
  const description =
    `Every one of the ${data.total.toLocaleString("en-IN")} SEBI-registered PMS strategies we track, from ` +
    `${data.managerCount.toLocaleString("en-IN")} portfolio managers, listed A–Z with AUM and 3-year returns as on ${data.asOn}.` +
    (data.page > 1 ? ` Page ${data.page} of ${data.totalPages}.` : "");

  return {
    title: { absolute: `${title} | PlanMyCashflows` },
    description,
    alternates: { canonical: `${siteConfig.url}${pmsDirectoryHref(data.page)}` },
    openGraph: {
      type: "website",
      url: `${siteConfig.url}${pmsDirectoryHref(data.page)}`,
      siteName: siteConfig.name,
      locale: "en_IN",
      title,
      description,
    },
    twitter: { card: "summary_large_image", title, description },
  };
}

export async function PmsDirectory({ page }: { page: number }) {
  const data = await loadDirectory(page);
  if (!data) notFound();

  const { totalPages, total, managerCount, asOn, items, letterPages } = data;
  const prevHref = page > 1 ? pmsDirectoryHref(page - 1) : null;
  const nextHref = page < totalPages ? pmsDirectoryHref(page + 1) : null;

  // Group this page's slice into its letter sections, preserving A–Z order.
  const sections: Array<{ bucket: string; items: StrategyLink[] }> = [];
  for (const item of items) {
    const bucket = pmsAlphaBucket(item.strategy);
    const last = sections[sections.length - 1];
    if (last && last.bucket === bucket) last.items.push(item);
    else sections.push({ bucket, items: [item] });
  }

  const canonical = `${siteConfig.url}${pmsDirectoryHref(page)}`;
  const first = (page - 1) * PMS_DIRECTORY_PAGE_SIZE + 1;
  const last = first + items.length - 1;

  return (
    <div className="font-ui min-h-screen" style={{ background: "var(--page)", color: "var(--ink)" }}>
      {/* Pagination signals. React hoists these into <head>; the Metadata API
          has no field for rel=prev/next, so they are declared here. */}
      {prevHref && <link rel="prev" href={`${siteConfig.url}${prevHref}`} />}
      {nextHref && <link rel="next" href={`${siteConfig.url}${nextHref}`} />}

      <StructuredData
        data={breadcrumbSchema([
          { name: "Home", url: siteConfig.url },
          { name: "PMS", url: `${siteConfig.url}/investment-products/pms` },
          { name: "All strategies", url: `${siteConfig.url}/pms/all` },
          ...(page > 1 ? [{ name: `Page ${page}`, url: canonical }] : []),
        ])}
      />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10">
        <Link href="/investment-products/pms" className="font-ui inline-flex items-center gap-1.5 hover:underline"
          style={{ fontSize: 13, fontWeight: 500, color: "var(--green-deep)" }}>
          <ArrowLeft size={14} /> PMS Explorer
        </Link>

        {/* Page number in the h1 so the 18 pages of the series aren't 18
            identically-titled documents. */}
        <h1 className="font-display mt-4" style={{ fontSize: 34, fontWeight: 600, lineHeight: 1.1 }}>
          All PMS strategies, A–Z{page > 1 ? ` — page ${page} of ${totalPages}` : ""}
        </h1>
        <p className="font-ui" style={{ fontSize: 15, color: "var(--muted)", marginTop: 10, maxWidth: 640, lineHeight: 1.55 }}>
          Every one of the {total.toLocaleString("en-IN")} strategies we track from{" "}
          {managerCount.toLocaleString("en-IN")} SEBI-registered portfolio managers, in alphabetical order — the complete
          list, not a filtered view. Returns are 3-year annualised as on {asOn}. Use the{" "}
          <Link href="/investment-products/pms" style={{ color: "var(--green-deep)", fontWeight: 500 }}>PMS Explorer</Link>{" "}
          to filter and sort by alpha instead.
        </p>

        {/* A–Z index: each letter links to the page it starts on. */}
        <nav aria-label="Jump to letter" className="flex flex-wrap gap-1.5 mt-6">
          {letterPages.map(([bucket, letterPage]) => (
            <a
              key={bucket}
              href={`${pmsDirectoryHref(letterPage)}#${bucketId(bucket)}`}
              className="font-num inline-flex items-center justify-center rounded-lg hover:bg-[var(--green-tint)]"
              style={{ minWidth: 30, height: 30, fontSize: 13, fontWeight: 600, color: "var(--ink)", background: "#fff", border: "1px solid var(--line)" }}
            >
              {bucket}
            </a>
          ))}
        </nav>

        <p className="font-num mt-5" style={{ fontSize: 12.5, color: "var(--muted)" }}>
          Showing {first.toLocaleString("en-IN")}–{last.toLocaleString("en-IN")} of {total.toLocaleString("en-IN")}
          {totalPages > 1 ? ` · page ${page} of ${totalPages}` : ""}
        </p>

        {sections.map((section) => (
          <section key={section.bucket} className="mt-6">
            <h2 id={bucketId(section.bucket)} className="font-display" style={{ fontSize: 20, fontWeight: 600, scrollMarginTop: 80 }}>
              {section.bucket}
            </h2>
            <div className="mt-2">
              <StrategyLinkList items={section.items} label={`Strategies starting with ${section.bucket}`} />
            </div>
          </section>
        ))}

        {/* pagination */}
        {totalPages > 1 && (
          <nav aria-label="Directory pagination" className="mt-8 flex flex-wrap items-center justify-center gap-1.5">
            {prevHref ? (
              <a href={prevHref} rel="prev" className="font-ui rounded-lg px-3 py-1.5"
                style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)", background: "#fff", border: "1px solid var(--line)" }}>
                ← Previous
              </a>
            ) : null}
            {/* EVERY page number, not a window around the current one. This is
                what makes the 3-click promise hold: homepage → /pms/all →
                any directory page → any strategy. Elide page 9 of 18 behind an
                ellipsis and the strategies on it become four clicks deep. At
                100 per page the full run is ~18 links — cheap insurance. */}
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) =>
              n === page ? (
                <span key={n} aria-current="page" className="font-num rounded-lg px-3 py-1.5"
                  style={{ fontSize: 13, fontWeight: 600, color: "#fff", background: "var(--ink)", border: "1px solid var(--ink)" }}>
                  {n}
                </span>
              ) : (
                <a key={n} href={pmsDirectoryHref(n)} className="font-num rounded-lg px-3 py-1.5"
                  style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)", background: "#fff", border: "1px solid var(--line)" }}>
                  {n}
                </a>
              ),
            )}
            {nextHref ? (
              <a href={nextHref} rel="next" className="font-ui rounded-lg px-3 py-1.5"
                style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)", background: "#fff", border: "1px solid var(--line)" }}>
                Next →
              </a>
            ) : null}
          </nav>
        )}

        <ComplianceFootnote asOn={asOn} benchName={BENCH_NAME} />
      </div>
    </div>
  );
}
