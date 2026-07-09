"use client";

import { useEffect, useState } from "react";
import { Heart, MessageCircle } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import { LoginModal } from "@/components/auth/LoginModal";
import { fetchLikeState, toggleLike } from "@/lib/engagement";

/**
 * Compact like / comment strip shown under the post meta. Counts are
 * server-rendered via initial props (no layout pop, crawlable), then
 * hydrated with the signed-in reader's own state.
 */
export function EngagementBar({
  slug,
  initialLikes = 0,
  initialComments = 0,
}: {
  slug: string;
  initialLikes?: number;
  initialComments?: number;
}) {
  const { user, configured } = useAuth();
  const [likes, setLikes] = useState(initialLikes);
  const [liked, setLiked] = useState(false);
  const [pulse, setPulse] = useState(false);
  const [busy, setBusy] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);

  useEffect(() => {
    if (!configured) return;
    let cancelled = false;
    fetchLikeState(slug, user?.id).then(({ count, likedByMe }) => {
      if (cancelled) return;
      setLikes(count);
      setLiked(likedByMe);
    });
    return () => { cancelled = true; };
  }, [slug, user?.id, configured]);

  if (!configured) return null;

  async function handleLike() {
    if (!user) {
      setLoginOpen(true);
      return;
    }
    if (busy) return;
    setBusy(true);
    // Optimistic flip; revert on failure.
    const wasLiked = liked;
    setLiked(!wasLiked);
    setLikes((n) => Math.max(0, n + (wasLiked ? -1 : 1)));
    if (!wasLiked) {
      setPulse(true);
      setTimeout(() => setPulse(false), 450);
    }
    try {
      await toggleLike(slug, user.id, wasLiked);
    } catch {
      setLiked(wasLiked);
      setLikes((n) => Math.max(0, n + (wasLiked ? 1 : -1)));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-6 inline-flex items-center gap-2">
      <button
        onClick={handleLike}
        aria-pressed={liked}
        aria-label={liked ? "Unlike this essay" : "Like this essay"}
        title={user ? undefined : "Sign in to like"}
        className={`inline-flex items-center gap-2 px-4 py-2 rounded-full border text-sm font-semibold transition-all ${
          liked
            ? "bg-[var(--color-ruby)]/10 border-[var(--color-ruby)]/40 text-[var(--color-ruby)]"
            : "bg-white border-[var(--color-silver)]/50 text-[var(--color-navy)] hover:border-[var(--color-gold)] hover:text-[var(--color-gold-dim)]"
        }`}
      >
        <Heart
          className={`w-4 h-4 transition-transform duration-300 ${liked ? "fill-current" : ""} ${pulse ? "scale-150" : "scale-100"}`}
        />
        {likes > 0 ? likes : "Like"}
      </button>

      <a
        href="#comments"
        className="inline-flex items-center gap-2 px-4 py-2 rounded-full border bg-white border-[var(--color-silver)]/50 text-sm font-semibold text-[var(--color-navy)] hover:border-[var(--color-gold)] hover:text-[var(--color-gold-dim)] transition-colors"
      >
        <MessageCircle className="w-4 h-4" />
        {initialComments > 0 ? `${initialComments} comment${initialComments === 1 ? "" : "s"}` : "Discuss"}
      </a>

      <LoginModal open={loginOpen} onClose={() => setLoginOpen(false)} />
    </div>
  );
}
