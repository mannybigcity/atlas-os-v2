-- Read-only Stripe bookkeeping for an Atlas workspace.
-- OAuth tokens live in stripe_bookkeeping_secrets. That table has no policies
-- for anon or authenticated, so the browser client cannot read tokens.
-- Disconnect hard-deletes the connection row and cascades workspace Stripe data.

create table public.stripe_bookkeeping_connections (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null unique references public.organizations(id) on delete cascade,
  stripe_account_id text not null check (stripe_account_id ~ '^acct_[A-Za-z0-9]+$'),
  livemode boolean not null,
  status text not null default 'active' check (status in ('active', 'error')),
  backfill_months integer not null default 24 check (backfill_months between 12 and 24),
  backfill_created_gte timestamptz not null,
  balance_cursor text,
  balance_backfill_complete boolean not null default false,
  invoice_cursor text,
  invoice_backfill_complete boolean not null default false,
  last_synced_at timestamptz,
  last_sync_error text check (last_sync_error is null or char_length(last_sync_error) <= 300),
  installed_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (stripe_account_id)
);

create table public.stripe_bookkeeping_secrets (
  connection_id uuid primary key references public.stripe_bookkeeping_connections(id) on delete cascade,
  access_token_ciphertext text not null check (char_length(access_token_ciphertext) between 20 and 4000),
  refresh_token_ciphertext text not null check (char_length(refresh_token_ciphertext) between 20 and 4000),
  token_expires_at timestamptz not null,
  refresh_expires_at timestamptz not null,
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.stripe_bookkeeping_oauth_states (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  state_hash text not null unique check (state_hash ~ '^[a-f0-9]{64}$'),
  expires_at timestamptz not null,
  consumed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now())
);

create index stripe_bookkeeping_oauth_states_user_idx
  on public.stripe_bookkeeping_oauth_states (user_id, expires_at);

create table public.stripe_bookkeeping_transactions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  connection_id uuid not null references public.stripe_bookkeeping_connections(id) on delete cascade,
  stripe_object_id text not null check (char_length(stripe_object_id) between 3 and 255),
  record_type text not null check (record_type in ('charge', 'refund', 'fee', 'payout', 'invoice', 'adjustment', 'other')),
  stripe_type text not null check (char_length(stripe_type) between 1 and 80),
  category text not null check (category in ('sales', 'refunds', 'fees', 'payouts', 'uncategorized')),
  description text not null default '' check (char_length(description) <= 1000),
  amount_minor bigint not null,
  fee_minor bigint not null default 0,
  net_minor bigint not null,
  currency text not null check (currency ~ '^[A-Z]{3}$'),
  customer_stripe_id text check (customer_stripe_id is null or char_length(customer_stripe_id) <= 255),
  customer_name text not null default '' check (char_length(customer_name) <= 200),
  customer_email text not null default '' check (char_length(customer_email) <= 320),
  invoice_id text not null default '' check (char_length(invoice_id) <= 255),
  status text not null default '' check (char_length(status) <= 40),
  occurred_at timestamptz not null,
  counts_in_cash_totals boolean not null,
  livemode boolean not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (organization_id, stripe_object_id)
);

create index stripe_bookkeeping_transactions_filter_idx
  on public.stripe_bookkeeping_transactions (organization_id, occurred_at desc, category);

create index stripe_bookkeeping_transactions_customer_idx
  on public.stripe_bookkeeping_transactions (organization_id, customer_stripe_id);

create table public.stripe_bookkeeping_category_rules (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  connection_id uuid references public.stripe_bookkeeping_connections(id) on delete cascade,
  priority integer not null check (priority between 1 and 1000),
  enabled boolean not null default true,
  match_field text not null check (match_field in ('stripe_type', 'description', 'record_type')),
  match_operator text not null check (match_operator in ('equals', 'contains')),
  match_value text not null check (char_length(trim(match_value)) between 1 and 200),
  category text not null check (category in ('sales', 'refunds', 'fees', 'payouts', 'uncategorized')),
  is_default boolean not null default false,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index stripe_bookkeeping_category_rules_org_idx
  on public.stripe_bookkeeping_category_rules (organization_id, priority);

create table public.stripe_bookkeeping_webhook_receipts (
  event_id text primary key check (event_id ~ '^evt_[A-Za-z0-9]+$'),
  organization_id uuid references public.organizations(id) on delete cascade,
  event_type text not null check (char_length(event_type) between 1 and 120),
  processed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now())
);

create or replace function public.prevent_stripe_bookkeeping_reassignment()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.organization_id is distinct from old.organization_id then
    raise exception 'Stripe bookkeeping records cannot move between workspaces';
  end if;
  return new;
end;
$$;

create trigger stripe_bookkeeping_connections_set_updated_at
before update on public.stripe_bookkeeping_connections
for each row execute function public.set_updated_at();

create trigger stripe_bookkeeping_secrets_set_updated_at
before update on public.stripe_bookkeeping_secrets
for each row execute function public.set_updated_at();

create trigger stripe_bookkeeping_transactions_set_updated_at
before update on public.stripe_bookkeeping_transactions
for each row execute function public.set_updated_at();

create trigger stripe_bookkeeping_category_rules_set_updated_at
before update on public.stripe_bookkeeping_category_rules
for each row execute function public.set_updated_at();

create trigger stripe_bookkeeping_connections_lock_org
before update on public.stripe_bookkeeping_connections
for each row execute function public.prevent_stripe_bookkeeping_reassignment();

create trigger stripe_bookkeeping_transactions_lock_org
before update on public.stripe_bookkeeping_transactions
for each row execute function public.prevent_stripe_bookkeeping_reassignment();

create trigger stripe_bookkeeping_category_rules_lock_org
before update on public.stripe_bookkeeping_category_rules
for each row execute function public.prevent_stripe_bookkeeping_reassignment();

alter table public.stripe_bookkeeping_connections enable row level security;
alter table public.stripe_bookkeeping_secrets enable row level security;
alter table public.stripe_bookkeeping_oauth_states enable row level security;
alter table public.stripe_bookkeeping_transactions enable row level security;
alter table public.stripe_bookkeeping_category_rules enable row level security;
alter table public.stripe_bookkeeping_webhook_receipts enable row level security;

create policy stripe_bookkeeping_connections_select
on public.stripe_bookkeeping_connections
for select to authenticated
using (
  public.is_atlas_super_admin()
  or exists (
    select 1 from public.organization_memberships membership
    where membership.organization_id = stripe_bookkeeping_connections.organization_id
      and membership.user_id = auth.uid()
  )
);

create policy stripe_bookkeeping_transactions_select
on public.stripe_bookkeeping_transactions
for select to authenticated
using (
  public.is_atlas_super_admin()
  or exists (
    select 1 from public.organization_memberships membership
    where membership.organization_id = stripe_bookkeeping_transactions.organization_id
      and membership.user_id = auth.uid()
  )
);

create policy stripe_bookkeeping_category_rules_select
on public.stripe_bookkeeping_category_rules
for select to authenticated
using (
  public.is_atlas_super_admin()
  or exists (
    select 1 from public.organization_memberships membership
    where membership.organization_id = stripe_bookkeeping_category_rules.organization_id
      and membership.user_id = auth.uid()
  )
);

create policy stripe_bookkeeping_category_rules_insert
on public.stripe_bookkeeping_category_rules
for insert to authenticated
with check (
  created_by = auth.uid()
  and exists (
    select 1 from public.organization_memberships membership
    where membership.organization_id = stripe_bookkeeping_category_rules.organization_id
      and membership.user_id = auth.uid()
      and membership.role in ('owner', 'admin')
  )
);

create policy stripe_bookkeeping_category_rules_update
on public.stripe_bookkeeping_category_rules
for update to authenticated
using (
  exists (
    select 1 from public.organization_memberships membership
    where membership.organization_id = stripe_bookkeeping_category_rules.organization_id
      and membership.user_id = auth.uid()
      and membership.role in ('owner', 'admin')
  )
)
with check (
  exists (
    select 1 from public.organization_memberships membership
    where membership.organization_id = stripe_bookkeeping_category_rules.organization_id
      and membership.user_id = auth.uid()
      and membership.role in ('owner', 'admin')
  )
);

create policy stripe_bookkeeping_category_rules_delete
on public.stripe_bookkeeping_category_rules
for delete to authenticated
using (
  exists (
    select 1 from public.organization_memberships membership
    where membership.organization_id = stripe_bookkeeping_category_rules.organization_id
      and membership.user_id = auth.uid()
      and membership.role in ('owner', 'admin')
  )
);

revoke all on public.stripe_bookkeeping_connections from public, anon, authenticated;
revoke all on public.stripe_bookkeeping_secrets from public, anon, authenticated;
revoke all on public.stripe_bookkeeping_oauth_states from public, anon, authenticated;
revoke all on public.stripe_bookkeeping_transactions from public, anon, authenticated;
revoke all on public.stripe_bookkeeping_category_rules from public, anon, authenticated;
revoke all on public.stripe_bookkeeping_webhook_receipts from public, anon, authenticated;

grant select on public.stripe_bookkeeping_connections to authenticated;
grant select on public.stripe_bookkeeping_transactions to authenticated;
grant select, insert, update, delete on public.stripe_bookkeeping_category_rules to authenticated;

revoke execute on function public.prevent_stripe_bookkeeping_reassignment()
from public, anon, authenticated;
