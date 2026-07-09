"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Heart, Loader2, MessageCircle, Pencil, Reply, ShieldCheck, Trash2, EyeOff } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import { LoginModal } from "@/components/auth/LoginModal";
import {
  addComment, checkIsAdmin, deleteComment, fetchComments, hideComment,
  relativeTime, toggleCommentLike, updateComment, type BlogComment,
} from "@/lib/engagement";

const MAX_LEN = 3000;

/**
 * Threaded discussion under a blog post. Reading is open to everyone;
 * writing requires sign-in (existing Supabase auth). One level of
 * replies keeps threads readable — replies to replies attach to the
 * top-level parent, Medium-style.
 */
export function CommentsSection({ slug }: { slug: string }) {
  const { user, configured } = useAuth();
  const [comments, setComments] = useState<BlogComment[] | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const [visibleTop, setVisibleTop] = useState(10);

  const reload = useCallback(async () => {
    const list = await fetchComments(slug, user?.id);
    setComments(list);
  }, [slug, user?.id]);

  useEffect(() => {
    if (!configured) return;
    reload();
  }, [configured, reload]);

  useEffect(() => {
    if (!configured || !user) { setIsAdmin(false); return; }
    checkIsAdmin().then(setIsAdmin);
  }, [configured, user]);

  const { topLevel, repliesByParent } = useMemo(() => {
    const top: BlogComment[] = [];
    const byParent = new Map<string, BlogComment[]>();
    for (const c of comments ?? []) {
      if (c.parent_id) {
        const list = byParent.get(c.parent_id) ?? [];
        list.push(c);
        byParent.set(c.parent_id, list);
      } else {
        top.push(c);
      }
    }
    top.reverse(); // newest thread first; replies stay chronological
    return { topLevel: top, repliesByParent: byParent };
  }, [comments]);

  if (!configured) return null;

  const count = comments?.filter((c) => c.status === "visible").length ?? 0;

  return (
    <section id="comments" className="mt-12 scroll-mt-24" aria-label="Comments">
      <div className="flex items-center gap-2.5 mb-6">
        <MessageCircle className="w-5 h-5 text-[var(--color-gold-dim)]" />
        <h2 style={{ fontSize: "1.5rem" }}>
          Discussion{comments !== null && count > 0 ? ` (${count})` : ""}
        </h2>
      </div>

      <Composer
        placeholder="Share your perspective…"
        onRequireLogin={() => setLoginOpen(true)}
        onSubmit={async (body) => {
          if (!user) return;
          await addComment({ postSlug: slug, user, body });
          await reload();
        }}
      />

      {comments === null ? (
        <div className="mt-8 flex items-center gap-2 text-sm text-[var(--color-slate)]">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading comments…
        </div>
      ) : topLevel.length === 0 ? (
        <p className="mt-8 text-sm text-[var(--color-slate)]">
          No comments yet. Be the first to share your thoughts.
        </p>
      ) : (
        <ul className="mt-8 space-y-6">
          {topLevel.slice(0, visibleTop).map((c) => (
            <CommentItem
              key={c.id}
              comment={c}
              replies={repliesByParent.get(c.id) ?? []}
              slug={slug}
              isAdmin={isAdmin}
              onRequireLogin={() => setLoginOpen(true)}
              onChanged={reload}
            />
          ))}
        </ul>
      )}

      {topLevel.length > visibleTop && (
        <button
          onClick={() => setVisibleTop((n) => n + 10)}
          className="mt-6 text-sm font-semibold text-[var(--color-gold-dim)] hover:underline"
        >
          Show more comments ({topLevel.length - visibleTop} remaining)
        </button>
      )}

      <LoginModal open={loginOpen} onClose={() => setLoginOpen(false)} />
    </section>
  );
}

// ------------------------------------------------------------------ composer

function Composer({
  placeholder,
  autoFocus,
  initialValue = "",
  submitLabel = "Post comment",
  onSubmit,
  onRequireLogin,
  onCancel,
}: {
  placeholder: string;
  autoFocus?: boolean;
  initialValue?: string;
  submitLabel?: string;
  onSubmit: (body: string) => Promise<void>;
  onRequireLogin: () => void;
  onCancel?: () => void;
}) {
  const { user } = useAuth();
  const [body, setBody] = useState(initialValue);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) { onRequireLogin(); return; }
    const trimmed = body.trim();
    if (!trimmed) return;
    setBusy(true);
    setError(null);
    try {
      await onSubmit(trimmed);
      setBody("");
      onCancel?.();
    } catch {
      setError("Could not post your comment. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-2xl border border-[var(--color-silver)]/40 bg-white p-4">
      <textarea
        value={body}
        autoFocus={autoFocus}
        onChange={(e) => setBody(e.target.value.slice(0, MAX_LEN))}
        onFocus={() => { if (!user) onRequireLogin(); }}
        placeholder={user ? placeholder : "Sign in to join the discussion…"}
        rows={3}
        className="w-full resize-y bg-transparent text-sm leading-relaxed text-[var(--color-navy)] placeholder:text-[var(--color-steel)] focus:outline-none"
      />
      <div className="mt-2 flex items-center justify-between gap-3 flex-wrap">
        <span className="text-xs text-[var(--color-steel)]">
          {body.length > 0 && `${body.length}/${MAX_LEN} · `}Be constructive. No investment tips or spam.
        </span>
        <div className="flex items-center gap-2">
          {onCancel && (
            <button type="button" onClick={onCancel} className="text-sm text-[var(--color-slate)] px-3 py-1.5 hover:text-[var(--color-navy)]">
              Cancel
            </button>
          )}
          <button
            type="submit"
            disabled={busy || (!!user && !body.trim())}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-lg bg-[var(--color-navy)] text-[var(--color-cream)] text-sm font-semibold disabled:opacity-40 hover:bg-[var(--color-midnight)] transition-colors"
          >
            {busy && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {user ? submitLabel : "Sign in to comment"}
          </button>
        </div>
      </div>
      {error && <p className="mt-2 text-xs text-[var(--color-ruby)]">{error}</p>}
    </form>
  );
}

// ------------------------------------------------------------------- item

function CommentItem({
  comment,
  replies,
  slug,
  isAdmin,
  depth = 0,
  onRequireLogin,
  onChanged,
}: {
  comment: BlogComment;
  replies: BlogComment[];
  slug: string;
  isAdmin: boolean;
  depth?: number;
  onRequireLogin: () => void;
  onChanged: () => Promise<void>;
}) {
  const { user } = useAuth();
  const [replying, setReplying] = useState(false);
  const [editing, setEditing] = useState(false);
  const [liked, setLiked] = useState(comment.likedByMe);
  const [likeCount, setLikeCount] = useState(comment.likeCount);

  // Keep local like state in sync when a reload replaces the comment prop.
  useEffect(() => {
    setLiked(comment.likedByMe);
    setLikeCount(comment.likeCount);
  }, [comment.likedByMe, comment.likeCount]);

  const isOwn = user?.id === comment.user_id;
  const hidden = comment.status === "hidden";

  async function handleLike() {
    if (!user) { onRequireLogin(); return; }
    const was = liked;
    setLiked(!was);
    setLikeCount((n) => Math.max(0, n + (was ? -1 : 1)));
    try {
      await toggleCommentLike(comment.id, user.id, was);
    } catch {
      setLiked(was);
      setLikeCount((n) => Math.max(0, n + (was ? 1 : -1)));
    }
  }

  async function handleDelete() {
    if (!window.confirm("Delete this comment? This cannot be undone.")) return;
    await deleteComment(comment.id);
    await onChanged();
  }

  async function handleHide() {
    await hideComment(comment.id);
    await onChanged();
  }

  return (
    <li className={depth > 0 ? "ml-6 md:ml-10" : undefined}>
      <div className={`rounded-2xl border p-4 ${hidden ? "border-dashed border-[var(--color-silver)]/60 opacity-60" : "border-[var(--color-silver)]/40 bg-white"}`}>
        <div className="flex items-center gap-3">
          {comment.author_avatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={comment.author_avatar} alt="" className="w-8 h-8 rounded-full" referrerPolicy="no-referrer" />
          ) : (
            <span className="w-8 h-8 rounded-full bg-[var(--color-navy)] text-[var(--color-gold)] flex items-center justify-center text-xs font-semibold flex-shrink-0">
              {comment.author_name[0]?.toUpperCase() ?? "R"}
            </span>
          )}
          <div className="min-w-0">
            <span className="text-sm font-semibold text-[var(--color-navy)]">{comment.author_name}</span>
            <span className="ml-2 text-xs text-[var(--color-steel)]">
              {relativeTime(comment.created_at)}
              {comment.edited && " · edited"}
              {hidden && " · hidden"}
            </span>
          </div>
        </div>

        {editing ? (
          <div className="mt-3">
            <Composer
              placeholder="Edit your comment…"
              autoFocus
              initialValue={comment.body}
              submitLabel="Save"
              onRequireLogin={onRequireLogin}
              onCancel={() => setEditing(false)}
              onSubmit={async (body) => {
                await updateComment(comment.id, body);
                await onChanged();
              }}
            />
          </div>
        ) : (
          <p className="mt-3 text-sm leading-relaxed text-[var(--color-navy)] whitespace-pre-wrap break-words">
            {comment.body}
          </p>
        )}

        {!editing && (
          <div className="mt-3 flex items-center gap-4 text-xs font-semibold text-[var(--color-slate)]">
            <button
              onClick={handleLike}
              aria-pressed={liked}
              className={`inline-flex items-center gap-1.5 transition-colors ${liked ? "text-[var(--color-ruby)]" : "hover:text-[var(--color-navy)]"}`}
            >
              <Heart className={`w-3.5 h-3.5 ${liked ? "fill-current" : ""}`} />
              {likeCount > 0 ? likeCount : "Like"}
            </button>
            {depth === 0 && (
              <button onClick={() => setReplying(!replying)} className="inline-flex items-center gap-1.5 hover:text-[var(--color-navy)]">
                <Reply className="w-3.5 h-3.5" /> Reply
              </button>
            )}
            {isOwn && (
              <button onClick={() => setEditing(true)} className="inline-flex items-center gap-1.5 hover:text-[var(--color-navy)]">
                <Pencil className="w-3.5 h-3.5" /> Edit
              </button>
            )}
            {(isOwn || isAdmin) && (
              <button onClick={handleDelete} className="inline-flex items-center gap-1.5 hover:text-[var(--color-ruby)]">
                <Trash2 className="w-3.5 h-3.5" /> Delete
              </button>
            )}
            {isAdmin && !isOwn && !hidden && (
              <button onClick={handleHide} title="Hide from public view (admin)" className="inline-flex items-center gap-1.5 hover:text-[var(--color-amber)]">
                <EyeOff className="w-3.5 h-3.5" /> Hide
              </button>
            )}
            {isAdmin && (
              <span className="inline-flex items-center gap-1 text-[var(--color-teal)]" title="You are moderating as admin">
                <ShieldCheck className="w-3.5 h-3.5" />
              </span>
            )}
          </div>
        )}
      </div>

      {replying && (
        <div className="mt-3 ml-6 md:ml-10">
          <Composer
            placeholder={`Reply to ${comment.author_name}…`}
            autoFocus
            submitLabel="Post reply"
            onRequireLogin={onRequireLogin}
            onCancel={() => setReplying(false)}
            onSubmit={async (body) => {
              if (!user) return;
              await addComment({ postSlug: slug, user, body, parentId: comment.id });
              await onChanged();
            }}
          />
        </div>
      )}

      {replies.length > 0 && (
        <ul className="mt-3 space-y-3">
          {replies.map((r) => (
            <CommentItem
              key={r.id}
              comment={r}
              replies={[]}
              slug={slug}
              isAdmin={isAdmin}
              depth={1}
              onRequireLogin={onRequireLogin}
              onChanged={onChanged}
            />
          ))}
        </ul>
      )}
    </li>
  );
}
