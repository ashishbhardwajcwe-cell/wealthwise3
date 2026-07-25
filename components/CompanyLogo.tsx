"use client";

import { useState, type CSSProperties } from "react";

/**
 * Company / manager avatar: renders a real logo when one is available, and
 * falls back to a two-letter monogram otherwise (or if the image fails to
 * load). One component for both the unlisted-shares cards/list (logos cropped
 * from the partner list by scripts/extract-unlisted-logos.mjs) and the PMS
 * explorer (manager logos seeded by scripts/import-pms-logos.mjs).
 *
 * The two states are styled independently by the caller — the logo sits on a
 * light padded tile so brand marks read cleanly, while the monogram keeps each
 * surface's own accent colours — so pass class/style for whichever states you
 * use. Callers are already client components, so the onError fallback works.
 */

/** Two-letter monogram from a name ("A One Steel" → "AO", "Enam Asset" → "EA"). */
export function monogram(name: string): string {
  const words = String(name ?? "").replace(/[^a-zA-Z0-9 ]/g, " ").split(/\s+/).filter(Boolean);
  return (words.map((w) => w[0]).join("").slice(0, 2) || "•").toUpperCase();
}

export function CompanyLogo({
  name,
  logoUrl,
  alt,
  logoClassName,
  logoStyle,
  monogramClassName,
  monogramStyle,
}: {
  name: string;
  logoUrl?: string | null;
  alt?: string;
  logoClassName?: string;
  logoStyle?: CSSProperties;
  monogramClassName?: string;
  monogramStyle?: CSSProperties;
}) {
  // Track WHICH url failed, not just that one did. React reuses this instance
  // when the parent re-renders with a different company at the same key, and a
  // plain boolean would keep suppressing the new (perfectly good) logo.
  const [failedUrl, setFailedUrl] = useState<string | null>(null);

  if (logoUrl && failedUrl !== logoUrl) {
    return (
      <div className={logoClassName} style={logoStyle}>
        {/* Plain <img>: the src is already a resolved Sanity CDN URL, so we
            skip next/image remote-host config. Contain-fit keeps whole logos. */}
        <img
          src={logoUrl}
          alt={alt ?? `${name} logo`}
          loading="lazy"
          style={{ height: "100%", width: "100%", objectFit: "contain" }}
          onError={() => setFailedUrl(logoUrl)}
        />
      </div>
    );
  }

  return (
    <div className={monogramClassName} style={monogramStyle}>
      {monogram(name)}
    </div>
  );
}
