-- Atlas OS v2 - Threaded Note Conversations v1
-- Converts note bodies into immutable, attributed, timestamped messages.

create table if not exists public.note_messages (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  note_id uuid not null references public.organization_notes(id) on delete cascade,
  author_user_id uuid references auth.users(id) on delete set null,
  author_kind text not null check (author_kind in ('client', 'atlas_admin')),
  author_display_name text not null,
  body text not null check (length(btrim(body)) > 0),
  attention_requested boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists note_messages_note_created_at_idx
  on public.note_messages(note_id, created_at asc);

create index if not exists note_messages_organization_created_at_idx
  on public.note_messages(organization_id, created_at desc);

alter table public.note_messages enable row level security;

drop policy if exists "Members can read note messages" on public.note_messages;
create policy "Members can read note messages"
on public.note_messages
for select
to authenticated
using (
  public.is_atlas_super_admin()
  or exists (
    select 1
    from public.organization_memberships memberships
    where memberships.organization_id = note_messages.organization_id
      and memberships.user_id = auth.uid()
  )
);

drop policy if exists "Members can create note messages" on public.note_messages;
create policy "Members can create note messages"
on public.note_messages
for insert
to authenticated
with check (
  author_user_id = auth.uid()
  and (
    public.is_atlas_super_admin()
    or exists (
      select 1
      from public.organization_memberships memberships
      where memberships.organization_id = note_messages.organization_id
        and memberships.user_id = auth.uid()
    )
  )
  and exists (
    select 1
    from public.organization_notes notes
    where notes.id = note_messages.note_id
      and notes.organization_id = note_messages.organization_id
  )
);

-- Existing note bodies become the first immutable message in each thread.
insert into public.note_messages (
  organization_id,
  note_id,
  author_user_id,
  author_kind,
  author_display_name,
  body,
  attention_requested,
  created_at
)
select
  notes.organization_id,
  notes.id,
  notes.created_by,
  case
    when lower(coalesce(users.email, '')) = 'info@atlasforentrepreneurs.com'
      then 'atlas_admin'
    else 'client'
  end,
  case
    when lower(coalesce(users.email, '')) = 'info@atlasforentrepreneurs.com'
      then 'Atlas Admin'
    else coalesce(
      nullif(users.raw_user_meta_data ->> 'display_name', ''),
      nullif(users.raw_user_meta_data ->> 'full_name', ''),
      nullif(split_part(coalesce(users.email, ''), '@', 1), ''),
      'Client member'
    )
  end,
  notes.body,
  notes.attention_requested,
  notes.created_at
from public.organization_notes notes
left join auth.users users on users.id = notes.created_by
where nullif(btrim(notes.body), '') is not null
  and not exists (
    select 1
    from public.note_messages messages
    where messages.note_id = notes.id
  );

create or replace function public.set_note_message_author()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  current_email text;
  current_display_name text;
begin
  new.author_user_id = auth.uid();

  select
    lower(coalesce(users.email, '')),
    nullif(btrim(coalesce(users.raw_user_meta_data ->> 'display_name', '')), '')
  into current_email, current_display_name
  from auth.users users
  where users.id = auth.uid();

  if current_email = 'info@atlasforentrepreneurs.com' then
    new.author_kind = 'atlas_admin';
    new.author_display_name = 'Atlas Admin';
  else
    new.author_kind = 'client';
    new.author_display_name = coalesce(
      case
        when lower(current_display_name) = 'atlas admin' then null
        else current_display_name
      end,
      nullif(split_part(current_email, '@', 1), ''),
      'Client member'
    );
  end if;

  return new;
end;
$$;

drop trigger if exists note_messages_set_author on public.note_messages;
create trigger note_messages_set_author
before insert on public.note_messages
for each row
execute function public.set_note_message_author();

create or replace function public.create_note_thread(
  p_organization_id uuid,
  p_title text,
  p_body text
)
returns uuid
language plpgsql
set search_path = public
as $$
declare
  new_note_id uuid;
begin
  insert into public.organization_notes (
    organization_id,
    title,
    body,
    created_by,
    attention_requested
  ) values (
    p_organization_id,
    btrim(p_title),
    null,
    auth.uid(),
    false
  )
  returning id into new_note_id;

  insert into public.note_messages (
    organization_id,
    note_id,
    author_user_id,
    author_kind,
    author_display_name,
    body,
    attention_requested
  ) values (
    p_organization_id,
    new_note_id,
    auth.uid(),
    'client',
    'Pending',
    btrim(p_body),
    position('@atlas' in lower(p_body)) > 0
  );

  return new_note_id;
end;
$$;

alter table public.activity_events
drop constraint if exists activity_events_event_type_check;

alter table public.activity_events
add constraint activity_events_event_type_check check (
  event_type in (
    'note.created',
    'note.updated',
    'note.message_created',
    'note.attention_requested',
    'business_profile.updated'
  )
);

create or replace function public.record_note_message_activity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.activity_events (
    organization_id,
    actor_user_id,
    event_type,
    title,
    entity_type,
    entity_id,
    metadata
  ) values (
    new.organization_id,
    new.author_user_id,
    'note.message_created',
    'A conversation reply was added',
    'note_message',
    new.id,
    jsonb_build_object(
      'note_id', new.note_id,
      'author_kind', new.author_kind,
      'attention_requested', new.attention_requested
    )
  );

  if new.attention_requested then
    update public.organization_notes
    set attention_requested = true
    where id = new.note_id
      and organization_id = new.organization_id
      and not attention_requested;
  end if;

  return new;
end;
$$;

drop trigger if exists note_messages_record_activity on public.note_messages;
create trigger note_messages_record_activity
after insert on public.note_messages
for each row
execute function public.record_note_message_activity();

-- Messages are intentionally immutable. No update or delete policies exist.
