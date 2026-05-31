"use client";

import { useState } from "react";
import { User as UserIcon, LogOut, LayoutDashboard, ChevronDown, ExternalLink } from "lucide-react";
import { useAuth } from "./AuthProvider";
import { LoginModal } from "./LoginModal";
import { siteConfig } from "@/lib/site-config";

export function AccountButton({ variant = "desktop" }: { variant?: "desktop" | "mobile" }) {
  const { user, loading, configured } = useAuth();
  const [modalOpen, setModalOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  // If Supabase isn't configured, render nothing (site works without login).
  if (!configured) return null;

  if (loading) {
    return <div className="w-20 h-8 rounded-lg bg-[var(--color-sand)]/50 animate-pulse" aria-hidden />;
  }

  if (!user) {
    return (
      <>
        {variant === "mobile" ? (
          <button
            onClick={() => setModalOpen(true)}
            className="px-2 py-3 text-base font-medium text-[var(--color-navy)] border-b border-[var(--color-silver)]/30 text-left inline-flex items-center gap-2 w-full"
          >
            <UserIcon className="w-4 h-4" /> Sign in
          </button>
        ) : (
          <button
            onClick={() => setModalOpen(true)}
            className="text-sm font-semibold text-[var(--color-navy)] inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--color-silver)]/50 hover:border-[var(--color-gold)] hover:text-[var(--color-gold-dim)] transition-colors"
          >
            <UserIcon className="w-4 h-4" /> Sign in
          </button>
        )}
        <LoginModal open={modalOpen} onClose={() => setModalOpen(false)} />
      </>
    );
  }

  const displayName = user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split("@")[0] || "Account";
  const avatarUrl = user.user_metadata?.avatar_url as string | undefined;

  if (variant === "mobile") {
    return (
      <div className="border-b border-[var(--color-silver)]/30 py-3">
        <div className="px-2 text-sm font-semibold text-[var(--color-navy)] mb-2">{displayName}</div>
        <a href={siteConfig.appUrl} target="_blank" rel="noreferrer" className="block px-2 py-2 text-sm text-[var(--color-slate)]">
          Open the app →
        </a>
        <SignOutButton className="px-2 py-2 text-sm text-[var(--color-ruby)] text-left w-full" />
      </div>
    );
  }

  return (
    <div className="relative" onMouseEnter={() => setMenuOpen(true)} onMouseLeave={() => setMenuOpen(false)}>
      <button className="flex items-center gap-2 text-sm font-semibold text-[var(--color-navy)] hover:text-[var(--color-gold-dim)]">
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={avatarUrl} alt="" className="w-7 h-7 rounded-full" />
        ) : (
          <span className="w-7 h-7 rounded-full bg-[var(--color-navy)] text-[var(--color-gold)] flex items-center justify-center text-xs font-semibold">
            {displayName[0]?.toUpperCase()}
          </span>
        )}
        <span className="max-w-[8rem] truncate">{displayName}</span>
        <ChevronDown className="w-3.5 h-3.5" />
      </button>

      {menuOpen && (
        <div className="absolute top-full right-0 pt-2 w-56">
          <div className="bg-white border border-[var(--color-silver)]/50 rounded-xl shadow-lg p-1.5">
            <div className="px-3 py-2 border-b border-[var(--color-silver)]/30">
              <div className="text-sm font-semibold text-[var(--color-navy)] truncate">{displayName}</div>
              <div className="text-xs text-[var(--color-slate)] truncate">{user.email}</div>
            </div>
            <a
              href={siteConfig.appUrl}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-[var(--color-sand)]/60 text-sm text-[var(--color-navy)]"
            >
              <LayoutDashboard className="w-4 h-4 text-[var(--color-gold-dim)]" />
              Open the app
              <ExternalLink className="w-3 h-3 ml-auto text-[var(--color-slate)]" />
            </a>
            <SignOutButton className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-[var(--color-sand)]/60 text-sm text-[var(--color-ruby)] w-full text-left" />
          </div>
        </div>
      )}
    </div>
  );
}

function SignOutButton({ className }: { className?: string }) {
  const { signOut } = useAuth();
  return (
    <button onClick={() => signOut()} className={className}>
      <LogOut className="w-4 h-4" /> Sign out
    </button>
  );
}
