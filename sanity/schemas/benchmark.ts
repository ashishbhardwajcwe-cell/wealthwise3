import { defineType, defineField } from "sanity";

/**
 * A benchmark return series (e.g. S&P BSE 500 TRI) — the comparison line
 * for PMS alpha on the explorer and /pms/[slug] pages. Updated by the
 * monthly refresh (scripts/fetch-benchmark.mjs) or by hand in the Studio
 * when APMI doesn't publish benchmark rows.
 *
 * Leave a period empty when there is no clean like-for-like series for it
 * (typically 5Y and Since inception) — the site suppresses alpha for any
 * period without a value rather than comparing against a mismatched line.
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
      description: 'Must match what the site queries, e.g. "S&P BSE 500 TRI"',
      validation: (r) => r.required(),
    }),
    defineField({
      name: "returns",
      title: "Returns (%, annualised beyond 1Y)",
      type: "object",
      fields: [
        { name: "m1", title: "1-month", type: "number" },
        { name: "m3", title: "3-month", type: "number" },
        { name: "m6", title: "6-month", type: "number" },
        { name: "y1", title: "1-year", type: "number" },
        { name: "y2", title: "2-year", type: "number" },
        { name: "y3", title: "3-year", type: "number" },
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
      description: "Where the figures came from (e.g. APMI IA report, Jun 2026)",
    }),
  ],
  preview: {
    select: { title: "name", date: "asOfDate" },
    prepare({ title, date }) {
      return { title, subtitle: `as of ${date ?? "—"}` };
    },
  },
});
