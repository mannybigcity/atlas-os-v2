-- Atlas OS v2 - Activity Events v1
-- Creates an organization-scoped, append-only activity timeline.

create table if not exists public.activity_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  actor_user_id uuid references auth.users(id) on delete set null,
  event_type text not null check (
    event_type in (
      'note.created',
      'note.updated',
      'note.attention_requested',
      'business_profile.updated'
    )
  ),
  title text not null,
  entity_type text,
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists activity_events_organization_occurred_at_idx
  on public.activity_events(organization_id, occurred_at desc);

alter table public.activity_events enable row level security;

drop policy if exists "Members can read organization activity" on public.activity_events;
create policy "Members can read organization activity"
on public.activity_events
for select
to authenticated
using (
  public.is_atlas_super_admin()
  or exists (
    select 1
    from public.organization_memberships memberships
    where memberships.organization_id = activity_events.organization_id
      and memberships.user_id = auth.uid()
  )
);

-- Activity is append-only and written by narrow database triggers. No client
-- insert, update, or delete policies are intentionally created.

create or replace function public.record_note_activity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
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
      auth.uid(),
      'note.created',
      'A workspace note was created',
      'organization_note',
      new.id,
      jsonb_build_object('attention_requested', new.attention_requested)
    );

    if new.attention_requested then
      insert into public.activity_events (
        organization_id,
        actor_user_id,
        event_type,
        title,
        entity_type,
        entity_id
      ) values (
        new.organization_id,
        auth.uid(),
        'note.attention_requested',
        'Atlas attention was requested on a note',
        'organization_note',
        new.id
      );
    end if;
  elsif tg_op = 'UPDATE' then
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
      auth.uid(),
      'note.updated',
      'A workspace note was updated',
      'organization_note',
      new.id,
      jsonb_build_object('attention_requested', new.attention_requested)
    );

    if new.attention_requested and not old.attention_requested then
      insert into public.activity_events (
        organization_id,
        actor_user_id,
        event_type,
        title,
        entity_type,
        entity_id
      ) values (
        new.organization_id,
        auth.uid(),
        'note.attention_requested',
        'Atlas attention was requested on a note',
        'organization_note',
        new.id
      );
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists organization_notes_record_activity on public.organization_notes;
create trigger organization_notes_record_activity
after insert or update on public.organization_notes
for each row
execute function public.record_note_activity();

create or replace function public.record_business_profile_activity()
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
    entity_id
  ) values (
    new.organization_id,
    auth.uid(),
    'business_profile.updated',
    'The business profile was updated',
    'business_profile',
    new.organization_id
  );

  return new;
end;
$$;

drop trigger if exists business_profiles_record_activity on public.business_profiles;
create trigger business_profiles_record_activity
after insert or update on public.business_profiles
for each row
execute function public.record_business_profile_activity();

