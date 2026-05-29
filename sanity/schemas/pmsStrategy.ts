import { defineType, defineField } from "sanity";

export const pmsStrategy = defineType({
  name: "pmsStrategy",
  title: "PMS Strategy",
  type: "document",
  fields: [
    defineField({ name: "strategyName", title: "Strategy name", type: "string", validation: (r) => r.required() }),
    defineField({ name: "manager", title: "Manager / firm", type: "string", validation: (r) => r.required() }),
    defineField({
      name: "category",
      type: "string",
      options: { list: ["Multicap", "Largecap", "Midcap", "Smallcap", "Thematic", "Quant", "Hybrid"] },
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
      name: "returns",
      title: "Returns (% CAGR)",
      type: "object",
      fields: [
        { name: "y1", title: "1-year", type: "number" },
        { name: "y3", title: "3-year", type: "number" },
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
      description: "Where this data came from (e.g. PMS Bazaar, manager website)",
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
