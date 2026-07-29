import { defineType, defineField } from "sanity";

export const pmsStrategy = defineType({
  name: "pmsStrategy",
  title: "PMS Strategy",
  type: "document",
  fields: [
    defineField({ name: "strategyName", title: "Strategy name", type: "string", validation: (r) => r.required() }),
    defineField({ name: "manager", title: "Manager / firm", type: "string", validation: (r) => r.required() }),
    defineField({
      name: "logo",
      title: "Manager logo",
      type: "image",
      options: { hotspot: true },
      description:
        "The manager/firm's logo, shown on the strategy card in place of the monogram. Seeded per-manager by scripts/import-pms-logos.mjs (every strategy of a firm gets the same logo). Replace with a cleaner logo in Studio anytime.",
    }),
    defineField({
      name: "category",
      type: "string",
      // Each value drives a /pms/category/[slug] landing page (slugified —
      // "Largecap" → /pms/category/largecap). Editorial copy for the page
      // lives in PMS_CATEGORIES in lib/pms.ts; add an entry there when adding
      // a value here, or the page falls back to a generic intro.
      options: { list: ["Multicap", "Largecap", "Midcap", "Smallcap", "Thematic", "Quant", "Hybrid", "Debt"] },
    }),
    defineField({
      name: "aumCr",
      title: "AUM (₹ Cr)",
      type: "number",
    }),
    defineField({
      name: "minInvestmentL",
      title: "Minimum investment (₹ lakhs)",
      type: "number",
      initialValue: 50,
    }),
    defineField({
      name: "inceptionDate",
      title: "Inception date",
      type: "date",
      description:
        "When the investment approach launched, as published by APMI. Distinct from 'Data as of', which is the month-end the returns refer to. Shown as 'Since …' on the strategy card, brief sheet and strategy page — and it's what tells a reader whether a since-inception figure covers two years or twenty.",
    }),
    defineField({
      name: "returns",
      title: "Returns (% CAGR)",
      type: "object",
      fields: [
        { name: "m1", title: "1-month", type: "number" },
        { name: "m3", title: "3-month", type: "number" },
        { name: "m6", title: "6-month", type: "number" },
        { name: "y1", title: "1-year", type: "number" },
        { name: "y2", title: "2-year", type: "number" },
        { name: "y3", title: "3-year", type: "number" },
        { name: "y4", title: "4-year", type: "number" },
        { name: "y5", title: "5-year", type: "number" },
        { name: "sinceInception", title: "Since inception", type: "number" },
      ],
    }),
    defineField({
      name: "fees",
      title: "Fee structure",
      type: "object",
      fields: [
        { name: "fixed", title: "Fixed % p.a.", type: "number" },
        { name: "performance", title: "Performance fee %", type: "number" },
        { name: "hurdle", title: "Hurdle rate %", type: "number" },
      ],
    }),
    defineField({
      name: "asOfDate",
      title: "Data as of",
      type: "date",
      validation: (r) => r.required(),
    }),
    defineField({
      name: "source",
      type: "string",
      description: "Where this data came from (e.g. APMI monthly report, manager factsheet)",
    }),
    defineField({
      name: "notes",
      type: "text",
      rows: 3,
      description: "Editorial notes — what makes this strategy distinctive",
    }),
  ],
  preview: {
    select: { title: "strategyName", subtitle: "manager", date: "asOfDate" },
    prepare({ title, subtitle, date }) {
      return { title, subtitle: `${subtitle} · ${date ?? ""}` };
    },
  },
});
