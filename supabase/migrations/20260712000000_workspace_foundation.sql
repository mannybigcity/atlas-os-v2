-- Atlas OS v2 - Minimal Workspace Data Foundation
-- Creates organizations, organization memberships, and read-safe RLS policies.

create extension if not exists pgcrypto;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'organization_membership_role') then
    create type public.organization_membership_role as enum ('owner', 'admin', 'member');
  end if;
end
$$;

create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.organization_memberships (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.organization_membership_role not null default 'member',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, user_id)
);

create index if not exists organization_memberships_user_id_idx
  on public.organization_memberships(user_id);

create index if not exists organization_memberships_organization_id_idx
  on public.organization_memberships(organization_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists organizations_set_updated_at on public.organizations;
create trigger organizations_set_updated_at
before update on public.organizations
for each row
execute function public.set_updated_at();

drop trigger if exists organization_memberships_set_updated_at on public.organization_memberships;
create trigger organization_memberships_set_updated_at
before update on public.organization_memberships
for each row
execute function public.set_updated_at();

create or replace function public.is_atlas_super_admin()
returns boolean
language sql
stable
as $$
  select lower(coalesce(auth.jwt() ->> 'email', '')) = 'info@atlasforentrepreneurs.com';
$$;

alter table public.organizations enable row level security;
alter table public.organization_memberships enable row level security;

drop policy if exists "Members can read their organizations" on public.organizations;
create policy "Members can read their organizations"
on public.organizations
for select
to authenticated
using (
  public.is_atlas_super_admin()
  or exists (
    select 1
    from public.organization_memberships memberships
    where memberships.organization_id = organizations.id
      and memberships.user_id = auth.uid()
  )
);

drop policy if exists "Members can read their memberships" on public.organization_memberships;
create policy "Members can read their memberships"
on public.organization_memberships
for select
to authenticated
using (
  public.is_atlas_super_admin()
  or user_id = auth.uid()
);

-- Insert/update/delete are intentionally omitted for this milestone.
-- Seed organizations and memberships manually in the Supabase SQL editor.
