-- Marks comments posted by the site admin (via the admin-only API, not
-- the customer access-token flow) so the portal can display them as
-- official replies from the Cmsight team.

alter table public.comments
  add column if not exists is_admin boolean not null default false;
