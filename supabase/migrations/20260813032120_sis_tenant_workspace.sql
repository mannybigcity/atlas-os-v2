-- SIS Custom Creations tenant workspace foundation.
--
-- This migration is intentionally schema-only. It does not seed the SIS
-- organization, create Auth users, migrate legacy JSON, or expose anonymous
-- writes. Public SIS intake must use a server-mediated endpoint with the
-- service-role client after the organization is confirmed.

create table if not exists public.organization_sis_customers (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  display_name text not null check (length(btrim(display_name)) between 2 and 220),
  business_name text check (
    business_name is null or length(btrim(business_name)) between 2 and 220
  ),
  email text check (
    email is null or (
      length(btrim(email)) between 5 and 320
      and position('@' in email) > 1
    )
  ),
  phone text check (phone is null or length(btrim(phone)) between 7 and 80),
  notes text check (notes is null or length(notes) <= 5000),
  source_label text check (
    source_label is null or length(btrim(source_label)) between 2 and 180
  ),
  metadata jsonb not null default '{}'::jsonb
    check (jsonb_typeof(metadata) = 'object'),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, organization_id)
);

create index if not exists organization_sis_customers_org_name_idx
  on public.organization_sis_customers(organization_id, display_name);

create index if not exists organization_sis_customers_org_email_idx
  on public.organization_sis_customers(organization_id, lower(email))
  where email is not null;

create table if not exists public.organization_sis_leads (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  customer_id uuid,
  status text not null default 'new'
    check (status in (
      'new', 'qualified', 'quoted', 'won', 'lost', 'archived'
    )),
  offer text not null check (length(btrim(offer)) between 2 and 220),
  source_label text check (
    source_label is null or length(btrim(source_label)) between 2 and 180
  ),
  details text check (details is null or length(details) <= 10000),
  due_date date,
  next_action text check (next_action is null or length(next_action) <= 1200),
  next_action_due date,
  owner_user_id uuid references auth.users(id) on delete set null,
  source_request_id text check (
    source_request_id is null or length(btrim(source_request_id)) between 8 and 180
  ),
  raw_payload jsonb not null default '{}'::jsonb
    check (jsonb_typeof(raw_payload) = 'object'),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, organization_id),
  foreign key (customer_id, organization_id)
    references public.organization_sis_customers(id, organization_id)
);

create unique index if not exists organization_sis_leads_org_request_idx
  on public.organization_sis_leads(organization_id, source_request_id)
  where source_request_id is not null;

create index if not exists organization_sis_leads_org_status_idx
  on public.organization_sis_leads(organization_id, status, next_action_due);

create table if not exists public.organization_sis_quotes (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  customer_id uuid not null,
  lead_id uuid,
  quote_number text not null check (length(btrim(quote_number)) between 2 and 80),
  status text not null default 'draft'
    check (status in ('draft', 'sent', 'approved', 'declined', 'expired', 'converted')),
  currency text not null default 'USD'
    check (currency = upper(currency) and length(currency) = 3),
  subtotal numeric(12, 2) not null default 0 check (subtotal >= 0),
  tax numeric(12, 2) not null default 0 check (tax >= 0),
  total numeric(12, 2) not null default 0 check (total >= 0),
  expires_at timestamptz,
  approved_at timestamptz,
  approved_by uuid references auth.users(id) on delete set null,
  notes text check (notes is null or length(notes) <= 10000),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, quote_number),
  unique (id, organization_id),
  foreign key (customer_id, organization_id)
    references public.organization_sis_customers(id, organization_id),
  foreign key (lead_id, organization_id)
    references public.organization_sis_leads(id, organization_id)
);

create index if not exists organization_sis_quotes_org_status_idx
  on public.organization_sis_quotes(organization_id, status, created_at desc);

create table if not exists public.organization_sis_quote_items (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  quote_id uuid not null,
  description text not null check (length(btrim(description)) between 2 and 500),
  quantity numeric(12, 2) not null check (quantity > 0),
  unit_price numeric(12, 2) not null check (unit_price >= 0),
  line_total numeric(12, 2) not null check (line_total >= 0),
  metadata jsonb not null default '{}'::jsonb
    check (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz not null default now(),
  foreign key (quote_id, organization_id)
    references public.organization_sis_quotes(id, organization_id)
    on delete cascade
);

create index if not exists organization_sis_quote_items_quote_idx
  on public.organization_sis_quote_items(organization_id, quote_id);

create table if not exists public.organization_sis_orders (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  customer_id uuid not null,
  quote_id uuid,
  order_number text not null check (length(btrim(order_number)) between 2 and 80),
  status text not null default 'awaiting_payment'
    check (status in (
      'draft', 'awaiting_payment', 'paid', 'artwork_review',
      'production_ready', 'in_production', 'fulfilled', 'cancelled'
    )),
  payment_status text not null default 'unpaid'
    check (payment_status in ('unpaid', 'pending', 'paid', 'refunded', 'failed')),
  currency text not null default 'USD'
    check (currency = upper(currency) and length(currency) = 3),
  subtotal numeric(12, 2) not null default 0 check (subtotal >= 0),
  tax numeric(12, 2) not null default 0 check (tax >= 0),
  total numeric(12, 2) not null default 0 check (total >= 0),
  due_date date,
  artwork_approved_at timestamptz,
  artwork_approved_by uuid references auth.users(id) on delete set null,
  paid_at timestamptz,
  notes text check (notes is null or length(notes) <= 10000),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, order_number),
  unique (id, organization_id),
  foreign key (customer_id, organization_id)
    references public.organization_sis_customers(id, organization_id),
  foreign key (quote_id, organization_id)
    references public.organization_sis_quotes(id, organization_id)
);

create index if not exists organization_sis_orders_org_status_idx
  on public.organization_sis_orders(organization_id, status, created_at desc);

create table if not exists public.organization_sis_order_items (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  order_id uuid not null,
  description text not null check (length(btrim(description)) between 2 and 500),
  quantity numeric(12, 2) not null check (quantity > 0),
  unit_price numeric(12, 2) not null check (unit_price >= 0),
  line_total numeric(12, 2) not null check (line_total >= 0),
  metadata jsonb not null default '{}'::jsonb
    check (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz not null default now(),
  foreign key (order_id, organization_id)
    references public.organization_sis_orders(id, organization_id)
    on delete cascade
);

create index if not exists organization_sis_order_items_order_idx
  on public.organization_sis_order_items(organization_id, order_id);

create table if not exists public.organization_sis_payments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  order_id uuid not null,
  provider text not null check (length(btrim(provider)) between 2 and 80),
  provider_payment_id text,
  status text not null default 'pending'
    check (status in ('pending', 'paid', 'failed', 'refunded', 'partially_refunded')),
  amount numeric(12, 2) not null check (amount >= 0),
  currency text not null default 'USD'
    check (currency = upper(currency) and length(currency) = 3),
  captured_at timestamptz,
  provider_payload jsonb not null default '{}'::jsonb
    check (jsonb_typeof(provider_payload) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (provider, provider_payment_id),
  foreign key (order_id, organization_id)
    references public.organization_sis_orders(id, organization_id)
    on delete cascade
);

create index if not exists organization_sis_payments_order_idx
  on public.organization_sis_payments(organization_id, order_id, created_at desc);

create table if not exists public.organization_sis_fulfillment_jobs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  order_id uuid not null,
  status text not null default 'locked_pending_payment'
    check (status in (
      'locked_pending_payment', 'ready_for_production', 'in_production',
      'shipped', 'fulfilled', 'held', 'cancelled'
    )),
  provider text,
  tracking_number text,
  tracking_url text,
  hold_reason text,
  released_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (order_id),
  foreign key (order_id, organization_id)
    references public.organization_sis_orders(id, organization_id)
    on delete cascade
);

create index if not exists organization_sis_fulfillment_jobs_org_status_idx
  on public.organization_sis_fulfillment_jobs(organization_id, status, updated_at desc);

create table if not exists public.organization_sis_activity_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  entity_type text not null check (length(btrim(entity_type)) between 2 and 80),
  entity_id uuid,
  event_type text not null check (length(btrim(event_type)) between 2 and 120),
  actor_user_id uuid references auth.users(id) on delete set null,
  summary text not null check (length(btrim(summary)) between 2 and 500),
  payload jsonb not null default '{}'::jsonb
    check (jsonb_typeof(payload) = 'object'),
  created_at timestamptz not null default now()
);

create index if not exists organization_sis_activity_events_org_created_idx
  on public.organization_sis_activity_events(organization_id, created_at desc, id);

create or replace function public.prevent_sis_organization_reassignment()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.organization_id is distinct from old.organization_id then
    raise exception 'A SIS record cannot be moved to another organization';
  end if;
  return new;
end;
$$;

create or replace function public.prevent_sis_client_payment_mutation()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if auth.uid() is not null and (
    new.payment_status is distinct from old.payment_status
    or new.paid_at is distinct from old.paid_at
  ) then
    raise exception 'Payment state is server-managed';
  end if;
  return new;
end;
$$;

create or replace function public.enforce_sis_fulfillment_release_gate()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  order_record public.organization_sis_orders;
begin
  if new.status in ('ready_for_production', 'in_production', 'shipped', 'fulfilled') then
    select * into order_record
    from public.organization_sis_orders
    where id = new.order_id
      and organization_id = new.organization_id;

    if order_record.payment_status <> 'paid' or order_record.artwork_approved_at is null then
      raise exception 'Production release requires verified payment and approved artwork';
    end if;
  end if;
  return new;
end;
$$;

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'organization_sis_customers', 'organization_sis_leads', 'organization_sis_quotes', 'organization_sis_orders',
    'organization_sis_payments', 'organization_sis_fulfillment_jobs'
  ] loop
    execute format('drop trigger if exists %I_set_updated_at on public.%I', table_name, table_name);
    execute format(
      'create trigger %I_set_updated_at before update on public.%I for each row execute function public.set_updated_at()',
      table_name, table_name
    );

    execute format('drop trigger if exists %I_prevent_org_reassignment on public.%I', table_name, table_name);
    execute format(
      'create trigger %I_prevent_org_reassignment before update on public.%I for each row execute function public.prevent_sis_organization_reassignment()',
      table_name, table_name
    );
  end loop;
end
$$;

drop trigger if exists organization_sis_orders_protect_payment_state on public.organization_sis_orders;
create trigger organization_sis_orders_protect_payment_state
before update on public.organization_sis_orders
for each row execute function public.prevent_sis_client_payment_mutation();

drop trigger if exists sis_fulfillment_release_gate on public.organization_sis_fulfillment_jobs;
create trigger sis_fulfillment_release_gate
before insert or update on public.organization_sis_fulfillment_jobs
for each row execute function public.enforce_sis_fulfillment_release_gate();

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'organization_sis_customers', 'organization_sis_leads', 'organization_sis_quotes', 'organization_sis_quote_items',
    'organization_sis_orders', 'organization_sis_order_items', 'organization_sis_payments',
    'organization_sis_fulfillment_jobs', 'organization_sis_activity_events'
  ] loop
    execute format('alter table public.%I enable row level security', table_name);
    execute format('revoke all on table public.%I from public, anon, authenticated', table_name);
  end loop;
end
$$;

-- All private SIS records are readable only by an Atlas super-admin or a
-- member of the owning organization.
drop policy if exists "SIS members can read customers" on public.organization_sis_customers;
create policy "SIS members can read customers"
on public.organization_sis_customers for select to authenticated
using (
  public.is_atlas_super_admin()
  or exists (
    select 1 from public.organization_memberships memberships
    where memberships.organization_id = organization_sis_customers.organization_id
      and memberships.user_id = auth.uid()
  )
);

drop policy if exists "SIS members can create customers" on public.organization_sis_customers;
create policy "SIS members can create customers"
on public.organization_sis_customers for insert to authenticated
with check (
  public.is_atlas_super_admin()
  or exists (
    select 1 from public.organization_memberships memberships
    where memberships.organization_id = organization_sis_customers.organization_id
      and memberships.user_id = auth.uid()
  )
);

drop policy if exists "SIS members can update customers" on public.organization_sis_customers;
create policy "SIS members can update customers"
on public.organization_sis_customers for update to authenticated
using (
  public.is_atlas_super_admin()
  or exists (
    select 1 from public.organization_memberships memberships
    where memberships.organization_id = organization_sis_customers.organization_id
      and memberships.user_id = auth.uid()
  )
)
with check (
  public.is_atlas_super_admin()
  or exists (
    select 1 from public.organization_memberships memberships
    where memberships.organization_id = organization_sis_customers.organization_id
      and memberships.user_id = auth.uid()
  )
);

drop policy if exists "SIS members can read leads" on public.organization_sis_leads;
create policy "SIS members can read leads"
on public.organization_sis_leads for select to authenticated
using (
  public.is_atlas_super_admin()
  or exists (
    select 1 from public.organization_memberships memberships
    where memberships.organization_id = organization_sis_leads.organization_id
      and memberships.user_id = auth.uid()
  )
);

drop policy if exists "SIS members can create leads" on public.organization_sis_leads;
create policy "SIS members can create leads"
on public.organization_sis_leads for insert to authenticated
with check (
  public.is_atlas_super_admin()
  or exists (
    select 1 from public.organization_memberships memberships
    where memberships.organization_id = organization_sis_leads.organization_id
      and memberships.user_id = auth.uid()
  )
);

drop policy if exists "SIS members can update leads" on public.organization_sis_leads;
create policy "SIS members can update leads"
on public.organization_sis_leads for update to authenticated
using (
  public.is_atlas_super_admin()
  or exists (
    select 1 from public.organization_memberships memberships
    where memberships.organization_id = organization_sis_leads.organization_id
      and memberships.user_id = auth.uid()
  )
)
with check (
  public.is_atlas_super_admin()
  or exists (
    select 1 from public.organization_memberships memberships
    where memberships.organization_id = organization_sis_leads.organization_id
      and memberships.user_id = auth.uid()
  )
);

-- Quotes and orders are operational records. Only owners/admins (or Atlas
-- super-admins) may change them; all organization members may read them.
do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'organization_sis_quotes', 'organization_sis_quote_items', 'organization_sis_orders', 'organization_sis_order_items'
  ] loop
    execute format(
      'drop policy if exists %I on public.%I',
      format('SIS members can read %s', table_name), table_name
    );
    execute format(
      'drop policy if exists %I on public.%I',
      format('SIS managers can manage %s', table_name), table_name
    );
    execute format(
      'create policy %I on public.%I for select to authenticated using (public.is_atlas_super_admin() or exists (select 1 from public.organization_memberships memberships where memberships.organization_id = %I.organization_id and memberships.user_id = auth.uid()))',
      format('SIS members can read %s', table_name), table_name, table_name
    );
    execute format(
      'create policy %I on public.%I for all to authenticated using (public.is_atlas_super_admin() or exists (select 1 from public.organization_memberships memberships where memberships.organization_id = %I.organization_id and memberships.user_id = auth.uid() and memberships.role in (''owner'', ''admin''))) with check (public.is_atlas_super_admin() or exists (select 1 from public.organization_memberships memberships where memberships.organization_id = %I.organization_id and memberships.user_id = auth.uid() and memberships.role in (''owner'', ''admin'')))',
      format('SIS managers can manage %s', table_name), table_name, table_name, table_name
    );
  end loop;
end
$$;

drop policy if exists "SIS members can read payments" on public.organization_sis_payments;
create policy "SIS members can read payments"
on public.organization_sis_payments for select to authenticated
using (
  public.is_atlas_super_admin()
  or exists (
    select 1 from public.organization_memberships memberships
    where memberships.organization_id = organization_sis_payments.organization_id
      and memberships.user_id = auth.uid()
  )
);

drop policy if exists "SIS members can read fulfillment jobs" on public.organization_sis_fulfillment_jobs;
create policy "SIS members can read fulfillment jobs"
on public.organization_sis_fulfillment_jobs for select to authenticated
using (
  public.is_atlas_super_admin()
  or exists (
    select 1 from public.organization_memberships memberships
    where memberships.organization_id = organization_sis_fulfillment_jobs.organization_id
      and memberships.user_id = auth.uid()
  )
);

drop policy if exists "SIS managers can manage fulfillment jobs" on public.organization_sis_fulfillment_jobs;
create policy "SIS managers can manage fulfillment jobs"
on public.organization_sis_fulfillment_jobs for all to authenticated
using (
  public.is_atlas_super_admin()
  or exists (
    select 1 from public.organization_memberships memberships
    where memberships.organization_id = organization_sis_fulfillment_jobs.organization_id
      and memberships.user_id = auth.uid()
      and memberships.role in ('owner', 'admin')
  )
)
with check (
  public.is_atlas_super_admin()
  or exists (
    select 1 from public.organization_memberships memberships
    where memberships.organization_id = organization_sis_fulfillment_jobs.organization_id
      and memberships.user_id = auth.uid()
      and memberships.role in ('owner', 'admin')
  )
);

drop policy if exists "SIS members can read activity events" on public.organization_sis_activity_events;
create policy "SIS members can read activity events"
on public.organization_sis_activity_events for select to authenticated
using (
  public.is_atlas_super_admin()
  or exists (
    select 1 from public.organization_memberships memberships
    where memberships.organization_id = organization_sis_activity_events.organization_id
      and memberships.user_id = auth.uid()
  )
);

grant select, insert, update on table public.organization_sis_customers, public.organization_sis_leads
to authenticated;

grant select, insert, update on table
  public.organization_sis_quotes, public.organization_sis_quote_items,
  public.organization_sis_orders, public.organization_sis_order_items,
  public.organization_sis_fulfillment_jobs
to authenticated;

grant select on table public.organization_sis_payments, public.organization_sis_activity_events
to authenticated;

revoke execute on function public.prevent_sis_organization_reassignment()
from public, anon, authenticated;
revoke execute on function public.prevent_sis_client_payment_mutation()
from public, anon, authenticated;
revoke execute on function public.enforce_sis_fulfillment_release_gate()
from public, anon, authenticated;

