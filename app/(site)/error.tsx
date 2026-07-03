"use client";

import { useEffect } from "react";
import Link from "next/link";
import { RefreshCcw } from "lucide-react";

/**
 * Branded error boundary for the site segment. Without this, a runtime
 * error in any page renders Next's unstyled default screen.
 */
export default function SiteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Page error:", error);
  }, [error]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center py-24">
      <div className="container-narrow text-center max-w-xl">
        <span className="eyebrow">Something went wrong</span>
        <h1 className="mt-3" style={{ fontSize: "clamp(1.75rem, 4vw, 2.75rem)" }}>
          This page hit turbulence.
        </h1>
        <p className="mt-4 text-[var(--color-slate)] leading-relaxed">
          An unexpected error occurred while rendering this page. It has been
          logged — trying again usually resolves it.
          {error.digest && (
            <span className="block mt-2 text-xs font-mono text-[var(--color-slate)]/70">
              Reference: {error.digest}
            </span>
          )}
        </p>
        <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
          <button onClick={reset} className="btn-primary text-sm">
            <RefreshCcw className="w-4 h-4" /> Try again
          </button>
          <Link href="/" className="btn-outline text-sm">
            Back to home
          </Link>
        </div>
      </div>
    </div>
  );
}
