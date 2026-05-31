"use client";

import { useState } from "react";
import Image from "next/image";
import { Loader2, Check, X } from "lucide-react";
import { useAuth } from "./AuthProvider";

type Mode = "register" | "signin";

export function LoginModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { signInWithGoogle, signInWithEmail, signUpWithEmail } = useAuth();
  const [mode, setMode] = useState<Mode>("register");
  const [name, setName] = useState("");
  const [mobile, setMobile] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState<"google" | "email" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmSent, setConfirmSent] = useState(false);

  if (!open) return null;

  function reset() {
    setError(null);
    setConfirmSent(false);
  }

  async function handleGoogle() {
    setError(null);
    setLoading("google");
    try {
      await signInWithGoogle();
      // Browser redirects to Google; nothing to clean up.
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not start Google sign-in");
      setLoading(null);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (mode === "register") {
      if (!name.trim()) return setError("Full name is required");
      if (!email.trim()) return setError("Email is required");
      if (password.length < 6) return setError("Password must be at least 6 characters");
    } else {
      if (!email.trim() || !password) return setError("Email and password required");
    }

    setLoading("email");
    try {
      if (mode === "register") {
        const { error, needsConfirmation } = await signUpWithEmail(email, password, {
          full_name: name.trim(),
          phone: mobile.trim() || undefined,
        });
        if (error) { setError(error); return; }
        if (needsConfirmation) { setConfirmSent(true); return; }
        onClose();
      } else {
        const { error } = await signInWithEmail(email, password);
        if (error) { setError(error); return; }
        onClose();
      }
    } finally {
      setLoading(null);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center pt-12 md:pt-16 px-4 overflow-y-auto auris-login-fadein"
      style={{ background: "rgba(5,12,25,0.7)", backdropFilter: "blur(8px)" }}
    >
      <div
        className="relative auris-login-scalein w-full max-w-[380px] mb-12"
        style={{
          background: "#0D1B2E",
          borderRadius: 18,
          padding: "22px 24px",
          boxShadow: "0 24px 60px rgba(0,0,0,0.5)",
          border: "1px solid rgba(255,255,255,0.07)",
        }}
      >
        {/* Close */}
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute top-3 right-3 w-7 h-7 rounded-lg flex items-center justify-center hover:bg-white/15 transition-colors"
          style={{ background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.7)" }}
        >
          <X className="w-3.5 h-3.5" />
        </button>

        {/* Brand */}
        <div className="flex items-center justify-center gap-2.5 mb-3">
          <Image src="/auris-logo.png" alt="Auris Wealth" width={36} height={36} className="rounded-md" />
          <span className="text-xl font-semibold text-white" style={{ fontFamily: "var(--font-display)" }}>
            Auris<span style={{ color: "var(--color-gold)" }}>Wealth</span>
          </span>
        </div>

        {confirmSent ? (
          <div className="text-center py-6">
            <div className="w-12 h-12 rounded-full mx-auto mb-4 flex items-center justify-center" style={{ background: "rgba(16,185,129,0.18)" }}>
              <Check className="w-6 h-6 text-[var(--color-emerald)]" />
            </div>
            <h2 className="text-white text-lg font-semibold mb-2">Check your email</h2>
            <p className="text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.55)" }}>
              We sent a confirmation link to <strong className="text-white">{email}</strong>.
              Click it to activate your account, then come back to sign in.
            </p>
            <button
              onClick={() => { reset(); onClose(); }}
              className="mt-5 w-full py-2.5 rounded-xl text-sm font-semibold text-white"
              style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)" }}
            >
              Done
            </button>
          </div>
        ) : (
          <>
            {/* Title */}
            <div className="text-center mb-4">
              <h2 className="text-white text-xl font-semibold mb-1" style={{ fontFamily: "var(--font-display)" }}>
                {mode === "register" ? "Create your account" : "Welcome back"}
              </h2>
              <p className="text-xs" style={{ color: "rgba(255,255,255,0.55)" }}>
                {mode === "register"
                  ? "Sign up to save & access your financial plan"
                  : "Sign in to continue to AurisWealth"}
              </p>
            </div>

            {/* Fields */}
            <form onSubmit={handleSubmit}>
              <div className="flex flex-col gap-2.5">
                {mode === "register" && (
                  <>
                    <Field label="Full Name">
                      <DarkInput value={name} onChange={setName} placeholder="Rajesh Kumar" />
                    </Field>
                    <Field label="Mobile Number">
                      <DarkInput value={mobile} onChange={setMobile} placeholder="+91 98765 43210" type="tel" />
                    </Field>
                  </>
                )}
                <Field label="Email Address">
                  <DarkInput value={email} onChange={setEmail} placeholder="you@example.com" type="email" />
                </Field>
                <Field label="Password">
                  <DarkInput value={password} onChange={setPassword} placeholder="Min. 6 characters" type="password" />
                </Field>
              </div>

              {error && (
                <p className="text-xs text-center mt-2" style={{ color: "#ff6b6b" }}>{error}</p>
              )}

              {/* Primary CTA — gold gradient */}
              <button
                type="submit"
                disabled={loading !== null}
                className="w-full mt-3.5 py-3 rounded-xl text-[15px] font-bold transition-all disabled:opacity-70 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
                style={{
                  background: "linear-gradient(135deg, var(--color-gold), var(--color-gold-light))",
                  color: "var(--color-navy)",
                  boxShadow: "0 4px 14px rgba(201, 168, 76, 0.3)",
                }}
              >
                {loading === "email" ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : null}
                {mode === "register" ? "Create Account" : "Sign In"}
              </button>
            </form>

            {/* Divider */}
            <div className="flex items-center gap-2.5 my-3">
              <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.1)" }} />
              <span className="text-[11px] font-medium" style={{ color: "rgba(255,255,255,0.35)" }}>or</span>
              <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.1)" }} />
            </div>

            {/* Google */}
            <button
              onClick={handleGoogle}
              disabled={loading !== null}
              className="w-full py-2.5 rounded-xl text-sm font-semibold text-white transition-colors disabled:opacity-70 inline-flex items-center justify-center gap-2.5"
              style={{
                background: "rgba(255,255,255,0.05)",
                border: "1.5px solid rgba(255,255,255,0.12)",
              }}
            >
              {loading === "google" ? <Loader2 className="w-4 h-4 animate-spin" /> : <GoogleIcon />}
              Continue with Google
            </button>

            {/* Continue without account — replaces wealthwise2's "Try Demo" since
                the marketing site is open by design */}
            <button
              onClick={onClose}
              className="w-full mt-2 py-2 rounded-xl text-xs font-semibold transition-colors hover:bg-white/5"
              style={{
                background: "transparent",
                border: "1px solid rgba(201, 168, 76, 0.25)",
                color: "rgba(228, 204, 122, 0.75)",
              }}
            >
              👀 Continue browsing — sign in later
            </button>

            {/* Toggle */}
            <p className="text-center mt-3.5 text-xs" style={{ color: "rgba(255,255,255,0.45)" }}>
              {mode === "register" ? "Already have an account? " : "Don't have an account? "}
              <button
                onClick={() => { setMode(mode === "register" ? "signin" : "register"); reset(); }}
                className="font-semibold hover:underline"
                style={{ color: "var(--color-gold-light)" }}
              >
                {mode === "register" ? "Sign In" : "Create Account"}
              </button>
            </p>

            <p className="text-center text-[10px] mt-3 leading-relaxed" style={{ color: "rgba(255,255,255,0.35)" }}>
              By continuing you agree to our{" "}
              <a href="/legal/terms" className="underline hover:text-white">Terms</a> and{" "}
              <a href="/legal/privacy" className="underline hover:text-white">Privacy Policy</a>.
            </p>
          </>
        )}
      </div>

      {/* Backdrop click-to-close (placed last so child clicks don't bubble out) */}
      <button
        className="fixed inset-0 -z-10"
        onClick={onClose}
        aria-hidden
        tabIndex={-1}
      />

      <style jsx global>{`
        @keyframes auris-login-fadein {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes auris-login-scalein {
          from { opacity: 0; transform: translateY(-8px) scale(0.96); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        .auris-login-fadein { animation: auris-login-fadein 0.18s ease-out; }
        .auris-login-scalein { animation: auris-login-scalein 0.24s cubic-bezier(0.16, 1, 0.3, 1); }
      `}</style>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label
        className="block mb-1 text-[10px] font-bold uppercase"
        style={{ color: "rgba(255,255,255,0.6)", letterSpacing: "0.08em" }}
      >
        {label}
      </label>
      {children}
    </div>
  );
}

function DarkInput({
  value, onChange, placeholder, type = "text",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      type={type}
      className="w-full text-sm text-white placeholder:text-white/30 focus:outline-none transition-colors"
      style={{
        padding: "10px 14px",
        borderRadius: 10,
        border: "1.5px solid rgba(255,255,255,0.1)",
        background: "rgba(255,255,255,0.06)",
      }}
      onFocus={(e) => (e.currentTarget.style.borderColor = "rgba(228,204,122,0.5)")}
      onBlur={(e) => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)")}
    />
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden>
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  );
}
