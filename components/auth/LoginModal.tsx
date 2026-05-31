"use client";

import { useState } from "react";
import { X, Loader2, Mail, Lock, Check } from "lucide-react";
import { useAuth } from "./AuthProvider";
import { siteConfig } from "@/lib/site-config";

export function LoginModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { signInWithGoogle, signInWithEmail, signUpWithEmail } = useAuth();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState<"google" | "email" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmSent, setConfirmSent] = useState(false);

  if (!open) return null;

  async function handleGoogle() {
    setError(null);
    setLoading("google");
    await signInWithGoogle();
    // Browser redirects to Google; no need to reset state.
  }

  async function handleEmail(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading("email");
    try {
      if (mode === "signup") {
        const { error, needsConfirmation } = await signUpWithEmail(email, password);
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
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <button
        className="absolute inset-0 bg-[var(--color-navy)]/50 backdrop-blur-sm"
        onClick={onClose}
        aria-label="Close login"
      />

      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 md:p-8">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-[var(--color-slate)] hover:text-[var(--color-navy)]"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        {confirmSent ? (
          <div className="text-center py-6">
            <div className="w-12 h-12 rounded-full bg-[var(--color-emerald)]/15 flex items-center justify-center mx-auto mb-4">
              <Check className="w-6 h-6 text-[var(--color-emerald)]" />
            </div>
            <h2 className="text-xl font-semibold mb-2">Check your email</h2>
            <p className="text-sm text-[var(--color-slate)] leading-relaxed">
              We sent a confirmation link to <strong>{email}</strong>. Click it to activate your account, then come back and sign in.
            </p>
            <button onClick={onClose} className="btn-outline mt-6 w-full justify-center">Done</button>
          </div>
        ) : (
          <>
            <div className="text-center mb-6">
              <h2 className="text-2xl font-semibold">
                {mode === "signin" ? "Welcome back" : "Create your account"}
              </h2>
              <p className="text-sm text-[var(--color-slate)] mt-1">
                One account works across {siteConfig.name} and the WealthWise app.
              </p>
            </div>

            {/* Google */}
            <button
              onClick={handleGoogle}
              disabled={loading !== null}
              className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-lg border border-[var(--color-silver)]/60 bg-white hover:bg-[var(--color-sand)]/40 font-semibold text-sm text-[var(--color-navy)] transition-colors disabled:opacity-60"
            >
              {loading === "google" ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <GoogleIcon />
              )}
              Continue with Google
            </button>

            <div className="flex items-center gap-3 my-5">
              <div className="flex-1 h-px bg-[var(--color-silver)]/40" />
              <span className="text-xs text-[var(--color-slate)] uppercase tracking-wider">or</span>
              <div className="flex-1 h-px bg-[var(--color-silver)]/40" />
            </div>

            {/* Email / password */}
            <form onSubmit={handleEmail} className="space-y-3">
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-slate)]" />
                <input
                  type="email" required value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full pl-9 pr-3 py-2.5 border border-[var(--color-silver)]/50 rounded-lg text-sm focus:outline-none focus:border-[var(--color-gold)]"
                />
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-slate)]" />
                <input
                  type="password" required value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={mode === "signup" ? "Create a password (min 6 chars)" : "Password"}
                  minLength={6}
                  className="w-full pl-9 pr-3 py-2.5 border border-[var(--color-silver)]/50 rounded-lg text-sm focus:outline-none focus:border-[var(--color-gold)]"
                />
              </div>

              {error && <p className="text-sm text-[var(--color-ruby)]">{error}</p>}

              <button type="submit" disabled={loading !== null} className="btn-primary w-full justify-center">
                {loading === "email" ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                {mode === "signin" ? "Sign in" : "Create account"}
              </button>
            </form>

            <p className="text-center text-sm text-[var(--color-slate)] mt-5">
              {mode === "signin" ? (
                <>New here?{" "}
                  <button onClick={() => { setMode("signup"); setError(null); }} className="font-semibold text-[var(--color-gold-dim)]">
                    Create an account
                  </button>
                </>
              ) : (
                <>Already have an account?{" "}
                  <button onClick={() => { setMode("signin"); setError(null); }} className="font-semibold text-[var(--color-gold-dim)]">
                    Sign in
                  </button>
                </>
              )}
            </p>

            <p className="text-[11px] text-[var(--color-slate)] text-center mt-5 leading-relaxed">
              By continuing you agree to our{" "}
              <a href="/legal/terms" className="underline">Terms</a> and{" "}
              <a href="/legal/privacy" className="underline">Privacy Policy</a>.
            </p>
          </>
        )}
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden>
      <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z" fill="#4285F4" />
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z" fill="#34A853" />
      <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332Z" fill="#FBBC05" />
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58Z" fill="#EA4335" />
    </svg>
  );
}
