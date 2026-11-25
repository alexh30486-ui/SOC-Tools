-- Spectacle SOC: Supabase hardening for the shared `projects` table.
--
-- NOT RUN against your project. I had no access to it and no PostgreSQL in my sandbox, so this
-- file is untested. Run it first on a Supabase branch or a copy, read the output of the checks at
-- the bottom, and only then on production. Back up first (Dashboard > Database > Backups).
--
-- Assumed existing shape (from the app's queries): 
--   public.projects(id, workspace_id, name, project_data jsonb, version int, created_by uuid, created_at timestamptz)
--   public.workspace_members(workspace_id, user_id)
-- If your columns differ, change the names below before running.
--
-- What it does
--   1. kind: a stored, generated column = project_data->>'kind' (default 'prd'), with a CHECK.
--      A row cannot silently change kind after it is created (trigger).
--   2. RLS on projects: ON and FORCED. Replaces ALL existing policies on projects with four
--      member-only policies. anon gets no access at all.
--   3. soc_cases: a security_invoker view over kind = 'soc-case', so RLS still applies through it.
--   4. Index so the kind-filtered "load latest" stays fast.
-- It deliberately does not create a second physical table: two tables would split the sync
-- logic and the PRD app would still share the original one.

begin;

-- 0. Preflight: stop with a clear message, before changing anything, if the tables are not shaped as assumed.
do $$
declare missing text;
begin
  select string_agg(need, ', ') into missing from (values
    ('projects.id'), ('projects.workspace_id'), ('projects.project_data'), ('projects.created_by'),
    ('workspace_members.workspace_id'), ('workspace_members.user_id')) v(need)
  where not exists (select 1 from information_schema.columns
                    where table_schema = 'public' and table_name = split_part(need, '.', 1) and column_name = split_part(need, '.', 2));
  if missing is not null then
    raise exception 'hardening.sql preflight: missing column(s): %. Edit the names in this file to match your schema.', missing;
  end if;
  if (select data_type from information_schema.columns
       where table_schema = 'public' and table_name = 'projects' and column_name = 'project_data') not in ('jsonb', 'json') then
    raise exception 'hardening.sql preflight: projects.project_data must be json or jsonb';
  end if;
  if exists (select 1 from public.projects where project_data->>'kind' is not null
             and project_data->>'kind' not in ('prd', 'soc-case', 'soc-library')) then
    raise exception 'hardening.sql preflight: some rows have an unexpected project_data.kind. Inspect: select id, project_data->>''kind'' from public.projects where project_data->>''kind'' is not null;';
  end if;
end $$;

-- 1. kind --------------------------------------------------------------------------------------
alter table public.projects
  add column if not exists kind text
  generated always as (coalesce(project_data->>'kind', 'prd')) stored;

alter table public.projects drop constraint if exists projects_kind_check;
alter table public.projects
  add constraint projects_kind_check check (kind in ('prd', 'soc-case', 'soc-library'));

create index if not exists projects_ws_kind_created
  on public.projects (workspace_id, kind, created_at desc);

create or replace function public.projects_kind_immutable() returns trigger
language plpgsql as $$
begin
  -- generated columns are not computed yet in a BEFORE trigger, so compare the source expression
  if coalesce(new.project_data->>'kind', 'prd') is distinct from old.kind then
    raise exception 'project kind cannot be changed (% -> %)', old.kind,
      coalesce(new.project_data->>'kind', 'prd') using errcode = '23514';
  end if;
  return new;
end $$;

drop trigger if exists projects_kind_immutable on public.projects;
create trigger projects_kind_immutable before update on public.projects
  for each row execute function public.projects_kind_immutable();

-- 2. RLS ---------------------------------------------------------------------------------------
alter table public.projects enable row level security;
alter table public.projects force row level security;

-- Permissive policies are OR-ed together, so one old "using (true)" policy would undo everything.
-- Remove every existing policy on projects, then add exactly the four below.
do $$
declare p record;
begin
  for p in select policyname from pg_policies where schemaname = 'public' and tablename = 'projects' loop
    execute format('drop policy %I on public.projects', p.policyname);
  end loop;
end $$;

create policy projects_select on public.projects for select to authenticated
  using (workspace_id in (select workspace_id from public.workspace_members where user_id = (select auth.uid())));

create policy projects_insert on public.projects for insert to authenticated
  with check (
    created_by = (select auth.uid())
    and workspace_id in (select workspace_id from public.workspace_members where user_id = (select auth.uid()))
  );

create policy projects_update on public.projects for update to authenticated
  using (workspace_id in (select workspace_id from public.workspace_members where user_id = (select auth.uid())))
  with check (workspace_id in (select workspace_id from public.workspace_members where user_id = (select auth.uid())));

create policy projects_delete on public.projects for delete to authenticated
  using (workspace_id in (select workspace_id from public.workspace_members where user_id = (select auth.uid())));

revoke all on public.projects from anon;
grant select, insert, update, delete on public.projects to authenticated;

-- workspace_members must itself be readable only for your own rows, otherwise the policies above
-- can be probed. Only the select policy is added; your existing insert path (sign-up trigger) is untouched.
alter table public.workspace_members enable row level security;
drop policy if exists workspace_members_select_own on public.workspace_members;
create policy workspace_members_select_own on public.workspace_members for select to authenticated
  using (user_id = (select auth.uid()));

-- 3. soc_cases view ----------------------------------------------------------------------------
create or replace view public.soc_cases with (security_invoker = true) as
  select id, workspace_id, name, project_data, version, created_by, created_at
  from public.projects
  where kind = 'soc-case';
revoke all on public.soc_cases from anon;
grant select on public.soc_cases to authenticated;

commit;

-- 4. Checks to run after (read the results; none of this is automatic) ------------------------
-- a) RLS on and forced:
--    select relname, relrowsecurity, relforcerowsecurity from pg_class
--     where relname in ('projects','workspace_members');
-- b) exactly four policies on projects:
--    select policyname, cmd from pg_policies where tablename = 'projects' order by cmd;
-- c) every row has a valid kind and the counts look right:
--    select kind, count(*) from public.projects group by kind;
-- d) the PRD "load latest" can never see SOC rows (should return only kind = 'prd'):
--    select id, kind from public.projects where project_data->>'kind' is null order by created_at desc limit 1;
-- e) anon is locked out (run in the SQL editor as anon):
--    set local role anon; select count(*) from public.projects;   -- expect: permission denied
-- f) two-user isolation: from the app, sign in as user A, create a case, sign in as user B in a
--    DIFFERENT workspace and confirm "load latest" says "Nothing saved yet".
