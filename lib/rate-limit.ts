import type { NextRequest } from "next/server";
import { getServerSupabase } from "@/lib/supabase-server";

/**
 * Supabase-backed sliding-window rate limiter (replaces Upstash).
 * Calls public.check_rate_limit() — see
 * supabase/migrations/20261121000000_forms_leads_rate_limit.sql.
 * The raw key (IP) is hashed inside the database, never stored.
 *
 * Fails OPEN: if Supabase is unreachable or the function is missing, the
 * request is allowed, so a limiter outage can never block a lead.
 */

export interface RateLimitResult {
  success: boolean;
  /** Seconds until the caller may retry (0 when allowed). */
  retryAfter: number;
}

export async function checkRateLimit(
  bucket: string,
  key: string,
  limit: number,
  windowSeconds: number,
): Promise<RateLimitResult> {
  try {
    const supabase = getServerSupabase();
    if (!supabase) return { success: true, retryAfter: 0 };
    const { data, error } = await supabase.rpc("check_rate_limit", {
      p_bucket: bucket,
      p_key: key,
      p_limit: limit,
      p_window_seconds: windowSeconds,
    });
    if (error || !Array.isArray(data) || !data[0]) {
      console.error("rate limit check failed (allowing)", error);
      return { success: true, retryAfter: 0 };
    }
    return { success: !!data[0].allowed, retryAfter: Number(data[0].retry_after) || 0 };
  } catch (err) {
    console.error("rate limit threw (allowing)", err);
    return { success: true, retryAfter: 0 };
  }
}

/** Shared limit for unauthenticated lead forms: 10 / IP / hour. */
export const checkFormRateLimit = (bucket: string, ip: string) =>
  checkRateLimit(bucket, ip, 10, 3600);

/** Best-effort client IP extraction from common proxy headers. */
export function getClientIp(req: NextRequest): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}
