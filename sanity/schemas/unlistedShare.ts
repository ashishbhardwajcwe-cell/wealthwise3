import { defineType, defineField } from "sanity";

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
      name: "sector",
      type: "string",
      options: {
        list: ["Fintech", "Consumer", "Tech", "Healthcare", "Finance", "Industrials", "Energy", "Real Estate", "Other"],
      },
    }),
    defineField({
      name: "priceLowINR",
      title: "Price — low end (₹)",
      type: "number",
      validation: (r) => r.required(),
    }),
    defineField({
      name: "priceHighINR",
      title: "Price — high end (₹)",
      type: "number",
      validation: (r) => r.required(),
    }),
    defineField({
      name: "lotSize",
      title: "Typical lot size",
      type: "number",
      description: "Most platforms have a min lot. e.g. 50, 100, 500 shares",
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
      name: "platformsAvailable",
      title: "Platforms where listed",
      type: "array",
      of: [{ type: "string" }],
      options: { list: ["UnlistedArena", "Stockify", "Precize", "Altius", "Sharescart", "Other"] },
    }),
    defineField({
      name: "asOfDate",
      title: "Price as of",
      type: "date",
      validation: (r) => r.required(),
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
    select: { title: "company", subtitle: "sector", date: "asOfDate" },
    prepare({ title, subtitle, date }) {
      return { title, subtitle: `${subtitle} · ${date ?? ""}` };
    },
  },
});
