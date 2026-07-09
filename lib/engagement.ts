"use client";

/**
 * Client-side data layer for blog engagement (likes + comments).
 * All access goes through the anon Supabase client; row-level security
 * (see supabase/migrations/20260709120000_blog_engagement.sql) enforces
 * who can write what, so these helpers stay deliberately thin.
 */

import type { User } from "@supabase/supabase-js";
import { getSupabase } from "./supabase";

export interface BlogComment {
  id: string;
  post_slug: string;
  user_id: string;
  parent_id: string | null;
  author_name: string;
  author_avatar: string | null;
  body: string;
  status: "visible" | "hidden";
  edited: boolean;
  created_at: string;
  /** Filled in client-side from blog_comment_likes. */
  likeCount: number;
  likedByMe: boolean;
}

export function displayNameOf(user: User): string {
  return (
    (user.user_metadata?.full_name as string) ||
    (user.user_metadata?.name as string) ||
    user.email?.split("@")[0] ||
    "Reader"
  );
}

export function avatarOf(user: User): string | null {
  return (user.user_metadata?.avatar_url as string) ?? null;
}

// ---------------------------------------------------------------- likes

export async function fetchLikeState(postSlug: string, userId?: string) {
  const supabase = getSupabase();
  if (!supabase) return { count: 0, likedByMe: false };
  const { count } = await supabase
    .from("blog_likes")
    .select("*", { count: "exact", head: true })
    .eq("post_slug", postSlug);
  let likedByMe = false;
  if (userId) {
    const { data } = await supabase
      .from("blog_likes")
      .select("id")
      .eq("post_slug", postSlug)
      .eq("user_id", userId)
      .maybeSingle();
    likedByMe = !!data;
  }
  return { count: count ?? 0, likedByMe };
}

export async function toggleLike(postSlug: string, userId: string, currentlyLiked: boolean) {
  const supabase = getSupabase();
  if (!supabase) throw new Error("Not configured");
  if (currentlyLiked) {
    const { error } = await supabase
      .from("blog_likes")
      .delete()
      .eq("post_slug", postSlug)
      .eq("user_id", userId);
    if (error) throw error;
  } else {
    const { error } = await supabase
      .from("blog_likes")
      .insert({ post_slug: postSlug, user_id: userId });
    // Unique violation = already liked (double-click race); treat as success.
    if (error && error.code !== "23505") throw error;
  }
}

// ------------------------------------------------------------- comments

export async function fetchComments(postSlug: string, userId?: string): Promise<BlogComment[]> {
  const supabase = getSupabase();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("blog_comments")
    .select("id, post_slug, user_id, parent_id, author_name, author_avatar, body, status, edited, created_at")
    .eq("post_slug", postSlug)
    .order("created_at", { ascending: true })
    .limit(500);
  if (error || !data) return [];

  const ids = data.map((c) => c.id);
  const likeCounts = new Map<string, number>();
  const likedByMe = new Set<string>();
  if (ids.length > 0) {
    const { data: likes } = await supabase
      .from("blog_comment_likes")
      .select("comment_id, user_id")
      .in("comment_id", ids);
    for (const l of likes ?? []) {
      likeCounts.set(l.comment_id, (likeCounts.get(l.comment_id) ?? 0) + 1);
      if (userId && l.user_id === userId) likedByMe.add(l.comment_id);
    }
  }

  return data.map((c) => ({
    ...c,
    likeCount: likeCounts.get(c.id) ?? 0,
    likedByMe: likedByMe.has(c.id),
  })) as BlogComment[];
}

export async function addComment(opts: {
  postSlug: string;
  user: User;
  body: string;
  parentId?: string | null;
}) {
  const supabase = getSupabase();
  if (!supabase) throw new Error("Not configured");
  const { error } = await supabase.from("blog_comments").insert({
    post_slug: opts.postSlug,
    user_id: opts.user.id,
    parent_id: opts.parentId ?? null,
    author_name: displayNameOf(opts.user),
    author_avatar: avatarOf(opts.user),
    body: opts.body.trim(),
  });
  if (error) throw error;
}

export async function updateComment(commentId: string, body: string) {
  const supabase = getSupabase();
  if (!supabase) throw new Error("Not configured");
  const { error } = await supabase
    .from("blog_comments")
    .update({ body: body.trim(), edited: true, updated_at: new Date().toISOString() })
    .eq("id", commentId);
  if (error) throw error;
}

export async function deleteComment(commentId: string) {
  const supabase = getSupabase();
  if (!supabase) throw new Error("Not configured");
  const { error } = await supabase.from("blog_comments").delete().eq("id", commentId);
  if (error) throw error;
}

/** Admin-only (enforced by RLS): hide an inappropriate comment. */
export async function hideComment(commentId: string) {
  const supabase = getSupabase();
  if (!supabase) throw new Error("Not configured");
  const { error } = await supabase
    .from("blog_comments")
    .update({ status: "hidden" })
    .eq("id", commentId);
  if (error) throw error;
}

export async function toggleCommentLike(commentId: string, userId: string, currentlyLiked: boolean) {
  const supabase = getSupabase();
  if (!supabase) throw new Error("Not configured");
  if (currentlyLiked) {
    const { error } = await supabase
      .from("blog_comment_likes")
      .delete()
      .eq("comment_id", commentId)
      .eq("user_id", userId);
    if (error) throw error;
  } else {
    const { error } = await supabase
      .from("blog_comment_likes")
      .insert({ comment_id: commentId, user_id: userId });
    if (error && error.code !== "23505") throw error;
  }
}

/** True when the signed-in user's email is in blog_admins (RLS lets a
 *  user see only their own row, so this leaks nothing). */
export async function checkIsAdmin(): Promise<boolean> {
  const supabase = getSupabase();
  if (!supabase) return false;
  const { data } = await supabase.from("blog_admins").select("email").limit(1);
  return !!data && data.length > 0;
}

// ------------------------------------------------------------- helpers

/** "3 minutes ago" style relative timestamps for comments. */
export function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const secs = Math.max(0, Math.floor((Date.now() - then) / 1000));
  if (secs < 60) return "just now";
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins} minute${mins === 1 ? "" : "s"} ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} day${days === 1 ? "" : "s"} ago`;
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}
