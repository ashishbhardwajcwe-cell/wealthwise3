"use client";

import { useState } from "react";
import { Check, Loader2, Mail } from "lucide-react";

/**
 * Homepage newsletter capture — same /api/newsletter endpoint as the
 * footer form, but light-themed and with an explicit consent checkbox.
 */
export function HomeNewsletter() {
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.includes("@") || !consent) return;
    setState("loading");
    try {
      const res = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, source: "home-pms-aif" }),
      });
      if (!res.ok) throw new Error();
      setState("done");
    } catch {
      setState("error");
    }
  }

  if (state === "done") {
    return (
      <div className="flex items-center justify-center gap-2 text-sm font-semibold text-[var(--color-gold-dim)] py-4">
        <Check className="w-4 h-4" /> Thanks — check your inbox.
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-md mx-auto">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-slate)]" aria-hidden />
          <input
            type="email"
            required
            disabled={state === "loading"}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter your email address"
            aria-label="Email address"
            className="w-full pl-9 pr-3 py-2.5 bg-white border border-[var(--color-silver)]/60 rounded-lg text-sm focus:outline-none focus:border-[var(--color-gold)] disabled:opacity-60"
          />
        </div>
        <button
          type="submit"
          disabled={state === "loading" || !consent}
          className="btn-primary text-sm py-2.5 px-5 disabled:opacity-50"
        >
          {state === "loading" ? <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden /> : null}
          Subscribe
        </button>
      </div>
      <label className="flex items-start gap-2 mt-3 text-xs text-[var(--color-slate)] cursor-pointer text-left">
        <input
          type="checkbox"
          required
          checked={consent}
          onChange={(e) => setConsent(e.target.checked)}
          className="mt-0.5 accent-[var(--color-gold-dim)]"
        />
        <span>
          I confirm this is my email and consent to receive educational newsletters and updates from PlanMyCashflows.
        </span>
      </label>
      {state === "error" && (
        <p className="text-xs text-[var(--color-ruby)] mt-2">Could not subscribe. Please try again later.</p>
      )}
    </form>
  );
}
