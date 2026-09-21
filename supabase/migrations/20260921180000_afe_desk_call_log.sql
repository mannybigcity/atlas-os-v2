-- AFE desk call log (internal). One row each time the owner taps Log call or
-- Save note — the path that already stamps a prospect contacted.
--
-- This is not organization_opportunity_events. That timeline is per prospect,
-- uses a closed event_type list, and deletes with the prospect, which would
-- erase the day's count. The log snapshots the company name so it stays
-- filterable by day after a card is removed.
--
-- Day boundaries are the desk timezone in the app (DESK_TIMEZONE, default
-- America/Chicago), not UTC. The daily goal lives on the existing desk
-- settings row and defaults to 100.
--
-- Apply on production Supabase: paste this file into the SQL editor and run
-- it, or `supabase db push` from a checkout that includes it. Safe to re-run.

create table if not exists public.organization_desk_call_logs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  opportunity_id uuid references public.organization_opportunities (id) on delete set null,
  prospect_name text not null check (length(btrim(prospect_name)) between 1 and 220),
  note text check (note is null or length(btrim(note)) <= 3000),
  logged_at timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists organization_desk_call_logs_org_logged_idx
  on public.organization_desk_call_logs (organization_id, logged_at desc);

create index if not exists organization_desk_call_logs_opportunity_idx
  on public.organization_desk_call_logs (opportunity_id);

alter table public.organization_desk_call_logs enable row level security;

drop policy if exists "Members can read desk call logs" on public.organization_desk_call_logs;
create policy "Members can read desk call logs"
  on public.organization_desk_call_logs
  for select
  to authenticated
  using (
    public.is_atlas_super_admin()
    or exists (
      select 1
      from public.organization_memberships memberships
      where memberships.organization_id = organization_desk_call_logs.organization_id
        and memberships.user_id = auth.uid()
    )
  );

drop policy if exists "Members can insert desk call logs" on public.organization_desk_call_logs;
create policy "Members can insert desk call logs"
  on public.organization_desk_call_logs
  for insert
  to authenticated
  with check (
    public.is_atlas_super_admin()
    or exists (
      select 1
      from public.organization_memberships memberships
      where memberships.organization_id = organization_desk_call_logs.organization_id
        and memberships.user_id = auth.uid()
    )
  );

drop policy if exists "Atlas Admin can manage desk call logs" on public.organization_desk_call_logs;
create policy "Atlas Admin can manage desk call logs"
  on public.organization_desk_call_logs
  for all
  to authenticated
  using (public.is_atlas_super_admin())
  with check (public.is_atlas_super_admin());

revoke all on table public.organization_desk_call_logs from public, anon, authenticated;
grant select, insert, update, delete on table public.organization_desk_call_logs to authenticated;
grant select, insert, update, delete on table public.organization_desk_call_logs to service_role;

alter table public.organization_desk_settings
  add column if not exists daily_call_goal integer not null default 100
  check (daily_call_goal between 1 and 500);
