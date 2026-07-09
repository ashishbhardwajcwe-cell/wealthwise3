import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createClient as createSanityClient } from "next-sanity";
import { z } from "zod";
import { resend, FROM_ADDRESS, REPLY_TO, NOTIFY_ADDRESS, isResendConfigured } from "@/lib/resend";
import { notifySlack, escapeSlack } from "@/lib/slack";
import { formRateLimit, getClientIp } from "@/lib/redis";
import { projectId, dataset, apiVersion, isSanityConfigured } from "@/sanity/env";
import { markdownToPortableText, estimateReadTime } from "@/lib/markdown-to-portable-text";
import { slugifyHeading } from "@/lib/slugify";
import { BLOG_CATEGORIES } from "@/lib/blog-data";
import { siteConfig } from "@/lib/site-config";

export const runtime = "nodejs";

/**
 * Guest article submissions ("Write for the Journal").
 *
 * POST — validates and stores the pitch in Supabase, then (when
 *   SANITY_API_WRITE_TOKEN is set) creates a DRAFT blogPost in Sanity
 *   flagged `isGuestSubmission`, so review + publish happen in the same
 *   Studio used for house content. Notifies admin via Slack/email and
 *   confirms to the contributor.
 *
 * GET — the signed-in contributor's own submissions, with status
 *   auto-upgraded to "published" when a live Sanity post carries the
 *   submission id.
 */

const submissionSchema = z.object({
  title: z.string().trim().min(8, "Title is too short").max(140, "Title is too long"),
  category: z.string().refine((c) => (BLOG_CATEGORIES as readonly string[]).includes(c), "Unknown category"),
  excerpt: z.string().trim().min(20, "Summary is too short").max(300, "Summary is too long"),
  bodyMarkdown: z.string().trim().min(300, "Article should be at least 300 characters").max(60000, "Article is too long"),
  authorName: z.string().trim().min(2).max(80),
  authorBio: z.string().trim().max(500).optional().default(""),
  linkedin: z.string().trim().url().max(200).optional().or(z.literal("")),
  twitter: z.string().trim().url().max(200).optional().or(z.literal("")),
});

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/** Client scoped to the caller's JWT so RLS applies as that user. */
function userScopedClient(accessToken: string) {
  if (!supabaseUrl || !supabaseAnonKey) return null;
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });
}

async function authenticate(req: NextRequest) {
  const authHeader = req.headers.get("authorization") ?? "";
  const token = authHeader.replace(/^Bearer\s+/i, "");
  if (!token || !supabaseUrl || !supabaseAnonKey) return null;
  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) return null;
  return { user: data.user, token };
}

export async function POST(req: NextRequest) {
  try {
    const auth = await authenticate(req);
    if (!auth) {
      return NextResponse.json({ error: "Please sign in to submit an article." }, { status: 401 });
    }

    if (formRateLimit) {
      const { success } = await formRateLimit.limit(`submission:${getClientIp(req)}`);
      if (!success) {
        return NextResponse.json({ error: "Too many requests. Please try again later." }, { status: 429 });
      }
    }

    const parsed = submissionSchema.safeParse(await req.json());
    if (!parsed.success) {
      const msg = parsed.error.issues[0]?.message ?? "Invalid submission";
      return NextResponse.json({ error: msg }, { status: 400 });
    }
    const input = parsed.data;
    const email = auth.user.email ?? "unknown";

    const db = userScopedClient(auth.token);
    if (!db) {
      return NextResponse.json({ error: "Submissions are not available right now." }, { status: 503 });
    }

    // Per-account cap: max 3 submissions per rolling 24h.
    const dayAgo = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
    const { count: recent } = await db
      .from("blog_submissions")
      .select("*", { count: "exact", head: true })
      .eq("user_id", auth.user.id)
      .gte("created_at", dayAgo);
    if ((recent ?? 0) >= 3) {
      return NextResponse.json(
        { error: "You've reached the limit of 3 submissions per day. Please try again tomorrow." },
        { status: 429 },
      );
    }

    const authorLinks: Record<string, string> = {};
    if (input.linkedin) authorLinks.linkedin = input.linkedin;
    if (input.twitter) authorLinks.twitter = input.twitter;

    // Pre-generate the id so the deterministic Sanity draft id can be stored
    // at insert time (RLS only lets admins update rows afterwards).
    const submissionId = crypto.randomUUID();
    const writeToken = process.env.SANITY_API_WRITE_TOKEN;
    const canCreateDraft = isSanityConfigured && !!writeToken;
    const draftId = `drafts.submission-${submissionId}`;

    const { error: insertError } = await db.from("blog_submissions").insert({
      id: submissionId,
      user_id: auth.user.id,
      email,
      author_name: input.authorName,
      author_bio: input.authorBio || null,
      author_links: Object.keys(authorLinks).length ? authorLinks : null,
      title: input.title,
      category: input.category,
      excerpt: input.excerpt,
      body_markdown: input.bodyMarkdown,
      sanity_draft_id: canCreateDraft ? draftId : null,
    });
    if (insertError) {
      console.error("submission insert failed", insertError);
      return NextResponse.json({ error: "Could not save your submission. Please try again." }, { status: 500 });
    }

    // Create a draft blogPost in Sanity so review happens in the Studio.
    // Soft-optional: the submission is already safely stored above, and the
    // admin email carries the full article as a fallback.
    let sanityDraftId: string | null = null;
    if (canCreateDraft) {
      try {
        const sanity = createSanityClient({ projectId, dataset, apiVersion, token: writeToken, useCdn: false });
        const categoryRef: { _id: string } | null = await sanity.fetch(
          `*[_type == "category" && title == $title][0]{ _id }`,
          { title: input.category },
        );
        await sanity.createIfNotExists({
          _id: draftId,
          _type: "blogPost",
          title: input.title,
          slug: { _type: "slug", current: slugifyHeading(input.title).slice(0, 96) },
          excerpt: input.excerpt,
          body: markdownToPortableText(input.bodyMarkdown),
          ...(categoryRef ? { category: { _type: "reference", _ref: categoryRef._id } } : {}),
          publishedAt: new Date().toISOString(),
          readTime: estimateReadTime(input.bodyMarkdown),
          featured: false,
          isGuestSubmission: true,
          submitterEmail: email,
          submissionId,
          guestAuthorName: input.authorName,
          guestAuthorBio: input.authorBio || undefined,
        });
        sanityDraftId = draftId;
      } catch (err) {
        console.error("sanity draft creation failed (submission still saved)", err);
      }
    }

    // Notifications — best-effort, never block the response on failures.
    const studioUrl = `${siteConfig.url}/studio`;
    const tasks: Promise<unknown>[] = [
      notifySlack(
        `:memo: New guest article submission: *${escapeSlack(input.title)}*\n` +
        `by ${escapeSlack(input.authorName)} (${escapeSlack(email)}) · ${escapeSlack(input.category)}\n` +
        (sanityDraftId ? `Review the draft in the Studio: ${studioUrl}` : `Saved in Supabase (blog_submissions).`),
      ),
    ];
    if (isResendConfigured() && resend) {
      tasks.push(
        resend.emails.send({
          from: FROM_ADDRESS,
          to: NOTIFY_ADDRESS,
          replyTo: email,
          subject: `New guest article submission: ${input.title}`,
          text:
            `Title: ${input.title}\nCategory: ${input.category}\nAuthor: ${input.authorName} (${email})\n` +
            (input.authorBio ? `Bio: ${input.authorBio}\n` : "") +
            `\nExcerpt:\n${input.excerpt}\n\n` +
            (sanityDraftId
              ? `A draft has been created in Sanity Studio — open ${studioUrl}, find it under "Guest Submissions", assign an author, review, and Publish.\n\n`
              : `Sanity draft was not created (SANITY_API_WRITE_TOKEN missing?). The full article is stored in Supabase table blog_submissions, id ${submissionId}.\n\n`) +
            `--- Article body (markdown) ---\n\n${input.bodyMarkdown}`,
        }),
        resend.emails.send({
          from: FROM_ADDRESS,
          to: email,
          replyTo: REPLY_TO,
          subject: "We received your article — PlanMyCashflows Journal",
          text:
            `Hi ${input.authorName},\n\n` +
            `Thanks for submitting "${input.title}" to the PlanMyCashflows Journal.\n\n` +
            `Our editor reviews every submission personally. If it's a fit, we'll edit it together and publish it with your byline. You can track the status anytime at ${siteConfig.url}/blog/contribute.\n\n` +
            `— Col Ashish Bhardwaj\nFounder, PlanMyCashflows`,
        }),
      );
    }
    const results = await Promise.allSettled(tasks);
    for (const r of results) {
      if (r.status === "rejected") console.error("submission notification failed", r.reason);
    }

    return NextResponse.json({ ok: true, id: submissionId });
  } catch (err) {
    console.error("submission error", err);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const auth = await authenticate(req);
    if (!auth) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

    const db = userScopedClient(auth.token);
    if (!db) return NextResponse.json({ submissions: [] });

    const { data: rows, error } = await db
      .from("blog_submissions")
      .select("id, title, category, status, created_at")
      .eq("user_id", auth.user.id)
      .order("created_at", { ascending: false })
      .limit(20);
    if (error || !rows) return NextResponse.json({ submissions: [] });

    // A submission is live once a *published* Sanity post carries its id —
    // publishing in the Studio flips status here with zero bookkeeping.
    const published = new Map<string, string>();
    if (isSanityConfigured && rows.length > 0) {
      try {
        const sanity = createSanityClient({ projectId, dataset, apiVersion, useCdn: false, perspective: "published" });
        const live: { submissionId: string; slug: string }[] = await sanity.fetch(
          `*[_type == "blogPost" && submissionId in $ids]{ submissionId, "slug": slug.current }`,
          { ids: rows.map((r) => r.id) },
        );
        for (const p of live) published.set(p.submissionId, p.slug);
      } catch { /* status stays as stored */ }
    }

    return NextResponse.json({
      submissions: rows.map((r) => ({
        id: r.id,
        title: r.title,
        category: r.category,
        createdAt: r.created_at,
        status: published.has(r.id) ? "published" : r.status,
        liveSlug: published.get(r.id) ?? null,
      })),
    });
  } catch (err) {
    console.error("submissions list error", err);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
