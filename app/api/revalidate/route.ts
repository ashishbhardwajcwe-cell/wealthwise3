import { revalidateTag } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { parseBody } from "next-sanity/webhook";
import { revalidateSecret } from "@/sanity/env";

export const runtime = "nodejs";

/**
 * Sanity webhook handler.
 *
 * Set this up in Sanity:
 *   manage.sanity.io → your project → API → Webhooks → Create webhook
 *
 *   URL:          https://planmycashflows.com/api/revalidate
 *   Dataset:      production
 *   Trigger on:   Create, Update, Delete
 *   Filter:       _type in ["blogPost","stockAnalysis","pmsStrategy",
 *                            "aifFund","unlistedShare","author","category"]
 *   Secret:       (paste the same value into Netlify env var SANITY_REVALIDATE_SECRET)
 *   HTTP method:  POST
 *
 * When content is published, this route revalidates the affected cache tags
 * and the matching page(s) refresh within seconds.
 */
export async function POST(req: NextRequest) {
  try {
    const { isValidSignature, body } = await parseBody<{
      _type: string;
      slug?: { current?: string };
    }>(req, revalidateSecret);

    if (!isValidSignature) {
      return NextResponse.json({ message: "Invalid signature" }, { status: 401 });
    }
    if (!body?._type) {
      return NextResponse.json({ message: "Bad payload" }, { status: 400 });
    }

    // Always revalidate the broad type tag.
    const tags = [body._type];

    // Revalidate slug-scoped tag when present.
    const slug = body.slug?.current;
    if (slug) tags.push(`${body._type}:${slug}`);

    // Convenience aliases.
    if (body._type === "blogPost") tags.push("blog");

    for (const tag of tags) revalidateTag(tag);

    // Report exactly what was revalidated — this previously always claimed
    // "blog" regardless of the document type.
    return NextResponse.json({ ok: true, revalidated: tags, now: Date.now() });
  } catch (err) {
    // parseBody can throw before the signature is verified, so the details
    // stay server-side rather than going back to an unauthenticated caller.
    console.error("Revalidate webhook error:", err);
    return NextResponse.json({ ok: false, error: "Revalidation failed" }, { status: 500 });
  }
}
