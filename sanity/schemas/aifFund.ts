import { defineType, defineField } from "sanity";

/**
 * AIF fund — a directory row, registry-first.
 *
 * The base record is a SEBI-registered Alternative Investment Fund pulled
 * from SEBI's public "Recognised Intermediaries" list (name, SEBI
 * registration number, broad category I/II/III, registration date, sponsor /
 * manager where published). Documents are keyed by registration number, so
 * the monthly registry refresh updates them in place.
 *
 * Performance (net IRR / MOIC / DPI / TVPI, fund size, fees, tenor, …) is
 * layered on later, only for the select funds whose AMCs share a factsheet —
 * so those fields stay optional and are carried forward across registry
 * refreshes rather than being wiped.
 */
export const aifFund = defineType({
  name: "aifFund",
  title: "AIF Fund",
  type: "document",
  fields: [
    // --- registry (SEBI) ---
    defineField({ name: "fundName", title: "AIF name", type: "string", validation: (r) => r.required() }),
    defineField({
      name: "registrationNo",
      title: "SEBI registration no.",
      type: "string",
      description: "e.g. IN/AIF2/23-24/1234 — the natural key; imports upsert on this.",
      validation: (r) => r.required(),
    }),
    defineField({
      name: "category",
      title: "Category",
      type: "string",
      description: "Broad SEBI category as published in the registry.",
      options: {
        list: [
          { title: "Category I", value: "I" },
          { title: "Category II", value: "II" },
          { title: "Category III", value: "III" },
        ],
      },
    }),
    defineField({ name: "registrationDate", title: "Registration date", type: "date" }),
    defineField({ name: "sponsor", title: "Sponsor", type: "string" }),
    defineField({ name: "manager", title: "Investment manager", type: "string" }),

    // --- performance (added later, per fund, from AMC factsheets) ---
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

    // --- provenance ---
    defineField({ name: "asOfDate", title: "Data as of", type: "date", validation: (r) => r.required() }),
    defineField({
      name: "source",
      title: "Data source",
      type: "string",
      description: "Registry rows: 'SEBI registered intermediaries list'. Performance rows: the AMC factsheet + date.",
      initialValue: "SEBI registered intermediaries list",
    }),
    defineField({ name: "notes", type: "text", rows: 3 }),
  ],
  preview: {
    select: { title: "fundName", category: "category", reg: "registrationNo" },
    prepare({ title, category, reg }) {
      const cat = category ? `Cat ${category}` : "—";
      return { title, subtitle: `${cat} · ${reg ?? "no reg no."}` };
    },
  },
});
