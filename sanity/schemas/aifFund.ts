import { defineType, defineField } from "sanity";

export const aifFund = defineType({
  name: "aifFund",
  title: "AIF Fund",
  type: "document",
  fields: [
    defineField({ name: "fundName", type: "string", validation: (r) => r.required() }),
    defineField({ name: "manager", type: "string", validation: (r) => r.required() }),
    defineField({
      name: "category",
      type: "string",
      options: {
        list: [
          { title: "Cat I — VC / Startup", value: "Cat I - VC" },
          { title: "Cat I — Infrastructure", value: "Cat I - Infra" },
          { title: "Cat I — Social", value: "Cat I - Social" },
          { title: "Cat II — Private Equity", value: "Cat II - PE" },
          { title: "Cat II — Private Credit", value: "Cat II - Credit" },
          { title: "Cat II — Real Estate", value: "Cat II - RE" },
          { title: "Cat II — Fund of Funds", value: "Cat II - FoF" },
          { title: "Cat III — Long-short", value: "Cat III - LS" },
          { title: "Cat III — Quant", value: "Cat III - Quant" },
        ],
      },
    }),
    defineField({ name: "vintage", title: "Vintage year", type: "number" }),
    defineField({ name: "fundSize", title: "Fund size (₹ Cr)", type: "number" }),
    defineField({ name: "minCommitmentCr", title: "Min commitment (₹ Cr)", type: "number", initialValue: 1 }),
    defineField({ name: "tenor", title: "Tenor (years)", type: "number" }),
    defineField({
      name: "fees",
      type: "object",
      fields: [
        { name: "management", title: "Management fee %", type: "number" },
        { name: "carry", title: "Carry / performance %", type: "number" },
        { name: "hurdle", title: "Hurdle %", type: "number" },
      ],
    }),
    defineField({
      name: "returns",
      title: "Performance",
      type: "object",
      fields: [
        { name: "netIrr", title: "Net IRR %", type: "number" },
        { name: "moic", title: "MOIC (multiple)", type: "number" },
        { name: "dpi", title: "DPI", type: "number" },
        { name: "tvpi", title: "TVPI", type: "number" },
      ],
    }),
    defineField({ name: "asOfDate", title: "Data as of", type: "date", validation: (r) => r.required() }),
    defineField({ name: "notes", type: "text", rows: 3 }),
  ],
  preview: {
    select: { title: "fundName", subtitle: "category", date: "asOfDate" },
    prepare({ title, subtitle, date }) {
      return { title, subtitle: `${subtitle} · ${date ?? ""}` };
    },
  },
});
