-- Adult door-hanger paint-party operations for the SIS tenant.
-- This is private operational data only; it neither sends messages nor calls a payment provider.

create table if not exists public.organization_sis_party_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  lead_id uuid not null,
  stage text not null default 'new_inquiry' check (stage in (
    'new_inquiry', 'contact_within_24_hours', 'qualified', 'quote_sent',
    'deposit_pending', 'booked', 'prep_in_progress', 'party_complete',
    'diy_subscription_offered', 'won_follow_up'
  )),
  host_name text not null check (length(btrim(host_name)) between 2 and 220),
  preferred_contact_method text check (preferred_contact_method in ('phone', 'email', 'text')),
  party_type text check (party_type is null or length(btrim(party_type)) between 2 and 120),
  guest_count integer check (guest_count is null or guest_count between 1 and 500),
  preferred_date date,
  alternate_date date,
  party_starts_at timestamptz,
  address text check (address is null or length(address) <= 800),
  city text check (city is null or length(city) <= 180),
  venue_type text check (venue_type is null or length(venue_type) <= 120),
  door_hanger_theme text check (door_hanger_theme is null or length(door_hanger_theme) <= 500),
  setup_accessibility_notes text check (setup_accessibility_notes is null or length(setup_accessibility_notes) <= 5000),
  contact_consent boolean not null default false,
  quote_amount numeric(12,2) check (quote_amount is null or quote_amount >= 0),
  deposit_amount numeric(12,2) check (deposit_amount is null or deposit_amount >= 0),
  deposit_status text not null default 'unpaid' check (deposit_status in ('unpaid', 'pending', 'paid', 'failed', 'refunded')),
  total_due numeric(12,2) check (total_due is null or total_due >= 0),
  amount_paid numeric(12,2) not null default 0 check (amount_paid >= 0),
  payment_checkout_url text check (payment_checkout_url is null or length(payment_checkout_url) <= 2000),
  shopify_order_id text check (shopify_order_id is null or length(shopify_order_id) <= 240),
  paypal_subscription_id text check (paypal_subscription_id is null or length(paypal_subscription_id) <= 240),
  calendar_status text not null default 'not_scheduled' check (calendar_status in ('not_scheduled', 'tentative', 'confirmed', 'cancelled')),
  customer_confirmation_status text not null default 'not_sent' check (customer_confirmation_status in ('not_sent', 'pending', 'confirmed')),
  owner_user_id uuid references auth.users(id) on delete set null,
  next_action text check (next_action is null or length(btrim(next_action)) between 2 and 1200),
  next_action_due date,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, organization_id),
  foreign key (lead_id, organization_id) references public.organization_sis_leads(id, organization_id)
);

create index if not exists organization_sis_party_events_pipeline_idx
  on public.organization_sis_party_events(organization_id, stage, next_action_due);
create index if not exists organization_sis_party_events_calendar_idx
  on public.organization_sis_party_events(organization_id, party_starts_at)
  where party_starts_at is not null;

create table if not exists public.organization_sis_party_tasks (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  party_event_id uuid not null,
  title text not null check (length(btrim(title)) between 2 and 500),
  due_at timestamptz,
  status text not null default 'open' check (status in ('open', 'complete', 'cancelled')),
  kind text not null check (kind in ('first_contact', 'quote_follow_up', 'prep_14', 'prep_7', 'prep_2', 'day_of', 'post_party')),
  assigned_user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  unique (party_event_id, kind),
  foreign key (party_event_id, organization_id) references public.organization_sis_party_events(id, organization_id) on delete cascade
);

create index if not exists organization_sis_party_tasks_inbox_idx
  on public.organization_sis_party_tasks(organization_id, status, due_at)
  where status = 'open';

create or replace function public.enforce_sis_party_event_rules()
returns trigger language plpgsql set search_path = public as $$
begin
  if new.stage = 'booked' and new.deposit_status <> 'paid' then
    raise exception 'A party cannot be marked booked until its deposit is verified paid';
  end if;
  if new.stage not in ('party_complete', 'diy_subscription_offered', 'won_follow_up')
     and (new.owner_user_id is null or new.next_action_due is null or new.next_action is null) then
    raise exception 'Every open SIS party record requires an owner and future next action';
  end if;
  if new.stage not in ('party_complete', 'diy_subscription_offered', 'won_follow_up')
     and new.next_action_due < current_date then
    raise exception 'An open SIS party record requires a current or future next action date';
  end if;
  if new.owner_user_id is not null and not exists (
    select 1 from public.organization_memberships memberships
    where memberships.organization_id = new.organization_id
      and memberships.user_id = new.owner_user_id
  ) then
    raise exception 'Party owner must belong to the SIS organization';
  end if;
  if new.amount_paid > coalesce(new.total_due, new.amount_paid) then
    raise exception 'Amount paid cannot exceed total due';
  end if;
  return new;
end;
$$;

create or replace function public.queue_sis_party_tasks()
returns trigger language plpgsql set search_path = public as $$
begin
  if new.stage = 'new_inquiry' then
    insert into public.organization_sis_party_tasks (organization_id, party_event_id, title, due_at, kind, assigned_user_id)
    values (new.organization_id, new.id, 'Make first contact within 24 hours', new.created_at + interval '24 hours', 'first_contact', new.owner_user_id)
    on conflict (party_event_id, kind) do nothing;
  end if;
  if new.stage = 'quote_sent' then
    insert into public.organization_sis_party_tasks (organization_id, party_event_id, title, due_at, kind, assigned_user_id)
    values (new.organization_id, new.id, 'Follow up on paint-party quote', now() + interval '3 days', 'quote_follow_up', new.owner_user_id)
    on conflict (party_event_id, kind) do nothing;
  end if;
  if new.stage = 'booked' and new.party_starts_at is not null then
    insert into public.organization_sis_party_tasks (organization_id, party_event_id, title, due_at, kind, assigned_user_id) values
      (new.organization_id, new.id, 'Confirm paint-party prep and supplies', new.party_starts_at - interval '14 days', 'prep_14', new.owner_user_id),
      (new.organization_id, new.id, 'Confirm guest count and design choices', new.party_starts_at - interval '7 days', 'prep_7', new.owner_user_id),
      (new.organization_id, new.id, 'Final event confirmation and packing check', new.party_starts_at - interval '2 days', 'prep_2', new.owner_user_id),
      (new.organization_id, new.id, 'Run day-of event checklist', new.party_starts_at, 'day_of', new.owner_user_id)
    on conflict (party_event_id, kind) do nothing;
  end if;
  if new.stage = 'party_complete' then
    insert into public.organization_sis_party_tasks (organization_id, party_event_id, title, due_at, kind, assigned_user_id)
    values (new.organization_id, new.id, 'Offer DIY subscription, request review, and request referral', now() + interval '1 day', 'post_party', new.owner_user_id)
    on conflict (party_event_id, kind) do nothing;
  end if;
  return new;
end;
$$;

alter table public.organization_sis_party_events enable row level security;
alter table public.organization_sis_party_tasks enable row level security;
revoke all on public.organization_sis_party_events, public.organization_sis_party_tasks from public, anon;

create policy "SIS members can read party events" on public.organization_sis_party_events for select to authenticated
using (public.is_atlas_super_admin() or exists (select 1 from public.organization_memberships m where m.organization_id = organization_sis_party_events.organization_id and m.user_id = auth.uid()));
create policy "SIS managers can create party events" on public.organization_sis_party_events for insert to authenticated
with check (public.is_atlas_super_admin() or exists (select 1 from public.organization_memberships m where m.organization_id = organization_sis_party_events.organization_id and m.user_id = auth.uid() and m.role in ('owner','admin')));
create policy "SIS managers can update party events" on public.organization_sis_party_events for update to authenticated
using (public.is_atlas_super_admin() or exists (select 1 from public.organization_memberships m where m.organization_id = organization_sis_party_events.organization_id and m.user_id = auth.uid() and m.role in ('owner','admin')))
with check (public.is_atlas_super_admin() or exists (select 1 from public.organization_memberships m where m.organization_id = organization_sis_party_events.organization_id and m.user_id = auth.uid() and m.role in ('owner','admin')));
create policy "SIS members can read party tasks" on public.organization_sis_party_tasks for select to authenticated
using (public.is_atlas_super_admin() or exists (select 1 from public.organization_memberships m where m.organization_id = organization_sis_party_tasks.organization_id and m.user_id = auth.uid()));
create policy "SIS managers can manage party tasks" on public.organization_sis_party_tasks for all to authenticated
using (public.is_atlas_super_admin() or exists (select 1 from public.organization_memberships m where m.organization_id = organization_sis_party_tasks.organization_id and m.user_id = auth.uid() and m.role in ('owner','admin')))
with check (public.is_atlas_super_admin() or exists (select 1 from public.organization_memberships m where m.organization_id = organization_sis_party_tasks.organization_id and m.user_id = auth.uid() and m.role in ('owner','admin')));

create trigger organization_sis_party_events_set_updated_at before update on public.organization_sis_party_events for each row execute function public.set_updated_at();
create trigger organization_sis_party_events_prevent_org_reassignment before update on public.organization_sis_party_events for each row execute function public.prevent_sis_organization_reassignment();
create trigger organization_sis_party_events_rules before insert or update on public.organization_sis_party_events for each row execute function public.enforce_sis_party_event_rules();
create trigger organization_sis_party_events_tasks after insert or update on public.organization_sis_party_events for each row execute function public.queue_sis_party_tasks();
create trigger organization_sis_party_tasks_prevent_org_reassignment before update on public.organization_sis_party_tasks for each row execute function public.prevent_sis_organization_reassignment();
grant select, insert, update on public.organization_sis_party_events, public.organization_sis_party_tasks to authenticated;
