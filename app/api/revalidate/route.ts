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
    revalidateTag(body._type);

    // Revalidate slug-scoped tag when present.
    const slug = body.slug?.current;
    if (slug) revalidateTag(`${body._type}:${slug}`);

    // Convenience aliases.
    if (body._type === "blogPost") revalidateTag("blog");

    return NextResponse.json({
      ok: true,
      revalidated: [body._type, ...(slug ? [`${body._type}:${slug}`] : []), "blog"],
      now: Date.now(),
    });
  } catch (err) {
    console.error("Revalidate webhook error:", err);
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
