-- Customer-portal comments, visible to any authenticated Cmsight buyer
-- (account.html), not publicly on the marketing site. Published
-- immediately with no moderation step, per product decision.
-- The buyer's email is kept for internal/abuse tracking but is never
-- returned by the public-facing list API — only the display name is.

create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  name text not null,
  message text not null,
  created_at timestamptz not null default now()
);

create index if not exists comments_created_at_idx on public.comments (created_at desc);

alter table public.comments enable row level security;
-- Intentionally no policies: only the service role (server-side) can read/write.
