-- AFE Engine: night loop for Atlas founder sales CRM (atlas_sales_prospects).
-- Additive. No outbound send. organization_id is optional because the
-- founder sales table is not tenant-scoped.

create table if not exists public.engine_runs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations (id) on delete cascade,
  source text not null default 'atlas_sales'
    check (source in ('atlas_sales', 'organization')),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  status text not null default 'running'
    check (status in ('running', 'succeeded', 'partial', 'failed')),
  stale_count integer not null default 0,
  draft_count integer not null default 0,
  notes text,
  error text
);

create table if not exists public.engine_drafts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations (id) on delete cascade,
  engine_run_id uuid references public.engine_runs (id) on delete set null,
  prospect_id uuid references public.atlas_sales_prospects (id) on delete set null,
  kind text not null check (kind in ('follow_up', 'content', 'next_action', 'alert')),
  title text not null,
  body text not null,
  channel text check (channel in ('email', 'sms', 'call', 'phone', 'dm', 'in_person', 'social', 'none')),
  status text not null default 'needs_approval'
    check (status in ('needs_approval', 'approved', 'edited', 'rejected', 'sent_manually')),
  reason text,
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid
);

create table if not exists public.morning_briefs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations (id) on delete cascade,
  engine_run_id uuid references public.engine_runs (id) on delete set null,
  brief_date date not null,
  subject text not null,
  body_md text not null,
  body_html text,
  emailed_at timestamptz,
  created_at timestamptz not null default now()
);

create unique index if not exists morning_briefs_founder_date_uidx
  on public.morning_briefs (brief_date)
  where organization_id is null;

create unique index if not exists morning_briefs_org_date_uidx
  on public.morning_briefs (organization_id, brief_date)
  where organization_id is not null;

create index if not exists engine_runs_started_idx
  on public.engine_runs (started_at desc);
create index if not exists engine_drafts_status_idx
  on public.engine_drafts (status, created_at desc);

alter table public.engine_runs enable row level security;
alter table public.engine_drafts enable row level security;
alter table public.morning_briefs enable row level security;

drop policy if exists engine_runs_admin_all on public.engine_runs;
create policy engine_runs_admin_all on public.engine_runs
  for all to authenticated
  using (public.is_atlas_super_admin())
  with check (public.is_atlas_super_admin());

drop policy if exists engine_drafts_admin_all on public.engine_drafts;
create policy engine_drafts_admin_all on public.engine_drafts
  for all to authenticated
  using (public.is_atlas_super_admin())
  with check (public.is_atlas_super_admin());

drop policy if exists morning_briefs_admin_all on public.morning_briefs;
create policy morning_briefs_admin_all on public.morning_briefs
  for all to authenticated
  using (public.is_atlas_super_admin())
  with check (public.is_atlas_super_admin());

grant select, insert, update on table public.engine_runs to authenticated;
grant select, insert, update on table public.engine_drafts to authenticated;
grant select, insert, update on table public.morning_briefs to authenticated;
