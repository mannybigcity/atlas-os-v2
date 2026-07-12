-- Atlas OS v2 - Notes v1
-- Adds organization-scoped notes with RLS read/write access.

create table if not exists public.organization_notes (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  title text not null,
  body text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists organization_notes_organization_id_updated_at_idx
  on public.organization_notes(organization_id, updated_at desc);

drop trigger if exists organization_notes_set_updated_at on public.organization_notes;
create trigger organization_notes_set_updated_at
before update on public.organization_notes
for each row
execute function public.set_updated_at();

alter table public.organization_notes enable row level security;

drop policy if exists "Members can read organization notes" on public.organization_notes;
create policy "Members can read organization notes"
on public.organization_notes
for select
to authenticated
using (
  public.is_atlas_super_admin()
  or exists (
    select 1
    from public.organization_memberships memberships
    where memberships.organization_id = organization_notes.organization_id
      and memberships.user_id = auth.uid()
  )
);

drop policy if exists "Owners and admins can create organization notes" on public.organization_notes;
create policy "Owners and admins can create organization notes"
on public.organization_notes
for insert
to authenticated
with check (
  public.is_atlas_super_admin()
  or exists (
    select 1
    from public.organization_memberships memberships
    where memberships.organization_id = organization_notes.organization_id
      and memberships.user_id = auth.uid()
      and memberships.role in ('owner', 'admin')
  )
);

drop policy if exists "Owners and admins can update organization notes" on public.organization_notes;
create policy "Owners and admins can update organization notes"
on public.organization_notes
for update
to authenticated
using (
  public.is_atlas_super_admin()
  or exists (
    select 1
    from public.organization_memberships memberships
    where memberships.organization_id = organization_notes.organization_id
      and memberships.user_id = auth.uid()
      and memberships.role in ('owner', 'admin')
  )
)
with check (
  public.is_atlas_super_admin()
  or exists (
    select 1
    from public.organization_memberships memberships
    where memberships.organization_id = organization_notes.organization_id
      and memberships.user_id = auth.uid()
      and memberships.role in ('owner', 'admin')
  )
);

-- Delete is intentionally omitted for this milestone.
