-- AFE Stripe billing event ledger and pending entitlement registry.
-- The webhook uses service_role only; client users never receive these rows.

create table if not exists public.atlas_billing_events (
  id uuid primary key default gen_random_uuid(),
  stripe_event_id text not null unique,
  event_type text not null,
  status text not null default 'processing'
    check (status in ('processing', 'processed', 'unmapped', 'failed')),
  event_created_at timestamptz not null,
  processed_at timestamptz,
  error_message text,
  created_at timestamptz not null default now()
);

create table if not exists public.atlas_billing_entitlements (
  id uuid primary key default gen_random_uuid(),
  email text,
  stripe_customer_id text,
  stripe_subscription_id text unique,
  stripe_checkout_session_id text unique,
  stripe_price_id text,
  plan_slug text not null check (plan_slug in ('basic', 'grow', 'unlimited')),
  status text not null,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  provisioning_status text not null default 'pending'
    check (provisioning_status in ('pending', 'linked', 'suspended')),
  organization_id uuid references public.organizations(id) on delete set null,
  user_id uuid references auth.users(id) on delete set null,
  last_stripe_event_id text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists atlas_billing_entitlements_customer_idx
  on public.atlas_billing_entitlements(stripe_customer_id);
create index if not exists atlas_billing_entitlements_email_idx
  on public.atlas_billing_entitlements(lower(email));
create index if not exists atlas_billing_entitlements_status_idx
  on public.atlas_billing_entitlements(provisioning_status, created_at desc);

drop trigger if exists atlas_billing_entitlements_set_updated_at
  on public.atlas_billing_entitlements;
create trigger atlas_billing_entitlements_set_updated_at
before update on public.atlas_billing_entitlements
for each row execute function public.set_updated_at();

alter table public.atlas_billing_events enable row level security;
alter table public.atlas_billing_entitlements enable row level security;

revoke all on table public.atlas_billing_events from anon, authenticated;
revoke all on table public.atlas_billing_entitlements from anon, authenticated;
grant all on table public.atlas_billing_events to service_role;
grant all on table public.atlas_billing_entitlements to service_role;
