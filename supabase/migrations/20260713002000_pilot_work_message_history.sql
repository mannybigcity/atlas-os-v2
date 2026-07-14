-- Atlas OS v2 - Permanent pilot work message history
-- Keeps an append-only, timestamped record of Atlas submissions and client
-- decisions while preserving the existing latest-review record for workflow state.

create table if not exists public.organization_pilot_work_messages (
  id uuid primary key default gen_random_uuid(),
  deliverable_id uuid not null
    references public.organization_pilot_deliverables(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  message_kind text not null
    check (message_kind in ('work_sent', 'approved', 'changes_requested')),
  message text,
  author_user_id uuid references auth.users(id) on delete set null,
  author_kind text not null check (author_kind in ('atlas_admin', 'client')),
  author_display_name text not null,
  created_at timestamptz not null default now()
);

create index if not exists organization_pilot_work_messages_deliverable_created_idx
  on public.organization_pilot_work_messages(deliverable_id, created_at, id);

create index if not exists organization_pilot_work_messages_org_created_idx
  on public.organization_pilot_work_messages(organization_id, created_at desc);

alter table public.organization_pilot_work_messages enable row level security;

drop policy if exists "Members can read pilot work messages"
  on public.organization_pilot_work_messages;
create policy "Members can read pilot work messages"
on public.organization_pilot_work_messages for select to authenticated
using (
  public.is_atlas_super_admin()
  or (
    exists (
      select 1 from public.organization_memberships memberships
      where memberships.organization_id = organization_pilot_work_messages.organization_id
        and memberships.user_id = auth.uid()
    )
    and exists (
      select 1 from public.organization_pilot_deliverables work
      where work.id = organization_pilot_work_messages.deliverable_id
        and work.organization_id = organization_pilot_work_messages.organization_id
        and work.status in ('ready_for_review', 'delivered')
    )
  )
);

drop policy if exists "Owners and admins can add pilot work responses"
  on public.organization_pilot_work_messages;
create policy "Owners and admins can add pilot work responses"
on public.organization_pilot_work_messages for insert to authenticated
with check (
  author_user_id = auth.uid()
  and author_kind = 'client'
  and message_kind in ('approved', 'changes_requested')
  and exists (
    select 1 from public.organization_memberships memberships
    where memberships.organization_id = organization_pilot_work_messages.organization_id
      and memberships.user_id = auth.uid()
      and memberships.role in ('owner', 'admin')
  )
  and exists (
    select 1 from public.organization_pilot_deliverables work
    where work.id = organization_pilot_work_messages.deliverable_id
      and work.organization_id = organization_pilot_work_messages.organization_id
      and work.status = 'ready_for_review'
  )
);

create or replace function public.set_pilot_work_message_author()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  current_email text;
  current_display_name text;
begin
  -- SQL migrations and trusted service operations have no signed-in Auth user.
  -- Preserve explicitly supplied historical identity and timestamps for them.
  if auth.uid() is null then
    return new;
  end if;

  new.author_user_id = auth.uid();

  select
    lower(coalesce(users.email, '')),
    coalesce(
      nullif(btrim(users.raw_user_meta_data ->> 'display_name'), ''),
      nullif(btrim(users.raw_user_meta_data ->> 'full_name'), ''),
      nullif(lower(btrim(users.email)), '')
    )
  into current_email, current_display_name
  from auth.users users
  where users.id = auth.uid();

  if new.message_kind = 'work_sent'
    or current_email = 'info@atlasforentrepreneurs.com' then
    new.author_kind = 'atlas_admin';
    new.author_display_name = 'Atlas Admin';
  else
    new.author_kind = 'client';
    new.author_display_name = coalesce(current_display_name, 'Client reviewer');
  end if;

  new.created_at = now();
  return new;
end;
$$;

drop trigger if exists organization_pilot_work_messages_set_author
  on public.organization_pilot_work_messages;
create trigger organization_pilot_work_messages_set_author
before insert on public.organization_pilot_work_messages
for each row execute function public.set_pilot_work_message_author();

-- Trigger-only function: never expose it as an RPC endpoint.
revoke execute on function public.set_pilot_work_message_author()
from public, anon, authenticated;

-- Preserve reviewable work that existed before append-only history.
insert into public.organization_pilot_work_messages (
  deliverable_id,
  organization_id,
  message_kind,
  message,
  author_user_id,
  author_kind,
  author_display_name,
  created_at
)
select
  work.id,
  work.organization_id,
  'work_sent',
  'Existing work record imported into message history.',
  work.updated_by,
  'atlas_admin',
  'Atlas Admin',
  work.updated_at
from public.organization_pilot_deliverables work
where work.status in ('ready_for_review', 'delivered')
  and not exists (
    select 1
    from public.organization_pilot_work_messages messages
    where messages.deliverable_id = work.id
      and messages.message_kind = 'work_sent'
  );

insert into public.organization_pilot_work_messages (
  deliverable_id,
  organization_id,
  message_kind,
  message,
  author_user_id,
  author_kind,
  author_display_name,
  created_at
)
select
  reviews.deliverable_id,
  reviews.organization_id,
  reviews.decision,
  reviews.note,
  reviews.reviewed_by,
  'client',
  reviews.reviewed_by_display_name,
  reviews.reviewed_at
from public.organization_pilot_deliverable_reviews reviews
where not exists (
  select 1
  from public.organization_pilot_work_messages messages
  where messages.deliverable_id = reviews.deliverable_id
    and messages.message_kind = reviews.decision
    and messages.created_at = reviews.reviewed_at
);

create or replace function public.record_pilot_work_sent()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  sent_message text;
begin
  if new.status <> 'ready_for_review' then
    return new;
  end if;

  if tg_op = 'INSERT' then
    sent_message = 'Atlas sent this work for your review.';
  else
    if old.status = 'ready_for_review'
      and old.title is not distinct from new.title
      and old.summary is not distinct from new.summary
      and old.body is not distinct from new.body then
      return new;
    end if;

    if old.status <> 'ready_for_review' then
      sent_message = 'Atlas sent this work for your review.';
    else
      sent_message = 'Atlas sent an updated version for your review.';
    end if;
  end if;

  insert into public.organization_pilot_work_messages (
    deliverable_id,
    organization_id,
    message_kind,
    message,
    author_user_id,
    author_kind,
    author_display_name
  ) values (
    new.id,
    new.organization_id,
    'work_sent',
    sent_message,
    auth.uid(),
    'atlas_admin',
    'Atlas Admin'
  );

  return new;
end;
$$;

drop trigger if exists organization_pilot_deliverables_record_work_sent
  on public.organization_pilot_deliverables;
create trigger organization_pilot_deliverables_record_work_sent
after insert or update of title, summary, body, status
on public.organization_pilot_deliverables
for each row execute function public.record_pilot_work_sent();

-- Trigger-only function: never expose it as an RPC endpoint.
revoke execute on function public.record_pilot_work_sent()
from public, anon, authenticated;

create or replace function public.submit_pilot_work_review(
  p_deliverable_id uuid,
  p_organization_id uuid,
  p_decision text,
  p_message text default null
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  if p_decision not in ('approved', 'changes_requested') then
    raise exception 'Invalid review decision';
  end if;

  insert into public.organization_pilot_work_messages (
    deliverable_id,
    organization_id,
    message_kind,
    message,
    author_user_id,
    author_kind,
    author_display_name
  ) values (
    p_deliverable_id,
    p_organization_id,
    p_decision,
    nullif(btrim(coalesce(p_message, '')), ''),
    auth.uid(),
    'client',
    'Client reviewer'
  );

  insert into public.organization_pilot_deliverable_reviews (
    deliverable_id,
    organization_id,
    decision,
    note,
    reviewed_by,
    reviewed_by_display_name,
    reviewed_at
  ) values (
    p_deliverable_id,
    p_organization_id,
    p_decision,
    nullif(btrim(coalesce(p_message, '')), ''),
    auth.uid(),
    'Client reviewer',
    now()
  )
  on conflict (deliverable_id) do update
  set
    decision = excluded.decision,
    note = excluded.note,
    reviewed_by = excluded.reviewed_by,
    reviewed_by_display_name = excluded.reviewed_by_display_name,
    reviewed_at = excluded.reviewed_at;
end;
$$;

revoke execute on function public.submit_pilot_work_review(uuid, uuid, text, text)
from public, anon;
grant execute on function public.submit_pilot_work_review(uuid, uuid, text, text)
to authenticated;

-- Work-message history is intentionally append-only. Update and delete
-- policies are omitted so decisions and timestamps cannot be rewritten.
