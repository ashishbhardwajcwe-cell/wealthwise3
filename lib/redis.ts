import { Redis } from "@upstash/redis";
import { Ratelimit } from "@upstash/ratelimit";

const url = process.env.UPSTASH_REDIS_REST_URL;
const token = process.env.UPSTASH_REDIS_REST_TOKEN;

export const redis = url && token ? new Redis({ url, token }) : null;

export const snapshotRateLimit = redis
  ? new Ratelimit({
      redis,
      // 3 snapshots per IP per hour, sliding window
      limiter: Ratelimit.slidingWindow(3, "1 h"),
      analytics: true,
      prefix: "auris:snapshot",
    })
  : null;

export function isRedisConfigured(): boolean {
  return !!(url && token);
}

/** Stable hash of an input object, used as a cache key. */
export async function inputHash(obj: unknown): Promise<string> {
  const canonical = JSON.stringify(obj, Object.keys(obj as object).sort());
  const buf = new TextEncoder().encode(canonical);
  const digest = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .slice(0, 32);
}
