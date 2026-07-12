-- Atlas OS v2 - Super Admin Attention Inbox v1
-- Centralizes @Atlas note requests for secure in-app triage.

create table if not exists public.attention_requests (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  note_id uuid not null references public.organization_notes(id) on delete cascade,
  requested_by uuid references auth.users(id) on delete set null,
  status text not null default 'open' check (status in ('open', 'acknowledged', 'resolved')),
  requested_at timestamptz not null default now(),
  acknowledged_at timestamptz,
  acknowledged_by uuid references auth.users(id) on delete set null,
  resolved_at timestamptz,
  resolved_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists attention_requests_status_requested_at_idx
  on public.attention_requests(status, requested_at desc);

create unique index if not exists attention_requests_one_active_per_note_idx
  on public.attention_requests(note_id)
  where status in ('open', 'acknowledged');

drop trigger if exists attention_requests_set_updated_at on public.attention_requests;
create trigger attention_requests_set_updated_at
before update on public.attention_requests
for each row
execute function public.set_updated_at();

alter table public.attention_requests enable row level security;

drop policy if exists "Super Admin can read attention requests" on public.attention_requests;
create policy "Super Admin can read attention requests"
on public.attention_requests
for select
to authenticated
using (public.is_atlas_super_admin());

drop policy if exists "Super Admin can update attention requests" on public.attention_requests;
create policy "Super Admin can update attention requests"
on public.attention_requests
for update
to authenticated
using (public.is_atlas_super_admin())
with check (public.is_atlas_super_admin());

-- Clients cannot query or write the inbox directly. This narrow trigger creates
-- and closes requests as the note's @Atlas flag changes.
create or replace function public.sync_note_attention_request()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' and new.attention_requested then
    insert into public.attention_requests (
      organization_id,
      note_id,
      requested_by,
      status,
      requested_at
    ) values (
      new.organization_id,
      new.id,
      new.created_by,
      'open',
      now()
    )
    on conflict do nothing;
  elsif tg_op = 'UPDATE' then
    if new.attention_requested and not old.attention_requested then
      insert into public.attention_requests (
        organization_id,
        note_id,
        requested_by,
        status,
        requested_at
      ) values (
        new.organization_id,
        new.id,
        auth.uid(),
        'open',
        now()
      )
      on conflict do nothing;
    elsif not new.attention_requested and old.attention_requested then
      update public.attention_requests
      set
        status = 'resolved',
        resolved_at = now(),
        resolved_by = auth.uid()
      where note_id = new.id
        and status in ('open', 'acknowledged');
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists organization_notes_sync_attention_request on public.organization_notes;
create trigger organization_notes_sync_attention_request
after insert or update of attention_requested on public.organization_notes
for each row
execute function public.sync_note_attention_request();

-- Backfill currently flagged notes so existing requests appear immediately.
insert into public.attention_requests (
  organization_id,
  note_id,
  requested_by,
  status,
  requested_at
)
select
  notes.organization_id,
  notes.id,
  notes.created_by,
  'open',
  notes.updated_at
from public.organization_notes notes
where notes.attention_requested
on conflict do nothing;

