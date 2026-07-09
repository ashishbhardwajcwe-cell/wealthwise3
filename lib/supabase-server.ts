import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Server-side Supabase client using the public anon key — used by server
 * components / route handlers for reads that RLS already allows publicly
 * (like/comment counts for SEO structured data). No session, no cookies.
 */

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

let _client: SupabaseClient | null = null;

export function getServerSupabase(): SupabaseClient | null {
  if (!url || !anonKey) return null;
  if (!_client) {
    _client = createClient(url, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return _client;
}

export interface EngagementCounts {
  likes: number;
  comments: number;
}

/** Public like/comment counts for a post. Zeroes when Supabase is absent. */
export async function getEngagementCounts(postSlug: string): Promise<EngagementCounts> {
  const supabase = getServerSupabase();
  if (!supabase) return { likes: 0, comments: 0 };
  try {
    const [likes, comments] = await Promise.all([
      supabase.from("blog_likes").select("*", { count: "exact", head: true }).eq("post_slug", postSlug),
      supabase
        .from("blog_comments")
        .select("*", { count: "exact", head: true })
        .eq("post_slug", postSlug)
        .eq("status", "visible"),
    ]);
    return { likes: likes.count ?? 0, comments: comments.count ?? 0 };
  } catch {
    return { likes: 0, comments: 0 };
  }
}
