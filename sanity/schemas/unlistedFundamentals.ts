import { defineType, defineField } from "sanity";

/**
 * Annual fundamentals for one unlisted company (one document per company).
 * Written by scripts/import-unlisted-fundamentals.mjs from a CSV; read by
 * scripts/unlisted-snapshot.mjs. Kept separate from unlistedShare so the price
 * importer, the audit and this import never write to each other's documents.
 *
 * CONFIDENTIALITY: this dataset is PUBLICLY READABLE. No price of any kind is
 * stored here — valuation uses the RETAIL price on unlistedShare at snapshot
 * time. Never add a dealer/cost/buy price field.
 *
 * Money figures are ₹ crore. sharesOutstanding is an absolute count.
 */
const SOURCES = ["MCA", "Tofler", "DRHP", "Annual report"];

export const unlistedFundamentals = defineType({
  name: "unlistedFundamentals",
  title: "Unlisted Fundamentals",
  type: "document",
  fields: [
    defineField({
      name: "share",
      title: "Company",
      type: "reference",
      to: [{ type: "unlistedShare" }],
      weak: true,
      validation: (r) => r.required(),
    }),
    defineField({ name: "company", type: "string", readOnly: true, description: "Copied from the company for display. Edit the name on the Unlisted Share." }),
    defineField({ name: "slug", type: "string", readOnly: true, description: "The company's slug (identity used by the CSV import)." }),
    defineField({
      name: "cin",
      title: "CIN",
      type: "string",
      description: "21-character Corporate Identification Number (MCA). Identity for later imports.",
      validation: (r) => r.regex(/^[LU]\d{5}[A-Z]{2}\d{4}[A-Z]{3}\d{6}$/, { name: "CIN" }),
    }),
    defineField({ name: "sector", type: "string", description: "Sector for the fundamentals view. Does not change the site's sector." }),
    defineField({ name: "drhpStatus", title: "DRHP status", type: "string", options: { list: ["none", "filed", "approved"] } }),
    defineField({ name: "drhpFiledDate", title: "DRHP filed", type: "date" }),
    defineField({ name: "drhpApprovedDate", title: "DRHP approved (SEBI observation)", type: "date" }),
    defineField({ name: "listedPeers", title: "Listed peer tickers", type: "array", of: [{ type: "string" }], description: 'e.g. "NSE:AARTIIND". Context only.' }),
    defineField({ name: "notableInvestors", type: "array", of: [{ type: "string" }], description: "Context only — never scored." }),
    defineField({
      name: "years",
      title: "Financial years",
      type: "array",
      description: "One entry per FY, keyed by FY end date. Written by the importer; restatements need --allow-restatement.",
      of: [
        defineField({
          name: "fundamentalsYear",
          type: "object",
          fields: [
            defineField({ name: "fyEnd", title: "FY end", type: "date", validation: (r) => r.required() }),
            defineField({ name: "revenueCr", title: "Revenue (₹ cr)", type: "number" }),
            defineField({ name: "ebitdaCr", title: "EBITDA (₹ cr)", type: "number" }),
            defineField({ name: "patCr", title: "PAT (₹ cr)", type: "number" }),
            defineField({ name: "ocfCr", title: "Operating cash flow (₹ cr)", type: "number" }),
            defineField({ name: "netWorthCr", title: "Net worth (₹ cr)", type: "number" }),
            defineField({ name: "totalDebtCr", title: "Total debt (₹ cr)", type: "number" }),
            defineField({ name: "cashCr", title: "Cash & equivalents (₹ cr)", type: "number" }),
            defineField({ name: "sharesOutstanding", title: "Shares outstanding", type: "number" }),
            defineField({ name: "auditor", type: "string" }),
            defineField({ name: "auditQualified", title: "Audit report qualified?", type: "boolean" }),
            defineField({ name: "auditQualificationNote", type: "text", rows: 2 }),
            defineField({ name: "source", type: "string", options: { list: SOURCES }, validation: (r) => r.required() }),
            defineField({ name: "sourceDate", type: "date", validation: (r) => r.required() }),
            defineField({ name: "importedAt", type: "date", readOnly: true }),
            defineField({ name: "restatedAt", type: "date", readOnly: true }),
          ],
          preview: {
            select: { fy: "fyEnd", rev: "revenueCr", src: "source" },
            prepare: ({ fy, rev, src }) => ({ title: `FY ending ${fy}`, subtitle: [typeof rev === "number" ? `Revenue ₹${rev} cr` : null, src].filter(Boolean).join(" · ") }),
          },
        }),
      ],
    }),
  ],
  preview: {
    select: { title: "company", cin: "cin", drhp: "drhpStatus" },
    prepare: ({ title, cin, drhp }) => ({ title, subtitle: [cin, drhp && drhp !== "none" ? `DRHP ${drhp}` : null].filter(Boolean).join(" · ") }),
  },
});
