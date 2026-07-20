"use client";

import { useState, type FormEvent } from "react";
import { Check, Loader2 } from "lucide-react";
import { subscribeToBrief, type LeadSource } from "@/app/actions/pms-leads";

/**
 * Email-only signup band for the monthly PMS & AIF brief. Sits at the
 * bottom of the explorer and on every /pms/[slug] strategy page. Inserts
 * into public.subscribers via the subscribeToBrief server action; a
 * duplicate email resolves to the friendly "already on the list" state.
 */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function NewsletterBand({ source }: { source: LeadSource }) {
  const [email, setEmail] = useState("");
  const [website, setWebsite] = useState(""); // honeypot
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState<null | "new" | "already">(null);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    if (!EMAIL_RE.test(email.trim())) { setError("Please enter a valid email address."); return; }
    setError(null);
    setSubmitting(true);
    const res = await subscribeToBrief({ email, source, website });
    setSubmitting(false);
    if (res.ok) setDone(res.already ? "already" : "new");
    else setError(res.error);
  };

  return (
    <div className="rounded-2xl mt-10 p-5 sm:p-6" style={{ background: "var(--ink)" }}>
      <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6">
        <div className="flex-1">
          <div className="font-display" style={{ fontSize: 19, fontWeight: 600, color: "#fff", lineHeight: 1.2 }}>
            Get the monthly PMS &amp; AIF brief
          </div>
          <div className="font-ui" style={{ fontSize: 13, color: "rgba(255,255,255,0.65)", marginTop: 4 }}>
            Concise, alpha-ranked, no spam.
          </div>
        </div>

        {done ? (
          <div className="font-ui inline-flex items-center gap-2 rounded-xl px-4 py-3" style={{ fontSize: 13.5, fontWeight: 500, color: "#fff", background: "rgba(255,255,255,0.12)" }}>
            <Check size={16} color="var(--green-tint)" />
            {done === "already" ? "You're already on the list." : "Subscribed — see you in the next brief."}
          </div>
        ) : (
          <form onSubmit={submit} className="flex flex-col sm:flex-row gap-2 sm:w-auto w-full" noValidate>
            <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" required
              placeholder="you@example.com" autoComplete="email" aria-label="Email address"
              className="font-ui rounded-xl px-3.5 py-2.5 outline-none flex-1 sm:w-64"
              style={{ fontSize: 14, background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.2)", color: "#fff" }} />
            {/* Honeypot — visually removed, still in the DOM for bots to fill. */}
            <div aria-hidden="true" style={{ position: "absolute", left: -10000, top: 0, height: 0, width: 0, overflow: "hidden" }}>
              <input value={website} onChange={(e) => setWebsite(e.target.value)} name="website" tabIndex={-1} autoComplete="off" />
            </div>
            <button type="submit" disabled={submitting}
              className="font-ui rounded-xl px-5 py-2.5 inline-flex items-center justify-center gap-2 shrink-0"
              style={{ fontSize: 13.5, fontWeight: 600, color: "var(--ink)", background: "#fff", opacity: submitting ? 0.7 : 1 }}>
              {submitting && <Loader2 size={14} className="animate-spin" />}
              {submitting ? "Subscribing…" : "Subscribe"}
            </button>
          </form>
        )}
      </div>
      {error && <p className="font-ui mt-2" style={{ fontSize: 12.5, color: "#F5B7AE", margin: 0, marginTop: 8 }}>{error}</p>}
    </div>
  );
}
