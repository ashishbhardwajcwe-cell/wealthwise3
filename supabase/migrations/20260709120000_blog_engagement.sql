-- ============================================================
-- Blog engagement + contributor submissions
-- Run this in the Supabase SQL editor (or `supabase db push`).
-- Everything is guarded by row-level security so the public anon
-- key can be used directly from the browser.
-- ============================================================

-- ------------------------------------------------------------
-- Admins: emails listed here can moderate comments and review
-- submissions. Add yourself:
--   insert into public.blog_admins (email) values ('you@example.com');
-- ------------------------------------------------------------
create table if not exists public.blog_admins (
  email text primary key
);

alter table public.blog_admins enable row level security;

-- A signed-in user may check ONLY their own admin status (used by the
-- UI to decide whether to show moderation controls).
drop policy if exists "read own admin row" on public.blog_admins;
create policy "read own admin row" on public.blog_admins
  for select using (email = (auth.jwt() ->> 'email'));

-- Security-definer helper so other policies can check admin status
-- without granting broad read access to the admins table.
create or replace function public.is_blog_admin()
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1 from public.blog_admins
    where email = (auth.jwt() ->> 'email')
  );
$$;

-- ------------------------------------------------------------
-- Post likes — one per user per post, keyed by the post slug so it
-- works for both Sanity and legacy posts.
-- ------------------------------------------------------------
create table if not exists public.blog_likes (
  id uuid primary key default gen_random_uuid(),
  post_slug text not null,
  user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (post_slug, user_id)
);

create index if not exists blog_likes_post_slug_idx on public.blog_likes (post_slug);

alter table public.blog_likes enable row level security;

drop policy if exists "likes are public" on public.blog_likes;
create policy "likes are public" on public.blog_likes
  for select using (true);

drop policy if exists "like as yourself" on public.blog_likes;
create policy "like as yourself" on public.blog_likes
  for insert with check (auth.uid() = user_id);

drop policy if exists "unlike your own" on public.blog_likes;
create policy "unlike your own" on public.blog_likes
  for delete using (auth.uid() = user_id);

-- ------------------------------------------------------------
-- Comments — flat table with optional parent_id for one-level replies.
-- author_name / author_avatar are denormalised from user metadata at
-- write time so rendering never needs to touch auth.users.
-- ------------------------------------------------------------
create table if not exists public.blog_comments (
  id uuid primary key default gen_random_uuid(),
  post_slug text not null,
  user_id uuid not null references auth.users (id) on delete cascade,
  parent_id uuid references public.blog_comments (id) on delete cascade,
  author_name text not null default 'Reader',
  author_avatar text,
  body text not null check (char_length(body) between 1 and 3000),
  status text not null default 'visible' check (status in ('visible', 'hidden')),
  edited boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists blog_comments_post_slug_idx
  on public.blog_comments (post_slug, created_at);

alter table public.blog_comments enable row level security;

drop policy if exists "visible comments are public" on public.blog_comments;
create policy "visible comments are public" on public.blog_comments
  for select using (
    status = 'visible' or auth.uid() = user_id or public.is_blog_admin()
  );

drop policy if exists "comment as yourself" on public.blog_comments;
create policy "comment as yourself" on public.blog_comments
  for insert with check (auth.uid() = user_id and status = 'visible');

drop policy if exists "edit your own comment" on public.blog_comments;
create policy "edit your own comment" on public.blog_comments
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "admins can moderate comments" on public.blog_comments;
create policy "admins can moderate comments" on public.blog_comments
  for update using (public.is_blog_admin());

drop policy if exists "delete your own comment" on public.blog_comments;
create policy "delete your own comment" on public.blog_comments
  for delete using (auth.uid() = user_id or public.is_blog_admin());

-- ------------------------------------------------------------
-- Comment likes
-- ------------------------------------------------------------
create table if not exists public.blog_comment_likes (
  comment_id uuid not null references public.blog_comments (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (comment_id, user_id)
);

alter table public.blog_comment_likes enable row level security;

drop policy if exists "comment likes are public" on public.blog_comment_likes;
create policy "comment likes are public" on public.blog_comment_likes
  for select using (true);

drop policy if exists "like comments as yourself" on public.blog_comment_likes;
create policy "like comments as yourself" on public.blog_comment_likes
  for insert with check (auth.uid() = user_id);

drop policy if exists "unlike comments you liked" on public.blog_comment_likes;
create policy "unlike comments you liked" on public.blog_comment_likes
  for delete using (auth.uid() = user_id);

-- ------------------------------------------------------------
-- Guest submissions — articles readers pitch via /blog/contribute.
-- Inserted through the /api/submissions route (which also creates a
-- draft blogPost in Sanity for review). Status meanings:
--   pending    just arrived, not yet looked at
--   in_review  admin is working on it
--   published  live on the blog (auto-detected from Sanity too)
--   declined   not running it
-- ------------------------------------------------------------
create table if not exists public.blog_submissions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  email text not null,
  author_name text not null check (char_length(author_name) between 2 and 80),
  author_bio text check (author_bio is null or char_length(author_bio) <= 500),
  author_links jsonb,
  title text not null check (char_length(title) between 8 and 140),
  category text not null,
  excerpt text not null check (char_length(excerpt) between 20 and 300),
  body_markdown text not null check (char_length(body_markdown) between 300 and 60000),
  status text not null default 'pending'
    check (status in ('pending', 'in_review', 'published', 'declined')),
  sanity_draft_id text,
  admin_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists blog_submissions_user_idx
  on public.blog_submissions (user_id, created_at desc);

alter table public.blog_submissions enable row level security;

drop policy if exists "read your own submissions" on public.blog_submissions;
create policy "read your own submissions" on public.blog_submissions
  for select using (auth.uid() = user_id or public.is_blog_admin());

drop policy if exists "submit as yourself" on public.blog_submissions;
create policy "submit as yourself" on public.blog_submissions
  for insert with check (auth.uid() = user_id and status = 'pending');

drop policy if exists "admins manage submissions" on public.blog_submissions;
create policy "admins manage submissions" on public.blog_submissions
  for update using (public.is_blog_admin());
