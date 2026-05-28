"use client";

import { useState } from "react";
import { Mail, Check, Loader2 } from "lucide-react";

export function NewsletterSignup({ source = "footer" }: { source?: string }) {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.includes("@")) return;
    setState("loading");
    try {
      const res = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, source }),
      });
      if (!res.ok) throw new Error();
      setState("done");
    } catch {
      setState("error");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-sm">
      <label className="text-xs uppercase tracking-wider text-[var(--color-gold-light)] font-semibold">
        Get our weekly note
      </label>
      <div className="mt-2 flex items-center gap-2">
        {state === "done" ? (
          <div className="flex items-center gap-2 text-sm text-[var(--color-gold-light)]">
            <Check className="w-4 h-4" /> Thanks — check your inbox.
          </div>
        ) : (
          <>
            <div className="relative flex-1">
              <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-white/60" />
              <input
                type="email"
                required
                disabled={state === "loading"}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full pl-9 pr-3 py-2.5 bg-white/10 border border-white/20 rounded-lg text-sm text-white placeholder:text-white/40 focus:outline-none focus:border-[var(--color-gold)] disabled:opacity-60"
              />
            </div>
            <button
              type="submit"
              disabled={state === "loading"}
              className="px-4 py-2.5 bg-[var(--color-gold)] text-[var(--color-navy)] text-sm font-semibold rounded-lg hover:bg-[var(--color-gold-light)] transition-colors disabled:opacity-60 inline-flex items-center gap-1.5"
            >
              {state === "loading" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
              Subscribe
            </button>
          </>
        )}
      </div>
      {state === "error" && (
        <p className="text-xs text-[var(--color-ruby)] mt-2">Could not subscribe. Please try again later.</p>
      )}
    </form>
  );
}
