-- EU Compliance Suite licenses table.
-- All read/write access is performed server-side via the Supabase service
-- role key (see /api routes), which bypasses Row Level Security by design.
-- RLS is enabled with no policies, so anon/authenticated clients get zero
-- direct access to this table.

create extension if not exists "pgcrypto";

create table if not exists public.licenses (
  id uuid primary key default gen_random_uuid(),
  license_key text unique not null,
  email text not null,
  status text not null default 'active' check (status in ('active', 'revoked')),
  expires_at timestamptz,
  site_url text,
  stripe_session_id text unique,
  last_seen_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists licenses_email_idx on public.licenses (email);

alter table public.licenses enable row level security;
-- Intentionally no policies: only the service role (server-side) can read/write.
