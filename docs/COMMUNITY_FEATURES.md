# Community features — comments, likes & guest contributions

This adds two reader-facing systems to the blog:

1. **Engagement** — signed-in readers can like posts, comment (with one level
   of replies), like comments, and edit/delete their own comments. Counts feed
   the page's SEO structured data (`commentCount`, `interactionStatistic`).
2. **Guest contributions** — `/blog/contribute` lets a signed-in reader submit
   an article. It lands as a **draft blog post in Sanity Studio** for you to
   review, edit, and publish — the contributor tracks status on the same page.

Both degrade gracefully: if Supabase env vars are absent the UI hides itself,
and if the Sanity write token is absent submissions are still stored safely in
Supabase (you get the full article by email).

---

## 1. One-time setup

### a. Run the database migration

Open the Supabase dashboard → SQL Editor and paste the contents of
`supabase/migrations/20260709120000_blog_engagement.sql`, then Run.
(Or `supabase db push` if you use the CLI.)

This creates the tables `blog_likes`, `blog_comments`, `blog_comment_likes`,
`blog_submissions`, and `blog_admins`, all protected with row-level security —
the browser only ever uses the public anon key.

### b. Make yourself an admin

In the SQL editor:

```sql
insert into public.blog_admins (email) values ('you@yourdomain.com');
```

Admins see **Hide** / **Delete** buttons on every comment when signed in with
that email, and can update submission statuses.

### c. Add the Sanity write token (recommended)

So submissions appear as review-ready drafts in your Studio:

1. sanity.io/manage → your project → **API → Tokens → Add token**
2. Name it e.g. `submissions-writer`, role **Editor**
3. Add to Netlify env vars: `SANITY_API_WRITE_TOKEN=<token>`

Without it, submissions are still saved in Supabase and emailed to you — you
just paste them into the Studio manually.

No other env vars are needed — the features reuse the existing
`NEXT_PUBLIC_SUPABASE_*`, `RESEND_*`, `SLACK_WEBHOOK_URL`, and Upstash config.

---

## 2. Reviewing guest submissions

1. You get a Slack ping + email when someone submits.
2. Open **Studio → Editorial → Guest Submissions (review queue)**.
3. The draft has the title, excerpt, category, and body already in place.
   The "Guest submission" tab shows the submitted byline, bio, and email.
4. **To approve:** create (or pick) an Author document for the contributor
   (name/bio are on the Guest submission tab), assign it in Metadata, add a
   hero image if you like, then **Publish**. The contributor's status page
   flips to "Published" automatically and they can see it live.
5. **To decline:** delete the draft, and optionally set the row's `status`
   to `declined` in Supabase → Table editor → `blog_submissions` (this is
   what the contributor sees on their status page).

Abuse guards: submissions require sign-in, are capped at 3/day per account
plus the shared per-IP rate limit, and validated server-side (length limits,
known categories only).

---

## 3. Moderating comments

- Comments are live immediately (sign-in required to write).
- As an admin, use **Hide** on any comment to remove it from public view
  (kept in the table for the record) or **Delete** to remove it entirely.
- Bulk moderation: Supabase dashboard → Table editor → `blog_comments`
  (set `status` to `hidden`).

---

## 4. Where things live

| Piece | Path |
| --- | --- |
| SQL migration | `supabase/migrations/20260709120000_blog_engagement.sql` |
| Like/comment data layer | `lib/engagement.ts` |
| Server-side counts (SEO) | `lib/supabase-server.ts` |
| Like bar under post title | `components/blog/EngagementBar.tsx` |
| Discussion section | `components/blog/CommentsSection.tsx` |
| Contribute page | `app/(site)/blog/contribute/page.tsx` |
| Contribute form + status list | `components/blog/ContributeForm.tsx` |
| Submissions API | `app/api/submissions/route.ts` |
| Markdown → Portable Text | `lib/markdown-to-portable-text.ts` |
| Studio review queue | `sanity/structure.ts` + fields in `sanity/schemas/blogPost.ts` |
