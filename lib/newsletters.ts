/**
 * Manifest of published Monthly PMS Brief issues, NEWEST FIRST.
 *
 * Drives /resources/newsletter. Publishing an issue = drop the PDF into
 * public/newsletters/ AND add its entry at the top of this list
 * (docs/OPERATIONS.md, Part 6).
 *
 * Keep this file free of imports: scripts/newsletters.test.mjs transpiles it
 * on its own and fails `npm run build` (via prebuild) if any `file` below is
 * missing from public/.
 */

export interface NewsletterIssue {
  /** "YYYY-MM" of the data month. */
  slug: string;
  /** "September 2026" */
  label: string;
  /** Zero-padded "YYYY-MM-DD" — the APMI data date the issue is built on. */
  asOfDate: string;
  title: string;
  /** One neutral, educational sentence. No "best"/"top", no predictions. */
  summary: string;
  /** Public path, served from public/ — "/newsletters/<file>.pdf". */
  file: string;
  pages: number;
}

export const NEWSLETTERS: NewsletterIssue[] = [
  {
    slug: "2026-09",
    label: "September 2026",
    asOfDate: "2026-09-30",
    title: "Two in three didn't beat the index.",
    summary:
      "Over three years, 686 of 1,019 PMS strategies returned less than the S&P BSE 500 TRI, net of fees.",
    file: "/newsletters/PlanMyCashflows-PMS-Brief-September-2026.pdf",
    pages: 3,
  },
  {
    slug: "2026-06",
    label: "June 2026",
    asOfDate: "2026-06-30",
    title: "PMS & AIF Performance",
    summary:
      "A June 2026 market snapshot, one PMS strategy per category on 3-year alpha over the S&P BSE 500 TRI, and the strategies that beat the benchmark across 1-, 3- and 5-year windows.",
    file: "/newsletters/PlanMyCashflows-PMS-Brief-June-2026.pdf",
    pages: 4,
  },
];
