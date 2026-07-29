import { defineType, defineField } from "sanity";

/**
 * Benchmark — the market index the PMS explorer measures alpha against
 * (S&P BSE 500 TRI). Kept as its own document so the monthly refresh can
 * update the benchmark returns the same way it updates strategy returns,
 * instead of hardcoding them in the front-end.
 *
 * Effectively a singleton: the desk structure pins a single document, and
 * the site query reads the newest one. Any period left blank suppresses
 * alpha for that window on the site (5Y / SI are usually blank because
 * there's no clean like-for-like series for them).
 */
export const benchmark = defineType({
  name: "benchmark",
  title: "Benchmark",
  type: "document",
  fields: [
    defineField({
      name: "name",
      title: "Benchmark name",
      type: "string",
      description: 'Shown on the explorer and strategy pages, e.g. "S&P BSE 500 TRI".',
      validation: (r) => r.required(),
    }),
    defineField({
      name: "returns",
      title: "Returns (%)",
      type: "object",
      description:
        "Total-return-index performance for each window. Leave a field blank where there's no clean like-for-like series — the site then shows the raw fund return with no alpha for that window.",
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
      name: "asOfDate",
      title: "Data as of",
      type: "date",
      validation: (r) => r.required(),
    }),
    defineField({
      name: "source",
      type: "string",
      description: "Where these figures came from (e.g. APMI monthly report, Jun 2026).",
    }),
  ],
  preview: {
    select: { title: "name", date: "asOfDate" },
    prepare({ title, date }) {
      return { title: title ?? "Benchmark", subtitle: date ? `as of ${date}` : "" };
    },
  },
});
