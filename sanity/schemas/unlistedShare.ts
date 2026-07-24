import { defineType, defineField } from "sanity";

/**
 * Unlisted / pre-IPO share — Mode 2: daily indicative prices from a
 * distribution partner's price list, imported by
 * scripts/import-unlisted-prices.mjs and layered over hand-curated editorial
 * content (summary, sector, risks).
 *
 * ── CONFIDENTIALITY — READ BEFORE ADDING FIELDS ────────────────────────────
 * This Sanity dataset is PUBLICLY READABLE. The partner's price list also
 * carries a confidential DEALER (cost) price per share. There must be NO
 * field for a dealer/cost/buy price on this schema — ever — and no code in
 * this repo may store, log, or print it. The importer is written to never
 * even capture that column. Only the retail/indicative price belongs here.
 * ───────────────────────────────────────────────────────────────────────────
 */
export const unlistedShare = defineType({
  name: "unlistedShare",
  title: "Unlisted Share",
  type: "document",
  fields: [
    defineField({ name: "company", type: "string", validation: (r) => r.required() }),
    defineField({
      name: "slug",
      type: "slug",
      options: { source: "company" },
    }),
    defineField({
      name: "logo",
      title: "Company logo",
      type: "image",
      options: { hotspot: true },
      description:
        "The company's own brand mark, shown on the card in place of the monogram. Seeded by scripts/extract-unlisted-logos.mjs (it crops ONLY the left logo cell of the partner list — never a price column). Safe to replace with a cleaner logo in Studio.",
    }),
    defineField({
      name: "sector",
      type: "string",
      description: 'Editorial sector label, e.g. "Financial Markets", "Consumer Electronics".',
    }),
    defineField({
      name: "indicativePriceINR",
      title: "Indicative price (₹ / share)",
      type: "number",
      description: "Retail/indicative price per share from the partner's daily list. Refreshed by the importer.",
    }),
    defineField({
      name: "depository",
      type: "string",
      description: "Where the shares can settle, as published on the price list.",
      options: { list: ["NSDL & CDSL", "NSDL only", "CDSL only"] },
    }),
    defineField({
      name: "lotSize",
      title: "Minimum lot size",
      type: "number",
      description: "Minimum number of shares per transaction, from the price list.",
    }),
    defineField({
      name: "ipoStatus",
      title: "IPO status",
      type: "string",
      options: {
        list: [
          { title: "No public timeline", value: "none" },
          { title: "Expected this FY", value: "this-fy" },
          { title: "Expected next FY", value: "next-fy" },
          { title: "DRHP filed", value: "drhp-filed" },
          { title: "IPO scheduled", value: "scheduled" },
        ],
      },
    }),
    defineField({
      name: "asOfDate",
      title: "Price as of",
      type: "date",
      description: "Set by the price importer from the list's header date. Blank until the first price lands.",
    }),
    defineField({
      name: "partner",
      type: "string",
      description: 'Internal partner code the last price came from (e.g. "uz"). Provenance only — never rendered on the site.',
    }),
    defineField({
      name: "aliases",
      type: "array",
      of: [{ type: "string" }],
      description: "Raw name variants seen on partner lists (including truncated ones). Used by the importer for matching — don't prune casually.",
    }),
    defineField({
      name: "isActive",
      type: "boolean",
      initialValue: true,
      description: "Untick to hide the company from the site without deleting its history.",
    }),
    defineField({
      name: "needsReview",
      type: "boolean",
      initialValue: false,
      description: "Set by the importer when it auto-creates a company it couldn't match. Review the name/sector/summary, then untick.",
    }),
    defineField({
      name: "summary",
      type: "text",
      rows: 4,
      description: "What this company does, in 2-3 sentences",
    }),
    defineField({
      name: "risks",
      type: "array",
      of: [{ type: "string" }],
    }),
  ],
  preview: {
    select: { title: "company", sector: "sector", review: "needsReview", date: "asOfDate" },
    prepare({ title, sector, review, date }) {
      return {
        title: review ? `⚠ ${title}` : title,
        subtitle: [sector, date].filter(Boolean).join(" · "),
      };
    },
  },
});
