import { defineType, defineField } from "sanity";

export const stockAnalysis = defineType({
  name: "stockAnalysis",
  title: "Stock Analysis",
  type: "document",
  fields: [
    defineField({ name: "title", type: "string", validation: (r) => r.required() }),
    defineField({
      name: "slug",
      type: "slug",
      options: { source: "title" },
      validation: (r) => r.required(),
    }),
    defineField({
      name: "ticker",
      title: "NSE / BSE ticker",
      type: "string",
      description: 'e.g. "TCS", "RELIANCE", "HDFCBANK"',
      validation: (r) => r.required(),
    }),
    defineField({
      name: "company",
      title: "Company name",
      type: "string",
      validation: (r) => r.required(),
    }),
    defineField({
      name: "sector",
      type: "string",
      options: {
        list: [
          "IT", "Banking", "NBFC", "Pharma", "FMCG", "Auto",
          "Energy", "Materials", "Telecom", "Real Estate",
          "Consumer Discretionary", "Industrials", "Utilities",
          "Healthcare", "Insurance", "Other",
        ],
      },
    }),
    defineField({
      name: "marketCap",
      title: "Market cap category",
      type: "string",
      options: { list: ["Large", "Mid", "Small", "Micro"] },
    }),
    defineField({
      name: "thesis",
      title: "Investment thesis (1-paragraph)",
      type: "text",
      rows: 4,
      description: "Why this stock is interesting, in plain English",
    }),
    defineField({
      name: "keyMetrics",
      title: "Key metrics (at time of analysis)",
      type: "object",
      fields: [
        { name: "cmp", title: "CMP (current market price ₹)", type: "number" },
        { name: "pe", title: "P/E ratio", type: "number" },
        { name: "roe", title: "ROE %", type: "number" },
        { name: "debtToEquity", title: "Debt-to-Equity", type: "number" },
        { name: "marketCapCr", title: "Market cap (₹ Cr)", type: "number" },
      ],
    }),
    defineField({
      name: "body",
      title: "Full analysis",
      type: "array",
      of: [
        { type: "block", styles: [
          { title: "Normal", value: "normal" },
          { title: "H2", value: "h2" },
          { title: "H3", value: "h3" },
        ]},
        { type: "image", options: { hotspot: true } },
      ],
    }),
    defineField({
      name: "strengths",
      title: "Strengths (3-5 bullets)",
      type: "array",
      of: [{ type: "string" }],
    }),
    defineField({
      name: "risks",
      title: "Risks (3-5 bullets)",
      type: "array",
      of: [{ type: "string" }],
    }),
    defineField({
      name: "conclusion",
      title: "Conclusion",
      type: "text",
      rows: 4,
    }),
    defineField({
      name: "analysisDate",
      title: "Date of analysis",
      type: "date",
      validation: (r) => r.required(),
    }),
    defineField({
      name: "author",
      type: "reference",
      to: [{ type: "author" }],
    }),
  ],
  preview: {
    select: { title: "title", subtitle: "ticker", date: "analysisDate" },
    prepare({ title, subtitle, date }) {
      return { title, subtitle: `${subtitle} · ${date ?? ""}` };
    },
  },
});
