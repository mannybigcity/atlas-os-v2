-- ATLAS operating foundation: organization-scoped work registry and truthful cash ledger.
-- Additive only. This migration intentionally creates no production records and does not
-- enable payment processing, provider webhooks, fulfillment, or external writes.

create table public.organization_projects (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 2 and 220),
  slug text check (slug is null or slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  description text check (description is null or char_length(description) <= 4000),
  status text not null default 'planned' check (status in ('planned', 'active', 'on_hold', 'completed', 'archived')),
  priority smallint not null default 2 check (priority between 1 and 3),
  owner_label text check (owner_label is null or char_length(owner_label) <= 160),
  source_type text not null default 'manual' check (source_type in ('manual', 'assessment', 'crm', 'obsidian', 'system')),
  source_reference text check (source_reference is null or char_length(source_reference) <= 500),
  starts_on date,
  target_date date,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (organization_id, name),
  unique (id, organization_id),
  check (target_date is null or starts_on is null or target_date >= starts_on)
);

create table public.organization_missions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  project_id uuid,
  title text not null check (char_length(trim(title)) between 2 and 220),
  objective text check (objective is null or char_length(objective) <= 4000),
  status text not null default 'planned' check (status in ('planned', 'ready', 'in_progress', 'blocked', 'completed', 'cancelled')),
  priority smallint not null default 2 check (priority between 1 and 3),
  owner_label text check (owner_label is null or char_length(owner_label) <= 160),
  source_type text not null default 'manual' check (source_type in ('manual', 'assessment', 'crm', 'obsidian', 'system')),
  source_reference text check (source_reference is null or char_length(source_reference) <= 500),
  due_date date,
  started_at timestamptz,
  completed_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (id, organization_id),
  constraint organization_missions_project_tenant_fk
    foreign key (project_id, organization_id)
    references public.organization_projects(id, organization_id)
    on delete set null,
  check (status <> 'completed' or completed_at is not null),
  check (status <> 'cancelled' or completed_at is null)
);

create table public.organization_project_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  project_id uuid not null,
  actor_user_id uuid references auth.users(id) on delete set null,
  event_type text not null check (event_type in ('created', 'updated')),
  summary text not null check (char_length(trim(summary)) between 1 and 500),
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  occurred_at timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now()),
  constraint organization_project_events_project_tenant_fk
    foreign key (project_id, organization_id)
    references public.organization_projects(id, organization_id)
    on delete cascade
);

create table public.organization_mission_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  mission_id uuid not null,
  actor_user_id uuid references auth.users(id) on delete set null,
  event_type text not null check (event_type in ('created', 'updated')),
  summary text not null check (char_length(trim(summary)) between 1 and 500),
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  occurred_at timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now()),
  constraint organization_mission_events_mission_tenant_fk
    foreign key (mission_id, organization_id)
    references public.organization_missions(id, organization_id)
    on delete cascade
);

create table public.organization_cash_entries (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  entry_direction text not null check (entry_direction in ('inflow', 'outflow')),
  payment_status text not null default 'unknown' check (payment_status in ('pending', 'authorized', 'settled', 'failed', 'refunded', 'voided', 'unknown')),
  verification_status text not null default 'unverified' check (verification_status in ('unverified', 'verified', 'rejected')),
  amount_minor bigint not null check (amount_minor > 0),
  currency text not null check (currency ~ '^[A-Z]{3}$'),
  source_type text not null default 'manual' check (source_type in ('manual', 'invoice', 'payment_provider', 'bank_statement', 'adjustment', 'other')),
  external_reference text check (external_reference is null or char_length(external_reference) <= 500),
  description text check (description is null or char_length(description) <= 1000),
  counterparty_label text check (counterparty_label is null or char_length(counterparty_label) <= 200),
  verification_source text check (verification_source is null or char_length(verification_source) <= 500),
  occurred_at timestamptz not null,
  cleared_at timestamptz,
  verified_at timestamptz,
  verified_by uuid references auth.users(id) on delete set null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  unique (id, organization_id),
  constraint organization_cash_entries_verified_fields_check check (
    (verification_status = 'verified' and verified_at is not null and verification_source is not null)
    or (verification_status <> 'verified' and verified_at is null and verified_by is null)
  ),
  constraint organization_cash_entries_settled_check check (
    payment_status not in ('settled', 'refunded') or verification_status = 'verified'
  ),
  constraint organization_cash_entries_cleared_at_check check (
    cleared_at is null or cleared_at >= occurred_at
  )
);

create table public.organization_cash_entry_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  cash_entry_id uuid not null,
  actor_user_id uuid references auth.users(id) on delete set null,
  event_type text not null check (event_type = 'created'),
  summary text not null check (char_length(trim(summary)) between 1 and 500),
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  occurred_at timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now()),
  constraint organization_cash_entry_events_tenant_fk
    foreign key (cash_entry_id, organization_id)
    references public.organization_cash_entries(id, organization_id)
    on delete cascade
);

create index organization_projects_org_status_idx on public.organization_projects (organization_id, status, priority, created_at desc);
create index organization_missions_org_status_idx on public.organization_missions (organization_id, status, priority, due_date, created_at desc);
create index organization_cash_entries_org_occurred_idx on public.organization_cash_entries (organization_id, occurred_at desc);
create index organization_cash_entries_org_verification_idx on public.organization_cash_entries (organization_id, verification_status, payment_status);
create index organization_project_events_org_occurred_idx on public.organization_project_events (organization_id, occurred_at desc);
create index organization_mission_events_org_occurred_idx on public.organization_mission_events (organization_id, occurred_at desc);
create index organization_cash_entry_events_org_occurred_idx on public.organization_cash_entry_events (organization_id, occurred_at desc);

create trigger organization_projects_set_updated_at
before update on public.organization_projects
for each row execute function public.set_updated_at();

create trigger organization_missions_set_updated_at
before update on public.organization_missions
for each row execute function public.set_updated_at();

create or replace function public.prevent_operations_organization_reassignment()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.organization_id is distinct from old.organization_id then
    raise exception 'An operations record cannot be moved to another organization';
  end if;

  if new.created_by is distinct from old.created_by then
    raise exception 'An operations record author cannot be changed';
  end if;

  return new;
end;
$$;

create trigger organization_projects_prevent_reassignment
before update on public.organization_projects
for each row execute function public.prevent_operations_organization_reassignment();

create trigger organization_missions_prevent_reassignment
before update on public.organization_missions
for each row execute function public.prevent_operations_organization_reassignment();

create or replace function public.record_organization_project_event()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.organization_project_events (
    organization_id, project_id, actor_user_id, event_type, summary, metadata
  ) values (
    new.organization_id,
    new.id,
    auth.uid(),
    case when tg_op = 'INSERT' then 'created' else 'updated' end,
    case when tg_op = 'INSERT' then 'Project created' else 'Project updated' end,
    jsonb_build_object('status', new.status, 'source_type', new.source_type)
  );
  return new;
end;
$$;

create or replace function public.record_organization_mission_event()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.organization_mission_events (
    organization_id, mission_id, actor_user_id, event_type, summary, metadata
  ) values (
    new.organization_id,
    new.id,
    auth.uid(),
    case when tg_op = 'INSERT' then 'created' else 'updated' end,
    case when tg_op = 'INSERT' then 'Mission created' else 'Mission updated' end,
    jsonb_build_object('status', new.status, 'source_type', new.source_type)
  );
  return new;
end;
$$;

create or replace function public.record_organization_cash_entry_event()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.organization_cash_entry_events (
    organization_id, cash_entry_id, actor_user_id, event_type, summary, metadata
  ) values (
    new.organization_id,
    new.id,
    auth.uid(),
    'created',
    'Cash ledger entry recorded',
    jsonb_build_object(
      'entry_direction', new.entry_direction,
      'payment_status', new.payment_status,
      'verification_status', new.verification_status,
      'amount_minor', new.amount_minor,
      'currency', new.currency,
      'source_type', new.source_type
    )
  );
  return new;
end;
$$;

create trigger organization_projects_record_event
after insert or update on public.organization_projects
for each row execute function public.record_organization_project_event();

create trigger organization_missions_record_event
after insert or update on public.organization_missions
for each row execute function public.record_organization_mission_event();

create trigger organization_cash_entries_record_event
after insert on public.organization_cash_entries
for each row execute function public.record_organization_cash_entry_event();

alter table public.organization_projects enable row level security;
alter table public.organization_missions enable row level security;
alter table public.organization_project_events enable row level security;
alter table public.organization_mission_events enable row level security;
alter table public.organization_cash_entries enable row level security;
alter table public.organization_cash_entry_events enable row level security;

create policy organization_projects_select on public.organization_projects
for select to authenticated
using (
  public.is_atlas_super_admin()
  or exists (
    select 1 from public.organization_memberships membership
    where membership.organization_id = organization_projects.organization_id
      and membership.user_id = auth.uid()
  )
);

create policy organization_projects_insert on public.organization_projects
for insert to authenticated
with check (
  created_by = auth.uid()
  and (
    public.is_atlas_super_admin()
    or exists (
      select 1 from public.organization_memberships membership
      where membership.organization_id = organization_projects.organization_id
        and membership.user_id = auth.uid()
        and membership.role in ('owner', 'admin')
    )
  )
);

create policy organization_projects_update on public.organization_projects
for update to authenticated
using (
  public.is_atlas_super_admin()
  or exists (
    select 1 from public.organization_memberships membership
    where membership.organization_id = organization_projects.organization_id
      and membership.user_id = auth.uid()
      and membership.role in ('owner', 'admin')
  )
)
with check (
  updated_by = auth.uid()
  and (
    public.is_atlas_super_admin()
    or exists (
      select 1 from public.organization_memberships membership
      where membership.organization_id = organization_projects.organization_id
        and membership.user_id = auth.uid()
        and membership.role in ('owner', 'admin')
    )
  )
);

create policy organization_missions_select on public.organization_missions
for select to authenticated
using (
  public.is_atlas_super_admin()
  or exists (
    select 1 from public.organization_memberships membership
    where membership.organization_id = organization_missions.organization_id
      and membership.user_id = auth.uid()
  )
);

create policy organization_missions_insert on public.organization_missions
for insert to authenticated
with check (
  created_by = auth.uid()
  and (
    public.is_atlas_super_admin()
    or exists (
      select 1 from public.organization_memberships membership
      where membership.organization_id = organization_missions.organization_id
        and membership.user_id = auth.uid()
        and membership.role in ('owner', 'admin')
    )
  )
);

create policy organization_missions_update on public.organization_missions
for update to authenticated
using (
  public.is_atlas_super_admin()
  or exists (
    select 1 from public.organization_memberships membership
    where membership.organization_id = organization_missions.organization_id
      and membership.user_id = auth.uid()
      and membership.role in ('owner', 'admin')
  )
)
with check (
  updated_by = auth.uid()
  and (
    public.is_atlas_super_admin()
    or exists (
      select 1 from public.organization_memberships membership
      where membership.organization_id = organization_missions.organization_id
        and membership.user_id = auth.uid()
        and membership.role in ('owner', 'admin')
    )
  )
);

create policy organization_project_events_select on public.organization_project_events
for select to authenticated
using (
  public.is_atlas_super_admin()
  or exists (
    select 1 from public.organization_memberships membership
    where membership.organization_id = organization_project_events.organization_id
      and membership.user_id = auth.uid()
  )
);

create policy organization_mission_events_select on public.organization_mission_events
for select to authenticated
using (
  public.is_atlas_super_admin()
  or exists (
    select 1 from public.organization_memberships membership
    where membership.organization_id = organization_mission_events.organization_id
      and membership.user_id = auth.uid()
  )
);

create policy organization_cash_entries_select on public.organization_cash_entries
for select to authenticated
using (
  public.is_atlas_super_admin()
  or exists (
    select 1 from public.organization_memberships membership
    where membership.organization_id = organization_cash_entries.organization_id
      and membership.user_id = auth.uid()
      and membership.role in ('owner', 'admin')
  )
);

create policy organization_cash_entries_insert on public.organization_cash_entries
for insert to authenticated
with check (
  created_by = auth.uid()
  and verification_status = 'unverified'
  and (
    public.is_atlas_super_admin()
    or exists (
      select 1 from public.organization_memberships membership
      where membership.organization_id = organization_cash_entries.organization_id
        and membership.user_id = auth.uid()
        and membership.role in ('owner', 'admin')
    )
  )
);

create policy organization_cash_entry_events_select on public.organization_cash_entry_events
for select to authenticated
using (
  public.is_atlas_super_admin()
  or exists (
    select 1 from public.organization_memberships membership
    where membership.organization_id = organization_cash_entry_events.organization_id
      and membership.user_id = auth.uid()
      and membership.role in ('owner', 'admin')
  )
);

revoke all on public.organization_projects from public, anon, authenticated;
revoke all on public.organization_missions from public, anon, authenticated;
revoke all on public.organization_project_events from public, anon, authenticated;
revoke all on public.organization_mission_events from public, anon, authenticated;
revoke all on public.organization_cash_entries from public, anon, authenticated;
revoke all on public.organization_cash_entry_events from public, anon, authenticated;

grant select on public.organization_projects to authenticated;
grant insert, update on public.organization_projects to authenticated;
grant select on public.organization_missions to authenticated;
grant insert, update on public.organization_missions to authenticated;
grant select on public.organization_project_events to authenticated;
grant select on public.organization_mission_events to authenticated;
grant select on public.organization_cash_entries to authenticated;
grant insert on public.organization_cash_entries to authenticated;
grant select on public.organization_cash_entry_events to authenticated;

revoke execute on function public.record_organization_project_event() from public, anon, authenticated;
revoke execute on function public.record_organization_mission_event() from public, anon, authenticated;
revoke execute on function public.record_organization_cash_entry_event() from public, anon, authenticated;
revoke execute on function public.prevent_operations_organization_reassignment() from public, anon, authenticated;
