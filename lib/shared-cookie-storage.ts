/**
 * Cross-subdomain auth storage.
 *
 * Supabase stores its session under a key like `sb-{project-ref}-auth-token`.
 * By default it uses `localStorage`, which is scoped per-origin — so a session
 * on auriscashflow.com is invisible to app.auriscashflow.com.
 *
 * This adapter writes to a cookie scoped to `.auriscashflow.com` (note the
 * leading dot). The browser automatically includes the cookie on requests
 * to ANY subdomain of auriscashflow.com, so both the marketing site and the
 * WealthWise app see the same session.
 *
 * On localhost (and any host that isn't *.auriscashflow.com), we fall back to
 * a per-origin cookie with no Domain attribute, so local development still
 * works without breaking session isolation between local projects.
 *
 * CHUNKING: browsers silently drop cookies over ~4KB. Google OAuth sessions
 * (JWT + provider token + profile) routinely exceed that, while smaller
 * email/password sessions fit — which made Google sign-in appear broken
 * while email worked. Values are therefore split into <=3180-byte chunks
 * stored as `key.0`, `key.1`, ... (same convention as @supabase/ssr).
 * The WealthWise app repo (wealthwise2) uses the identical scheme, so the
 * two sites can read each other's cookies — keep them in sync.
 */

const COOKIE_CHUNK_SIZE = 3180;

/** Returns "auriscashflow.com" for any *.auriscashflow.com host, else undefined. */
function getSharedCookieDomain(): string | undefined {
  if (typeof window === "undefined") return undefined;
  const host = window.location.hostname;
  if (!host || host === "localhost" || host === "127.0.0.1") return undefined;
  if (host === "auriscashflow.com" || host.endsWith(".auriscashflow.com")) {
    return "auriscashflow.com"; // browser treats this as ".auriscashflow.com" — shared
  }
  return undefined;
}

function readRawCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${escaped}=([^;]*)`));
  return match ? match[1] : null;
}

function writeRawCookie(name: string, value: string, maxAge: number): void {
  if (typeof document === "undefined") return;
  const domain = getSharedCookieDomain();
  const isHttps = typeof window !== "undefined" && window.location.protocol === "https:";
  const parts = [`${name}=${value}`, "Path=/", `Max-Age=${maxAge}`, "SameSite=Lax"];
  if (isHttps) parts.push("Secure");
  if (domain) parts.push(`Domain=${domain}`);
  document.cookie = parts.join("; ");
}

export const sharedCookieStorage = {
  getItem(key: string): string | null {
    const single = readRawCookie(key);
    if (single !== null) return decodeURIComponent(single);
    let joined = "";
    for (let i = 0; ; i++) {
      const part = readRawCookie(`${key}.${i}`);
      if (part === null) return i > 0 ? decodeURIComponent(joined) : null;
      joined += part;
    }
  },

  setItem(key: string, value: string): void {
    if (typeof document === "undefined") return;
    this.removeItem(key); // clear any stale single/chunked cookies first
    const encoded = encodeURIComponent(value);
    const yearSecs = 60 * 60 * 24 * 365;
    if (encoded.length <= COOKIE_CHUNK_SIZE) {
      writeRawCookie(key, encoded, yearSecs);
      return;
    }
    for (let i = 0; i * COOKIE_CHUNK_SIZE < encoded.length; i++) {
      writeRawCookie(
        `${key}.${i}`,
        encoded.slice(i * COOKIE_CHUNK_SIZE, (i + 1) * COOKIE_CHUNK_SIZE),
        yearSecs,
      );
    }
  },

  removeItem(key: string): void {
    if (typeof document === "undefined") return;
    writeRawCookie(key, "", 0);
    for (let i = 0; readRawCookie(`${key}.${i}`) !== null; i++) {
      writeRawCookie(`${key}.${i}`, "", 0);
    }
  },
};
