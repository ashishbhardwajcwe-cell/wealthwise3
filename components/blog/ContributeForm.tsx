"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Loader2, PenLine, Clock, ExternalLink, XCircle, Hourglass } from "lucide-react";
import { useAuth } from "@/components/auth/AuthProvider";
import { LoginModal } from "@/components/auth/LoginModal";
import { getSupabase } from "@/lib/supabase";
import { BLOG_CATEGORIES } from "@/lib/blog-data";

interface SubmissionRow {
  id: string;
  title: string;
  category: string;
  createdAt: string;
  status: "pending" | "in_review" | "published" | "declined";
  liveSlug: string | null;
}

const STATUS_META: Record<SubmissionRow["status"], { label: string; className: string; Icon: typeof Clock }> = {
  pending: { label: "Awaiting review", className: "bg-[var(--color-amber)]/10 text-[var(--color-amber)]", Icon: Hourglass },
  in_review: { label: "In review", className: "bg-[var(--color-teal)]/10 text-[var(--color-teal)]", Icon: Clock },
  published: { label: "Published", className: "bg-[var(--color-emerald)]/10 text-[var(--color-emerald)]", Icon: CheckCircle2 },
  declined: { label: "Not selected", className: "bg-[var(--color-slate)]/10 text-[var(--color-slate)]", Icon: XCircle },
};

async function getAccessToken(): Promise<string | null> {
  const supabase = getSupabase();
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

export function ContributeForm() {
  const { user, loading, configured } = useAuth();
  const [loginOpen, setLoginOpen] = useState(false);

  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<string>(BLOG_CATEGORIES[0]);
  const [excerpt, setExcerpt] = useState("");
  const [body, setBody] = useState("");
  const [authorName, setAuthorName] = useState("");
  const [authorBio, setAuthorBio] = useState("");
  const [linkedin, setLinkedin] = useState("");
  const [twitter, setTwitter] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submittedTitle, setSubmittedTitle] = useState<string | null>(null);

  const [submissions, setSubmissions] = useState<SubmissionRow[] | null>(null);

  // Prefill the byline from the account profile once available.
  useEffect(() => {
    if (user && !authorName) {
      const name = (user.user_metadata?.full_name as string) || (user.user_metadata?.name as string) || "";
      if (name) setAuthorName(name);
    }
  }, [user, authorName]);

  const loadSubmissions = useCallback(async () => {
    const token = await getAccessToken();
    if (!token) { setSubmissions([]); return; }
    try {
      const res = await fetch("/api/submissions", { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) { setSubmissions([]); return; }
      const json = await res.json();
      setSubmissions(json.submissions ?? []);
    } catch {
      setSubmissions([]);
    }
  }, []);

  useEffect(() => {
    if (user) loadSubmissions();
    else setSubmissions(null);
  }, [user, loadSubmissions]);

  if (!configured) {
    return (
      <div className="rounded-2xl border border-[var(--color-silver)]/40 bg-white p-8 text-center text-sm text-[var(--color-slate)]">
        Submissions open soon. Meanwhile, reach us via the <Link href="/contact" className="text-[var(--color-gold-dim)] font-semibold hover:underline">contact page</Link>.
      </div>
    );
  }

  const wordCount = body.split(/\s+/).filter(Boolean).length;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) { setLoginOpen(true); return; }
    setError(null);

    if (title.trim().length < 8) return setError("Please give your article a longer title (8+ characters).");
    if (excerpt.trim().length < 20) return setError("Please write a 1–2 sentence summary (20+ characters).");
    if (body.trim().length < 300) return setError("Your article looks too short — aim for at least 300 characters.");
    if (authorName.trim().length < 2) return setError("Please tell us your name as it should appear in the byline.");

    setSubmitting(true);
    try {
      const token = await getAccessToken();
      if (!token) throw new Error("Please sign in again.");
      const res = await fetch("/api/submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          title: title.trim(),
          category,
          excerpt: excerpt.trim(),
          bodyMarkdown: body.trim(),
          authorName: authorName.trim(),
          authorBio: authorBio.trim(),
          linkedin: linkedin.trim(),
          twitter: twitter.trim(),
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Submission failed. Please try again.");
      setSubmittedTitle(title.trim());
      setTitle(""); setExcerpt(""); setBody("");
      await loadSubmissions();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Submission failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-10">
      {/* Sign-in gate */}
      {!loading && !user && (
        <div className="rounded-2xl border border-[var(--color-gold)]/30 bg-[var(--color-parchment)] p-6 md:p-8 text-center">
          <PenLine className="w-8 h-8 mx-auto text-[var(--color-gold-dim)]" />
          <h3 className="mt-3" style={{ fontSize: "1.25rem" }}>Sign in to submit your article</h3>
          <p className="mt-2 text-sm text-[var(--color-slate)] max-w-md mx-auto leading-relaxed">
            A free account lets you track your submission&apos;s status and keeps your byline attached to your work.
          </p>
          <button
            onClick={() => setLoginOpen(true)}
            className="mt-5 btn-primary px-6 py-2.5 rounded-lg inline-flex items-center gap-2"
          >
            Sign in / create account
          </button>
        </div>
      )}

      {/* Success banner */}
      {submittedTitle && (
        <div className="rounded-2xl border border-[var(--color-emerald)]/30 bg-[var(--color-emerald)]/5 p-6 flex items-start gap-3">
          <CheckCircle2 className="w-5 h-5 text-[var(--color-emerald)] flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-[var(--color-navy)]">&ldquo;{submittedTitle}&rdquo; is in.</p>
            <p className="text-sm text-[var(--color-slate)] mt-1 leading-relaxed">
              Our editor reviews every submission personally — you&apos;ll hear back by email, and the status below
              updates when your piece is approved and published.
            </p>
          </div>
        </div>
      )}

      {/* The form */}
      <form onSubmit={handleSubmit} className={`space-y-6 ${!user ? "opacity-60 pointer-events-none select-none" : ""}`}>
        <div className="grid md:grid-cols-[1fr_14rem] gap-6">
          <label className="block">
            <span className="text-sm font-semibold text-[var(--color-navy)]">Article title</span>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value.slice(0, 140))}
              placeholder="e.g. What NRIs get wrong about Indian capital gains tax"
              className="mt-2 w-full rounded-lg border border-[var(--color-silver)]/50 bg-white px-4 py-2.5 text-sm focus:outline-none focus:border-[var(--color-gold)]"
              required
            />
          </label>
          <label className="block">
            <span className="text-sm font-semibold text-[var(--color-navy)]">Category</span>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="mt-2 w-full rounded-lg border border-[var(--color-silver)]/50 bg-white px-4 py-2.5 text-sm focus:outline-none focus:border-[var(--color-gold)]"
            >
              {BLOG_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </label>
        </div>

        <label className="block">
          <span className="text-sm font-semibold text-[var(--color-navy)]">One-line summary</span>
          <span className="block text-xs text-[var(--color-steel)] mt-0.5">Shown on the blog card and used as the meta description — make it count.</span>
          <textarea
            value={excerpt}
            onChange={(e) => setExcerpt(e.target.value.slice(0, 300))}
            rows={2}
            placeholder="1–2 sentences on what the reader will learn."
            className="mt-2 w-full rounded-lg border border-[var(--color-silver)]/50 bg-white px-4 py-2.5 text-sm resize-y focus:outline-none focus:border-[var(--color-gold)]"
            required
          />
        </label>

        <label className="block">
          <span className="text-sm font-semibold text-[var(--color-navy)]">Your article</span>
          <span className="block text-xs text-[var(--color-steel)] mt-0.5">
            Markdown supported: <code>## Heading</code>, <code>**bold**</code>, <code>*italic*</code>, <code>- bullet lists</code>, <code>&gt; quotes</code>, <code>[links](https://…)</code>.
            Aim for 800–2,000 words.
          </span>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value.slice(0, 60000))}
            rows={16}
            placeholder={"## Start with your strongest point\n\nWrite naturally — our editor polishes formatting before publishing…"}
            className="mt-2 w-full rounded-lg border border-[var(--color-silver)]/50 bg-white px-4 py-3 text-sm leading-relaxed resize-y font-mono focus:outline-none focus:border-[var(--color-gold)]"
            required
          />
          <span className="block text-xs text-[var(--color-steel)] mt-1.5 text-right">{wordCount} words</span>
        </label>

        <div className="rounded-2xl border border-[var(--color-silver)]/40 bg-[var(--color-offwhite)] p-5 space-y-4">
          <h3 className="text-sm font-semibold text-[var(--color-navy)] uppercase tracking-wider">Your byline</h3>
          <div className="grid md:grid-cols-2 gap-4">
            <label className="block">
              <span className="text-sm font-semibold text-[var(--color-navy)]">Name</span>
              <input
                type="text"
                value={authorName}
                onChange={(e) => setAuthorName(e.target.value.slice(0, 80))}
                placeholder="As it should appear on the article"
                className="mt-2 w-full rounded-lg border border-[var(--color-silver)]/50 bg-white px-4 py-2.5 text-sm focus:outline-none focus:border-[var(--color-gold)]"
                required
              />
            </label>
            <label className="block">
              <span className="text-sm font-semibold text-[var(--color-navy)]">LinkedIn <span className="font-normal text-[var(--color-steel)]">(optional)</span></span>
              <input
                type="url"
                value={linkedin}
                onChange={(e) => setLinkedin(e.target.value)}
                placeholder="https://linkedin.com/in/…"
                className="mt-2 w-full rounded-lg border border-[var(--color-silver)]/50 bg-white px-4 py-2.5 text-sm focus:outline-none focus:border-[var(--color-gold)]"
              />
            </label>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <label className="block md:col-span-1">
              <span className="text-sm font-semibold text-[var(--color-navy)]">Short bio <span className="font-normal text-[var(--color-steel)]">(optional)</span></span>
              <textarea
                value={authorBio}
                onChange={(e) => setAuthorBio(e.target.value.slice(0, 500))}
                rows={2}
                placeholder="One or two lines about you — role, credentials, what you write about."
                className="mt-2 w-full rounded-lg border border-[var(--color-silver)]/50 bg-white px-4 py-2.5 text-sm resize-y focus:outline-none focus:border-[var(--color-gold)]"
              />
            </label>
            <label className="block">
              <span className="text-sm font-semibold text-[var(--color-navy)]">Twitter / X <span className="font-normal text-[var(--color-steel)]">(optional)</span></span>
              <input
                type="url"
                value={twitter}
                onChange={(e) => setTwitter(e.target.value)}
                placeholder="https://x.com/…"
                className="mt-2 w-full rounded-lg border border-[var(--color-silver)]/50 bg-white px-4 py-2.5 text-sm focus:outline-none focus:border-[var(--color-gold)]"
              />
            </label>
          </div>
        </div>

        {error && <p className="text-sm text-[var(--color-ruby)]">{error}</p>}

        <div className="flex items-center justify-between gap-4 flex-wrap">
          <p className="text-xs text-[var(--color-steel)] max-w-md leading-relaxed">
            By submitting you confirm the work is your own, unpublished elsewhere, and grant us the right to edit
            and publish it with your byline. Educational content only — no product promotion.
          </p>
          <button
            type="submit"
            disabled={submitting}
            className="btn-primary px-8 py-3 rounded-lg inline-flex items-center gap-2 disabled:opacity-50"
          >
            {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
            Submit for review
          </button>
        </div>
      </form>

      {/* My submissions */}
      {user && submissions && submissions.length > 0 && (
        <div>
          <h2 className="mb-4" style={{ fontSize: "1.5rem" }}>Your submissions</h2>
          <ul className="space-y-3">
            {submissions.map((s) => {
              const meta = STATUS_META[s.status] ?? STATUS_META.pending;
              return (
                <li key={s.id} className="rounded-xl border border-[var(--color-silver)]/40 bg-white p-4 flex items-center gap-4 flex-wrap">
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-[var(--color-navy)] truncate">{s.title}</div>
                    <div className="text-xs text-[var(--color-slate)] mt-0.5">
                      {s.category} · {new Date(s.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                    </div>
                  </div>
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${meta.className}`}>
                    <meta.Icon className="w-3.5 h-3.5" /> {meta.label}
                  </span>
                  {s.status === "published" && s.liveSlug && (
                    <Link href={`/blog/${s.liveSlug}`} className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--color-gold-dim)] hover:underline">
                      Read live <ExternalLink className="w-3 h-3" />
                    </Link>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <LoginModal open={loginOpen} onClose={() => setLoginOpen(false)} />
    </div>
  );
}
