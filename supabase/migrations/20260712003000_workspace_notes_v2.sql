-- Atlas OS v2 - Workspace Notes v2
-- Allows members to create notes, lets authors update their own notes,
-- and records a no-cost @Atlas attention flag.

alter table public.organization_notes
add column if not exists attention_requested boolean not null default false;

drop policy if exists "Owners and admins can create organization notes" on public.organization_notes;
create policy "Members can create organization notes"
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
  )
);

drop policy if exists "Owners and admins can update organization notes" on public.organization_notes;
create policy "Owners admins and authors can update organization notes"
on public.organization_notes
for update
to authenticated
using (
  public.is_atlas_super_admin()
  or created_by = auth.uid()
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
  or created_by = auth.uid()
  or exists (
    select 1
    from public.organization_memberships memberships
    where memberships.organization_id = organization_notes.organization_id
      and memberships.user_id = auth.uid()
      and memberships.role in ('owner', 'admin')
  )
);

-- Delete remains intentionally omitted.
