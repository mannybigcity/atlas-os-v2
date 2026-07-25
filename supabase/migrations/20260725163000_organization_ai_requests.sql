-- Atlas OS v2 - Organization AI request log
-- Stores client-visible AI request history without exposing internal cost or
-- service credentials. Rows are append-only and scoped to one organization.

create table if not exists public.organization_ai_requests (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  requested_by uuid references auth.users(id) on delete set null,
  role text not null
    check (role in ('atlas', 'hunter', 'micah', 'david')),
  scope_status text not null default 'in_scope'
    check (scope_status in ('in_scope', 'needs_input', 'rerouted', 'declined')),
  status text not null default 'succeeded'
    check (status in ('succeeded', 'blocked', 'failed')),
  prompt text not null
    check (length(btrim(prompt)) between 1 and 2000),
  response text not null
    check (length(btrim(response)) between 1 and 5000),
  routed_to text
    check (routed_to is null or routed_to in ('atlas', 'hunter', 'micah', 'david')),
  created_at timestamptz not null default now()
);

create index if not exists organization_ai_requests_org_created_idx
  on public.organization_ai_requests(organization_id, created_at desc);

create index if not exists organization_ai_requests_org_role_created_idx
  on public.organization_ai_requests(organization_id, role, created_at desc);

alter table public.organization_ai_requests enable row level security;

drop policy if exists "Members can read organization AI requests"
  on public.organization_ai_requests;
create policy "Members can read organization AI requests"
on public.organization_ai_requests
for select
to authenticated
using (
  public.is_atlas_super_admin()
  or exists (
    select 1
    from public.organization_memberships memberships
    where memberships.organization_id = organization_ai_requests.organization_id
      and memberships.user_id = auth.uid()
  )
);

drop policy if exists "Members can create organization AI requests"
  on public.organization_ai_requests;
create policy "Members can create organization AI requests"
on public.organization_ai_requests
for insert
to authenticated
with check (
  requested_by = auth.uid()
  and exists (
    select 1
    from public.organization_memberships memberships
    where memberships.organization_id = organization_ai_requests.organization_id
      and memberships.user_id = auth.uid()
  )
);

revoke all on table public.organization_ai_requests
from public, anon, authenticated;

grant select, insert on table public.organization_ai_requests
to authenticated;

