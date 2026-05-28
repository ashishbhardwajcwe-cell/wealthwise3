"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { X, Cookie } from "lucide-react";

type ConsentState = "accepted" | "rejected" | "pending";

const STORAGE_KEY = "auris.consent";
const CONSENT_EVENT = "auris-consent-change";

export function getStoredConsent(): ConsentState {
  if (typeof window === "undefined") return "pending";
  const v = window.localStorage.getItem(STORAGE_KEY);
  return v === "accepted" || v === "rejected" ? v : "pending";
}

export function setStoredConsent(state: "accepted" | "rejected") {
  window.localStorage.setItem(STORAGE_KEY, state);
  window.dispatchEvent(new CustomEvent(CONSENT_EVENT, { detail: state }));
}

export function useConsent(): ConsentState {
  const [state, setState] = useState<ConsentState>("pending");
  useEffect(() => {
    setState(getStoredConsent());
    const handler = () => setState(getStoredConsent());
    window.addEventListener(CONSENT_EVENT, handler);
    return () => window.removeEventListener(CONSENT_EVENT, handler);
  }, []);
  return state;
}

export function ConsentBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (getStoredConsent() === "pending") setVisible(true);
  }, []);

  if (!visible) return null;

  function accept() {
    setStoredConsent("accepted");
    setVisible(false);
  }

  function reject() {
    setStoredConsent("rejected");
    setVisible(false);
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 md:bottom-6 md:left-6 md:right-auto md:max-w-md z-50">
      <div className="bg-white border border-[var(--color-silver)]/50 rounded-2xl shadow-xl p-5">
        <div className="flex items-start gap-3 mb-3">
          <Cookie className="w-5 h-5 text-[var(--color-gold-dim)] flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="font-semibold text-[var(--color-navy)] text-sm">Cookies & analytics</h3>
            <p className="text-xs text-[var(--color-slate)] leading-relaxed mt-1.5">
              We use cookies for analytics to improve the site. We never sell your data or use it for ads. Per India&apos;s DPDP Act 2023, we ask before turning analytics on.{" "}
              <Link href="/legal/privacy" className="text-[var(--color-gold-dim)] underline">
                Privacy
              </Link>
            </p>
          </div>
          <button
            onClick={reject}
            className="text-[var(--color-slate)] hover:text-[var(--color-navy)]"
            aria-label="Reject and close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="flex gap-2 mt-4">
          <button
            onClick={accept}
            className="flex-1 px-3 py-2 bg-[var(--color-navy)] text-[var(--color-cream)] text-sm font-semibold rounded-lg hover:bg-[var(--color-midnight)]"
          >
            Accept analytics
          </button>
          <button
            onClick={reject}
            className="flex-1 px-3 py-2 bg-white text-[var(--color-navy)] text-sm font-semibold rounded-lg border border-[var(--color-silver)]/50 hover:border-[var(--color-gold)]"
          >
            Reject
          </button>
        </div>
      </div>
    </div>
  );
}
