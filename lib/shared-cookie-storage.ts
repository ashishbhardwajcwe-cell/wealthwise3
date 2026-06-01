/**
 * Cross-subdomain auth storage.
 *
 * Supabase stores its session under a key like `sb-{project-ref}-auth-token`.
 * By default it uses `localStorage`, which is scoped per-origin — so a session
 * on auriswealth.co is invisible to app.auriswealth.co.
 *
 * This adapter writes to a cookie scoped to `.auriswealth.co` (note the
 * leading dot). The browser automatically includes the cookie on requests
 * to ANY subdomain of auriswealth.co, so both the marketing site and the
 * WealthWise app see the same session.
 *
 * On localhost (and any host that isn't *.auriswealth.co), we fall back to
 * a per-origin cookie with no Domain attribute, so local development still
 * works without breaking session isolation between local projects.
 *
 * IMPORTANT: cookies have a 4KB size limit. The Supabase session JWT +
 * refresh token + user object is typically 1.5–3 KB. If you pile a lot
 * into user_metadata, you may exceed the limit. Watch for this if you
 * start storing large objects on the user.
 */

/** Returns "auriswealth.co" for any *.auriswealth.co host, else undefined. */
function getSharedCookieDomain(): string | undefined {
  if (typeof window === "undefined") return undefined;
  const host = window.location.hostname;
  if (!host || host === "localhost" || host === "127.0.0.1") return undefined;
  if (host === "auriswealth.co" || host.endsWith(".auriswealth.co")) {
    return "auriswealth.co"; // browser treats this as ".auriswealth.co" — shared
  }
  return undefined;
}

export const sharedCookieStorage = {
  getItem(key: string): string | null {
    if (typeof document === "undefined") return null;
    const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${escaped}=([^;]*)`));
    return match ? decodeURIComponent(match[1]) : null;
  },

  setItem(key: string, value: string): void {
    if (typeof document === "undefined") return;
    const domain = getSharedCookieDomain();
    const isHttps = typeof window !== "undefined" && window.location.protocol === "https:";
    const parts = [
      `${key}=${encodeURIComponent(value)}`,
      "Path=/",
      `Max-Age=${60 * 60 * 24 * 365}`, // 1 year
      "SameSite=Lax",
    ];
    if (isHttps) parts.push("Secure");
    if (domain) parts.push(`Domain=${domain}`);
    document.cookie = parts.join("; ");
  },

  removeItem(key: string): void {
    if (typeof document === "undefined") return;
    const domain = getSharedCookieDomain();
    const parts = [
      `${key}=`,
      "Path=/",
      "Max-Age=0",
    ];
    if (domain) parts.push(`Domain=${domain}`);
    document.cookie = parts.join("; ");
  },
};
