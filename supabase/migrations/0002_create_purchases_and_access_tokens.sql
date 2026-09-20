-- Purchase records and customer-portal access tokens for products that
-- don't use the licenses table (e.g. the Cmsight app, which has no
-- automatic license). All access is server-side via the service role key;
-- RLS is enabled with no policies, same as public.licenses.

create table if not exists public.purchases (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  product text not null,
  stripe_session_id text unique not null,
  created_at timestamptz not null default now()
);

create index if not exists purchases_email_idx on public.purchases (email);

alter table public.purchases enable row level security;
-- Intentionally no policies: only the service role (server-side) can read/write.

-- Magic-link / customer-portal access tokens. Only a hash of the token is
-- stored, never the raw value (the raw token exists only in the emailed
-- link) so a database leak alone can't be used to impersonate a buyer.
create table if not exists public.access_tokens (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  token_hash text unique not null,
  purpose text not null default 'cmsight-downloads',
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists access_tokens_token_hash_idx on public.access_tokens (token_hash);

alter table public.access_tokens enable row level security;
-- Intentionally no policies: only the service role (server-side) can read/write.
