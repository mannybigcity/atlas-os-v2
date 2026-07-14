-- Atlas OS v2 - Tenant isolation hardening
-- Prevents organization-scoped records from being reassigned across clients
-- and makes parent/child organization relationships database-enforced.

-- Notes must always remain in the organization where they were created, and
-- the original author identity must remain trustworthy.
create or replace function public.prevent_organization_note_reassignment()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.organization_id is distinct from old.organization_id then
    raise exception 'A note cannot be moved to another organization';
  end if;

  if new.created_by is distinct from old.created_by then
    raise exception 'A note author cannot be changed';
  end if;

  return new;
end;
$$;

drop trigger if exists organization_notes_prevent_reassignment
  on public.organization_notes;
create trigger organization_notes_prevent_reassignment
before update on public.organization_notes
for each row execute function public.prevent_organization_note_reassignment();

-- A client-created note must record the signed-in user as its author.
drop policy if exists "Members can create organization notes"
  on public.organization_notes;
create policy "Members can create organization notes"
on public.organization_notes
for insert
to authenticated
with check (
  public.is_atlas_super_admin()
  or (
    created_by = auth.uid()
    and exists (
      select 1
      from public.organization_memberships memberships
      where memberships.organization_id = organization_notes.organization_id
        and memberships.user_id = auth.uid()
    )
  )
);

-- Authors may edit only while they still belong to the note's organization.
-- Owners and admins retain organization-wide editing access.
drop policy if exists "Owners admins and authors can update organization notes"
  on public.organization_notes;
create policy "Owners admins and authors can update organization notes"
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
      and (
        organization_notes.created_by = auth.uid()
        or memberships.role in ('owner', 'admin')
      )
  )
)
with check (
  public.is_atlas_super_admin()
  or exists (
    select 1
    from public.organization_memberships memberships
    where memberships.organization_id = organization_notes.organization_id
      and memberships.user_id = auth.uid()
      and (
        organization_notes.created_by = auth.uid()
        or memberships.role in ('owner', 'admin')
      )
  )
);

-- The thread creator is intentionally available only to signed-in users and
-- continues to run as SECURITY INVOKER, so all RLS policies apply.
revoke execute on function public.create_note_thread(uuid, text, text)
from public, anon;
grant execute on function public.create_note_thread(uuid, text, text)
to authenticated;

-- Trigger-only protection must not be exposed as a public RPC.
revoke execute on function public.prevent_organization_note_reassignment()
from public, anon, authenticated;

-- Add composite parent keys so a child row cannot reference a parent record
-- from one organization while claiming a different organization_id.
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'organization_notes_id_organization_key'
      and conrelid = 'public.organization_notes'::regclass
  ) then
    alter table public.organization_notes
      add constraint organization_notes_id_organization_key
      unique (id, organization_id);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'note_messages_note_organization_fkey'
      and conrelid = 'public.note_messages'::regclass
  ) then
    alter table public.note_messages
      add constraint note_messages_note_organization_fkey
      foreign key (note_id, organization_id)
      references public.organization_notes(id, organization_id)
      on delete cascade;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'attention_requests_note_organization_fkey'
      and conrelid = 'public.attention_requests'::regclass
  ) then
    alter table public.attention_requests
      add constraint attention_requests_note_organization_fkey
      foreign key (note_id, organization_id)
      references public.organization_notes(id, organization_id)
      on delete cascade;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'pilot_deliverables_id_organization_key'
      and conrelid = 'public.organization_pilot_deliverables'::regclass
  ) then
    alter table public.organization_pilot_deliverables
      add constraint pilot_deliverables_id_organization_key
      unique (id, organization_id);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'pilot_reviews_work_organization_fkey'
      and conrelid = 'public.organization_pilot_deliverable_reviews'::regclass
  ) then
    alter table public.organization_pilot_deliverable_reviews
      add constraint pilot_reviews_work_organization_fkey
      foreign key (deliverable_id, organization_id)
      references public.organization_pilot_deliverables(id, organization_id)
      on delete cascade;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'pilot_work_messages_work_organization_fkey'
      and conrelid = 'public.organization_pilot_work_messages'::regclass
  ) then
    alter table public.organization_pilot_work_messages
      add constraint pilot_work_messages_work_organization_fkey
      foreign key (deliverable_id, organization_id)
      references public.organization_pilot_deliverables(id, organization_id)
      on delete cascade;
  end if;
end
$$;
