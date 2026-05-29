import { defineType, defineField } from "sanity";

export const author = defineType({
  name: "author",
  title: "Author",
  type: "document",
  fields: [
    defineField({ name: "name", type: "string", validation: (r) => r.required() }),
    defineField({
      name: "slug",
      type: "slug",
      options: { source: "name" },
      validation: (r) => r.required(),
    }),
    defineField({ name: "role", type: "string", description: "e.g. Founder, Editor, Guest contributor" }),
    defineField({ name: "image", type: "image", options: { hotspot: true } }),
    defineField({
      name: "bio",
      type: "array",
      of: [{ type: "block" }],
      description: "Short biography shown in author footer of posts",
    }),
    defineField({
      name: "socials",
      type: "object",
      fields: [
        { name: "linkedin", type: "url", title: "LinkedIn" },
        { name: "twitter", type: "url", title: "Twitter / X" },
        { name: "youtube", type: "url", title: "YouTube" },
      ],
    }),
  ],
  preview: {
    select: { title: "name", subtitle: "role", media: "image" },
  },
});
