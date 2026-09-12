-- Amanda outbound: owner-approved B2B email sequences to the referral partners
-- HUNTER finds (property managers, realtors, GCs). Nothing in these tables
-- sends until status = 'approved'; the scheduled function only reads
-- approved/sending rows. Replies come back through a Resend inbound address
-- carrying reply_token and pause the sequence.
create table if not exists public.organization_outreach_sequences (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  opportunity_id uuid not null references public.organization_opportunities (id) on delete cascade,
  channel text not null default 'email' check (channel in ('email')),
  steps jsonb not null default '[]'::jsonb,
  status text not null default 'draft'
    check (status in ('draft', 'approved', 'sending', 'paused', 'done')),
  current_step integer not null default 0 check (current_step >= 0),
  next_send_at timestamptz,
  to_email text not null check (length(btrim(to_email)) between 5 and 320 and position('@' in to_email) > 1),
  owner_email text check (owner_email is null or length(btrim(owner_email)) between 5 and 320),
  reply_token text not null unique default replace(gen_random_uuid()::text, '-', ''),
  approved_at timestamptz,
  approved_by uuid,
  stopped_reason text check (stopped_reason is null or stopped_reason in ('owner', 'replied', 'stop_request', 'stage', 'bounced')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (opportunity_id, channel)
);

create index if not exists organization_outreach_sequences_due_idx
  on public.organization_outreach_sequences (status, next_send_at);

create table if not exists public.organization_outreach_messages (
  id uuid primary key default gen_random_uuid(),
  sequence_id uuid not null references public.organization_outreach_sequences (id) on delete cascade,
  organization_id uuid not null references public.organizations (id) on delete cascade,
  opportunity_id uuid not null references public.organization_opportunities (id) on delete cascade,
  step integer not null check (step >= 0),
  direction text not null default 'outbound' check (direction in ('outbound', 'inbound')),
  to_email text,
  from_email text,
  subject text,
  body text,
  resend_id text,
  sent_at timestamptz,
  opened_at timestamptz,
  replied_at timestamptz,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists organization_outreach_messages_sequence_idx
  on public.organization_outreach_messages (sequence_id, step);
create unique index if not exists organization_outreach_messages_resend_id_idx
  on public.organization_outreach_messages (resend_id) where resend_id is not null;

alter table public.organization_outreach_sequences enable row level security;
alter table public.organization_outreach_messages enable row level security;

drop policy if exists "Members can read outreach sequences" on public.organization_outreach_sequences;
create policy "Members can read outreach sequences"
  on public.organization_outreach_sequences
  for select
  to authenticated
  using (
    public.is_atlas_super_admin()
    or exists (
      select 1
      from public.organization_memberships memberships
      where memberships.organization_id = organization_outreach_sequences.organization_id
        and memberships.user_id = auth.uid()
    )
  );

drop policy if exists "Members can write outreach sequences" on public.organization_outreach_sequences;
create policy "Members can write outreach sequences"
  on public.organization_outreach_sequences
  for all
  to authenticated
  using (
    public.is_atlas_super_admin()
    or exists (
      select 1
      from public.organization_memberships memberships
      where memberships.organization_id = organization_outreach_sequences.organization_id
        and memberships.user_id = auth.uid()
    )
  )
  with check (
    public.is_atlas_super_admin()
    or exists (
      select 1
      from public.organization_memberships memberships
      where memberships.organization_id = organization_outreach_sequences.organization_id
        and memberships.user_id = auth.uid()
    )
  );

drop policy if exists "Members can read outreach messages" on public.organization_outreach_messages;
create policy "Members can read outreach messages"
  on public.organization_outreach_messages
  for select
  to authenticated
  using (
    public.is_atlas_super_admin()
    or exists (
      select 1
      from public.organization_memberships memberships
      where memberships.organization_id = organization_outreach_messages.organization_id
        and memberships.user_id = auth.uid()
    )
  );

grant select, insert, update, delete on public.organization_outreach_sequences to authenticated, service_role;
grant select on public.organization_outreach_messages to authenticated;
grant select, insert, update, delete on public.organization_outreach_messages to service_role;
