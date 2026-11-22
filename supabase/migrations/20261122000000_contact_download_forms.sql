-- ============================================================
-- Contact-form messages and guide-download requests (replaces Netlify
-- Forms / email-only /api routes). Paste into Supabase SQL Editor and run.
-- Idempotent. Insert-only for the anon key; RLS enabled; no read policies.
-- Requires the earlier 20261121000000 script (rate limiting) to already be run.
-- ============================================================

create table if not exists public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text not null,
  email text not null,
  phone text,
  topic text,
  message text not null
);
alter table public.contact_messages enable row level security;
drop policy if exists "anyone can send a contact message" on public.contact_messages;
create policy "anyone can send a contact message" on public.contact_messages
  for insert to anon with check (true);

create table if not exists public.download_requests (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  email text not null,
  slug text not null
);
alter table public.download_requests enable row level security;
drop policy if exists "anyone can request a download" on public.download_requests;
create policy "anyone can request a download" on public.download_requests
  for insert to anon with check (true);
