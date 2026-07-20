-- ============================================================
-- PMS lead capture: enquiry leads + newsletter subscribers.
-- Run this in the Supabase SQL editor (or `supabase db push`).
--
-- Both tables are WRITE-ONLY for the public anon key: RLS is
-- enabled with insert policies only, so a client holding the anon
-- key can never select, update or delete a row. Rows are read in
-- the Supabase dashboard (or with the service-role key).
-- ============================================================

create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text,
  email text not null,
  phone text,
  strategy text,
  source text
);

alter table public.leads enable row level security;

drop policy if exists "anyone can submit a lead" on public.leads;
create policy "anyone can submit a lead" on public.leads
  for insert to anon with check (true);

create table if not exists public.subscribers (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  email text not null unique,
  source text
);

alter table public.subscribers enable row level security;

drop policy if exists "anyone can subscribe" on public.subscribers;
create policy "anyone can subscribe" on public.subscribers
  for insert to anon with check (true);
