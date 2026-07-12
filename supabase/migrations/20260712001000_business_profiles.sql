-- Atlas OS v2 - Organization Context v1
-- Adds one business profile per organization with RLS-scoped read/write access.

create table if not exists public.business_profiles (
  organization_id uuid primary key references public.organizations(id) on delete cascade,
  offer text,
  target_customer text,
  positioning text,
  current_goals text,
  constraints text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists business_profiles_set_updated_at on public.business_profiles;
create trigger business_profiles_set_updated_at
before update on public.business_profiles
for each row
execute function public.set_updated_at();

alter table public.business_profiles enable row level security;

drop policy if exists "Members can read their business profile" on public.business_profiles;
create policy "Members can read their business profile"
on public.business_profiles
for select
to authenticated
using (
  public.is_atlas_super_admin()
  or exists (
    select 1
    from public.organization_memberships memberships
    where memberships.organization_id = business_profiles.organization_id
      and memberships.user_id = auth.uid()
  )
);

drop policy if exists "Owners and admins can create their business profile" on public.business_profiles;
create policy "Owners and admins can create their business profile"
on public.business_profiles
for insert
to authenticated
with check (
  public.is_atlas_super_admin()
  or exists (
    select 1
    from public.organization_memberships memberships
    where memberships.organization_id = business_profiles.organization_id
      and memberships.user_id = auth.uid()
      and memberships.role in ('owner', 'admin')
  )
);

drop policy if exists "Owners and admins can update their business profile" on public.business_profiles;
create policy "Owners and admins can update their business profile"
on public.business_profiles
for update
to authenticated
using (
  public.is_atlas_super_admin()
  or exists (
    select 1
    from public.organization_memberships memberships
    where memberships.organization_id = business_profiles.organization_id
      and memberships.user_id = auth.uid()
      and memberships.role in ('owner', 'admin')
  )
)
with check (
  public.is_atlas_super_admin()
  or exists (
    select 1
    from public.organization_memberships memberships
    where memberships.organization_id = business_profiles.organization_id
      and memberships.user_id = auth.uid()
      and memberships.role in ('owner', 'admin')
  )
);

-- Delete is intentionally omitted for this milestone.
