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
  // The derived price-movement fields live in a collapsed fieldset so the
  // append-only priceHistory log stays out of the way — nobody hand-edits it,
  // and a manual edit that broke a _key's uniqueness would break the importer.
  fieldsets: [
    {
      name: "priceMovement",
      title: "Derived price movement (importer-maintained)",
      options: { collapsible: true, collapsed: true },
    },
  ],
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
    // ── Derived price movement — written by the importer, never by hand ────────
    // The partner sends one spot price with no change data, so any movement we
    // show is derived and stored by us. All three fields below are maintained by
    // scripts/import-unlisted-prices.mjs (seeded once by
    // scripts/seed-unlisted-history.mjs). They are readOnly because a manual
    // edit that breaks priceHistory's _key uniqueness would break the importer's
    // idempotency, and because previousPrice*/asOfDate are only meaningful when
    // derived from priceHistory. CONFIDENTIALITY: priceHistory carries ONLY the
    // retail/indicative price — the same value written to indicativePriceINR.
    // The dealer/cost price never reaches it (asserted at write time).
    defineField({
      name: "priceHistory",
      title: "Price history",
      type: "array",
      readOnly: true,
      fieldset: "priceMovement",
      description:
        "Append-only log of the retail/indicative prices we have seen, one per distinct as-of date. " +
        "Written by the importer; do not edit by hand. Field names are one character to keep the " +
        "document small (this is written ~250×/year per company).",
      of: [
        defineField({
          name: "pricePoint",
          type: "object",
          // _key is set to the date string by the importer, so Sanity's
          // unique-key rule makes a repeated import for the same date a no-op.
          fields: [
            defineField({ name: "d", title: "Date", type: "date", validation: (r) => r.required() }),
            defineField({ name: "p", title: "Indicative price (₹)", type: "number", validation: (r) => r.required() }),
          ],
          preview: {
            select: { d: "d", p: "p" },
            prepare({ d, p }) {
              return { title: typeof p === "number" ? `₹${p.toLocaleString("en-IN")}` : "—", subtitle: d };
            },
          },
        }),
      ],
    }),
    defineField({
      name: "previousPriceINR",
      title: "Previous indicative price (₹ / share)",
      type: "number",
      readOnly: true,
      fieldset: "priceMovement",
      description:
        "The indicative price from the prior distinct as-of date. Derived by the importer so the card " +
        "can show a change indicator without loading the full history. Do not edit by hand.",
    }),
    defineField({
      name: "previousAsOfDate",
      title: "Previous price as of",
      type: "date",
      readOnly: true,
      fieldset: "priceMovement",
      description: "The as-of date `previousPriceINR` was recorded on. Derived by the importer.",
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
