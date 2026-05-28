"use client";

import { useState } from "react";
import { Mail, Check } from "lucide-react";

export function NewsletterSignup() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (email.includes("@")) setSubmitted(true);
      }}
      className="w-full max-w-sm"
    >
      <label className="text-xs uppercase tracking-wider text-[var(--color-gold-light)] font-semibold">
        Get our weekly note
      </label>
      <div className="mt-2 flex items-center gap-2">
        {!submitted ? (
          <>
            <div className="relative flex-1">
              <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-white/60" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full pl-9 pr-3 py-2.5 bg-white/10 border border-white/20 rounded-lg text-sm text-white placeholder:text-white/40 focus:outline-none focus:border-[var(--color-gold)]"
              />
            </div>
            <button
              type="submit"
              className="px-4 py-2.5 bg-[var(--color-gold)] text-[var(--color-navy)] text-sm font-semibold rounded-lg hover:bg-[var(--color-gold-light)] transition-colors"
            >
              Subscribe
            </button>
          </>
        ) : (
          <div className="flex items-center gap-2 text-sm text-[var(--color-gold-light)]">
            <Check className="w-4 h-4" /> Thanks — check your inbox.
          </div>
        )}
      </div>
    </form>
  );
}
