-- Spectacle SOC v5 review actions: append-only analyst disposition history.
-- Apply after soc_pipeline.sql in a TEST Supabase branch first.
-- Users cannot read or write this table directly; the API verifies JWT, membership, and role.
-- Preflight: workspace_members MUST have a role column using owner/contributor/viewer.
begin;
do $$
begin
 if not exists(select 1 from information_schema.columns
   where table_schema='public' and table_name='workspace_members' and column_name='role') then
   raise exception 'workspace_members.role is required for v5 write authorization';
 end if;
end $$;
create table if not exists public.soc_finding_actions (
    id uuid primary key,
    workspace_id text not null,
    run_id uuid not null references public.soc_ingestions(id) on delete cascade,
    finding_id text not null check (finding_id ~ '^DET-[A-F0-9]{12}$'),
    status text not null check (status in ('needs_review','investigating','confirmed','false_positive','escalated')),
    note text not null default '' check (length(note) <= 1000),
    actor_id text not null,
    created_at timestamptz not null default now()
);
create index if not exists soc_finding_actions_workspace_recent
    on public.soc_finding_actions (workspace_id, created_at desc);
alter table public.soc_finding_actions enable row level security;
alter table public.soc_finding_actions force row level security;
revoke all on public.soc_finding_actions from public, anon, authenticated;
grant select,insert on public.soc_finding_actions to service_role;
commit;
-- Note: table rows are immutable from the API; a new action records every status change.
-- Threat-model note: service_role bypasses RLS. Keep its key server-side and verify
-- workspace membership plus run ownership in the API before any write.
