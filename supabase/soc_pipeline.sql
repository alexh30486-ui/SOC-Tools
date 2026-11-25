-- Spectacle SOC v4: server-managed log analysis persistence.
-- Install in Supabase SQL editor after taking a backup; test on a branch first.
-- Unlike projects, this is intentionally inaccessible to browser `anon` and
-- `authenticated` roles. All access goes through the Python API, which verifies
-- a Supabase user JWT AND workspace membership before using server-only admin key.
-- DO NOT grant table access to authenticated until equivalent RLS policies are designed/tested.
begin;

-- Preflight: the existing app expects workspace_members to exist.
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='workspace_members' and column_name='workspace_id'
  ) or not exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='workspace_members' and column_name='user_id'
  ) then
    raise exception 'Missing public.workspace_members(workspace_id, user_id); configure the app schema first';
  end if;
end $$;

create table if not exists public.soc_ingestions (
  id uuid primary key,
  workspace_id text not null,
  actor_id text not null,
  filename text not null check (length(filename) <= 120),
  content_sha256 text not null check (length(content_sha256)=64),
  status text not null check (status in ('queued','completed','failed')),
  report jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists soc_ingestions_workspace_recent
  on public.soc_ingestions (workspace_id,updated_at desc);

alter table public.soc_ingestions enable row level security;
alter table public.soc_ingestions force row level security;
-- Reject all direct client access. A secret key permits service_role access by design.
revoke all on table public.soc_ingestions from public, anon, authenticated;
grant select, insert, update on table public.soc_ingestions to service_role;

-- No RLS policy for anon or authenticated: locked-down server-managed table.
commit;

-- Verification:
-- select relrowsecurity, relforcerowsecurity from pg_class where oid='public.soc_ingestions'::regclass;
-- select grantee,privilege_type from information_schema.role_table_grants where table_name='soc_ingestions';
-- Authenticate with two different user JWTs and confirm the API never returns cross-workspace rows.
