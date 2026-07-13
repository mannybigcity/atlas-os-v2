-- Atlas OS v2 - Founding Pilot Workflow v1
-- Adds organization-scoped 30-day plans, action items, deliverables, and
-- client reviews without introducing automated agents or external API spend.

create table if not exists public.organization_pilot_plans (
  organization_id uuid primary key references public.organizations(id) on delete cascade,
  thirty_day_goal text,
  success_definition text,
  next_check_in_at timestamptz,
  status text not null default 'active'
    check (status in ('active', 'paused', 'completed')),
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.organization_pilot_actions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  title text not null check (length(btrim(title)) > 0),
  description text,
  status text not null default 'not_started'
    check (status in ('not_started', 'in_progress', 'blocked', 'completed')),
  priority smallint not null default 1 check (priority between 1 and 3),
  owner_label text,
  due_date date,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists organization_pilot_actions_org_priority_idx
  on public.organization_pilot_actions(organization_id, priority, created_at);

create table if not exists public.organization_pilot_deliverables (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  title text not null check (length(btrim(title)) > 0),
  summary text,
  body text,
  status text not null default 'draft'
    check (status in ('draft', 'ready_for_review', 'delivered', 'archived')),
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists organization_pilot_deliverables_org_created_idx
  on public.organization_pilot_deliverables(organization_id, created_at desc);

create table if not exists public.organization_pilot_deliverable_reviews (
  deliverable_id uuid primary key
    references public.organization_pilot_deliverables(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  decision text not null check (decision in ('approved', 'changes_requested')),
  note text,
  reviewed_by uuid not null references auth.users(id) on delete restrict,
  reviewed_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists organization_pilot_reviews_org_idx
  on public.organization_pilot_deliverable_reviews(organization_id, reviewed_at desc);

drop trigger if exists organization_pilot_plans_set_updated_at
  on public.organization_pilot_plans;
create trigger organization_pilot_plans_set_updated_at
before update on public.organization_pilot_plans
for each row execute function public.set_updated_at();

drop trigger if exists organization_pilot_actions_set_updated_at
  on public.organization_pilot_actions;
create trigger organization_pilot_actions_set_updated_at
before update on public.organization_pilot_actions
for each row execute function public.set_updated_at();

drop trigger if exists organization_pilot_deliverables_set_updated_at
  on public.organization_pilot_deliverables;
create trigger organization_pilot_deliverables_set_updated_at
before update on public.organization_pilot_deliverables
for each row execute function public.set_updated_at();

drop trigger if exists organization_pilot_reviews_set_updated_at
  on public.organization_pilot_deliverable_reviews;
create trigger organization_pilot_reviews_set_updated_at
before update on public.organization_pilot_deliverable_reviews
for each row execute function public.set_updated_at();

alter table public.organization_pilot_plans enable row level security;
alter table public.organization_pilot_actions enable row level security;
alter table public.organization_pilot_deliverables enable row level security;
alter table public.organization_pilot_deliverable_reviews enable row level security;

drop policy if exists "Members can read pilot plans" on public.organization_pilot_plans;
create policy "Members can read pilot plans"
on public.organization_pilot_plans for select to authenticated
using (
  public.is_atlas_super_admin()
  or exists (
    select 1 from public.organization_memberships memberships
    where memberships.organization_id = organization_pilot_plans.organization_id
      and memberships.user_id = auth.uid()
  )
);

drop policy if exists "Atlas Admin can create pilot plans" on public.organization_pilot_plans;
create policy "Atlas Admin can create pilot plans"
on public.organization_pilot_plans for insert to authenticated
with check (public.is_atlas_super_admin());

drop policy if exists "Atlas Admin can update pilot plans" on public.organization_pilot_plans;
create policy "Atlas Admin can update pilot plans"
on public.organization_pilot_plans for update to authenticated
using (public.is_atlas_super_admin())
with check (public.is_atlas_super_admin());

drop policy if exists "Members can read pilot actions" on public.organization_pilot_actions;
create policy "Members can read pilot actions"
on public.organization_pilot_actions for select to authenticated
using (
  public.is_atlas_super_admin()
  or exists (
    select 1 from public.organization_memberships memberships
    where memberships.organization_id = organization_pilot_actions.organization_id
      and memberships.user_id = auth.uid()
  )
);

drop policy if exists "Atlas Admin can create pilot actions" on public.organization_pilot_actions;
create policy "Atlas Admin can create pilot actions"
on public.organization_pilot_actions for insert to authenticated
with check (public.is_atlas_super_admin());

drop policy if exists "Atlas Admin can update pilot actions" on public.organization_pilot_actions;
create policy "Atlas Admin can update pilot actions"
on public.organization_pilot_actions for update to authenticated
using (public.is_atlas_super_admin())
with check (public.is_atlas_super_admin());

drop policy if exists "Members can read pilot deliverables" on public.organization_pilot_deliverables;
create policy "Members can read pilot deliverables"
on public.organization_pilot_deliverables for select to authenticated
using (
  public.is_atlas_super_admin()
  or (
    organization_pilot_deliverables.status in ('ready_for_review', 'delivered')
    and exists (
      select 1 from public.organization_memberships memberships
      where memberships.organization_id = organization_pilot_deliverables.organization_id
        and memberships.user_id = auth.uid()
    )
  )
);

drop policy if exists "Atlas Admin can create pilot deliverables" on public.organization_pilot_deliverables;
create policy "Atlas Admin can create pilot deliverables"
on public.organization_pilot_deliverables for insert to authenticated
with check (public.is_atlas_super_admin());

drop policy if exists "Atlas Admin can update pilot deliverables" on public.organization_pilot_deliverables;
create policy "Atlas Admin can update pilot deliverables"
on public.organization_pilot_deliverables for update to authenticated
using (public.is_atlas_super_admin())
with check (public.is_atlas_super_admin());

drop policy if exists "Members can read deliverable reviews"
  on public.organization_pilot_deliverable_reviews;
create policy "Members can read deliverable reviews"
on public.organization_pilot_deliverable_reviews for select to authenticated
using (
  public.is_atlas_super_admin()
  or (
    exists (
      select 1 from public.organization_memberships memberships
      where memberships.organization_id = organization_pilot_deliverable_reviews.organization_id
        and memberships.user_id = auth.uid()
    )
    and exists (
      select 1 from public.organization_pilot_deliverables deliverables
      where deliverables.id = organization_pilot_deliverable_reviews.deliverable_id
        and deliverables.organization_id = organization_pilot_deliverable_reviews.organization_id
        and deliverables.status in ('ready_for_review', 'delivered')
    )
  )
);

drop policy if exists "Owners and admins can create deliverable reviews"
  on public.organization_pilot_deliverable_reviews;
create policy "Owners and admins can create deliverable reviews"
on public.organization_pilot_deliverable_reviews for insert to authenticated
with check (
  reviewed_by = auth.uid()
  and exists (
    select 1 from public.organization_memberships memberships
    where memberships.organization_id = organization_pilot_deliverable_reviews.organization_id
      and memberships.user_id = auth.uid()
      and memberships.role in ('owner', 'admin')
  )
  and exists (
    select 1 from public.organization_pilot_deliverables deliverables
    where deliverables.id = organization_pilot_deliverable_reviews.deliverable_id
      and deliverables.organization_id = organization_pilot_deliverable_reviews.organization_id
      and deliverables.status = 'ready_for_review'
  )
);

drop policy if exists "Owners and admins can update deliverable reviews"
  on public.organization_pilot_deliverable_reviews;
create policy "Owners and admins can update deliverable reviews"
on public.organization_pilot_deliverable_reviews for update to authenticated
using (
  exists (
    select 1 from public.organization_memberships memberships
    where memberships.organization_id = organization_pilot_deliverable_reviews.organization_id
      and memberships.user_id = auth.uid()
      and memberships.role in ('owner', 'admin')
  )
)
with check (
  reviewed_by = auth.uid()
  and exists (
    select 1 from public.organization_memberships memberships
    where memberships.organization_id = organization_pilot_deliverable_reviews.organization_id
      and memberships.user_id = auth.uid()
      and memberships.role in ('owner', 'admin')
  )
  and exists (
    select 1 from public.organization_pilot_deliverables deliverables
    where deliverables.id = organization_pilot_deliverable_reviews.deliverable_id
      and deliverables.organization_id = organization_pilot_deliverable_reviews.organization_id
      and deliverables.status = 'ready_for_review'
  )
);

-- Delete policies are intentionally omitted. Pilot history is preserved.
