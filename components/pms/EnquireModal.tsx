"use client";

import { useState, type CSSProperties, type FormEvent } from "react";
import { X, Check, Loader2 } from "lucide-react";
import { submitPmsLead, type LeadSource } from "@/app/actions/pms-leads";

/**
 * Enquiry modal for one PMS strategy. Opened from the explorer cards, the
 * brief sheet (z-[60]: it must sit above the sheet's z-50 overlay) and the
 * strategy pages. Submits through the submitPmsLead server action so no
 * Supabase credential ships in this flow's client bundle.
 */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const inputStyle: CSSProperties = {
  fontSize: 14,
  border: "1px solid var(--line)",
  color: "var(--ink)",
  background: "#fff",
};

export function EnquireModal({ strategy, source, onClose }: {
  strategy: string;
  source: LeadSource;
  onClose: () => void;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [website, setWebsite] = useState(""); // honeypot
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    if (name.trim().length < 2) { setError("Please enter your name."); return; }
    if (!EMAIL_RE.test(email.trim())) { setError("Please enter a valid email address."); return; }
    setError(null);
    setSubmitting(true);
    const res = await submitPmsLead({ name, email, phone, strategy, source, website });
    setSubmitting(false);
    if (res.ok) setDone(true);
    else setError(res.error);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" style={{ background: "rgba(15,26,20,0.5)" }} onClick={onClose}>
      <div className="w-full max-w-sm rounded-2xl bg-white" onClick={(e) => e.stopPropagation()}>
        <div className="px-5 py-4 flex items-start justify-between" style={{ borderBottom: "1px solid var(--line)" }}>
          <div>
            <h2 className="font-display" style={{ fontSize: 20, fontWeight: 600, color: "var(--ink)", lineHeight: 1.15 }}>Enquire</h2>
            <span className="font-ui inline-block rounded-full px-2.5 py-0.5 mt-1.5" style={{ fontSize: 12, fontWeight: 500, color: "var(--green-deep)", background: "var(--green-tint)" }}>
              {strategy}
            </span>
          </div>
          <button onClick={onClose} aria-label="Close" className="rounded-lg p-1.5 shrink-0" style={{ background: "var(--flat-bg)" }}><X size={18} color="var(--ink)" /></button>
        </div>

        {done ? (
          <div className="p-5 text-center">
            <div className="mx-auto flex items-center justify-center rounded-full" style={{ width: 44, height: 44, background: "var(--green-tint)" }}>
              <Check size={22} color="var(--green-deep)" />
            </div>
            <p className="font-ui mt-3" style={{ fontSize: 14.5, fontWeight: 500, color: "var(--ink)", lineHeight: 1.5 }}>
              Thanks — we&apos;ll reach out within one working day.
            </p>
            <button onClick={onClose} className="font-ui mt-4 rounded-xl px-5 py-2.5" style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)", background: "var(--flat-bg)" }}>
              Close
            </button>
          </div>
        ) : (
          <form onSubmit={submit} className="p-5 flex flex-col gap-3" noValidate>
            <label className="font-ui flex flex-col gap-1" style={{ fontSize: 12, color: "var(--muted)" }}>
              Name
              <input value={name} onChange={(e) => setName(e.target.value)} required autoComplete="name"
                className="font-ui rounded-xl px-3 py-2.5 outline-none" style={inputStyle} />
            </label>
            <label className="font-ui flex flex-col gap-1" style={{ fontSize: 12, color: "var(--muted)" }}>
              Email
              <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" required autoComplete="email"
                className="font-ui rounded-xl px-3 py-2.5 outline-none" style={inputStyle} />
            </label>
            <label className="font-ui flex flex-col gap-1" style={{ fontSize: 12, color: "var(--muted)" }}>
              Phone <span style={{ color: "var(--flat)" }}>(optional)</span>
              <input value={phone} onChange={(e) => setPhone(e.target.value)} type="tel" autoComplete="tel"
                className="font-ui rounded-xl px-3 py-2.5 outline-none" style={inputStyle} />
            </label>

            {/* Honeypot — visually removed, still in the DOM for bots to fill. */}
            <div aria-hidden="true" style={{ position: "absolute", left: -10000, top: 0, height: 0, width: 0, overflow: "hidden" }}>
              <label>
                Website
                <input value={website} onChange={(e) => setWebsite(e.target.value)} name="website" tabIndex={-1} autoComplete="off" />
              </label>
            </div>

            {error && <p className="font-ui" style={{ fontSize: 12.5, color: "var(--neg)", margin: 0 }}>{error}</p>}

            <button type="submit" disabled={submitting}
              className="font-ui w-full rounded-xl py-3 inline-flex items-center justify-center gap-2"
              style={{ fontSize: 14, fontWeight: 600, color: "#fff", background: "var(--green)", opacity: submitting ? 0.7 : 1 }}>
              {submitting && <Loader2 size={15} className="animate-spin" />}
              {submitting ? "Sending…" : "Send enquiry"}
            </button>
            <p className="font-ui text-center" style={{ fontSize: 11, color: "var(--muted)", margin: 0 }}>
              No spam, no obligation — one of us will get in touch.
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
