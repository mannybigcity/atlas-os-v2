-- Honest paid-checkout provisioning: allow failed entitlements and look up
-- an existing Auth user by email without exposing auth.users to the browser.

alter table public.atlas_billing_entitlements
  drop constraint if exists atlas_billing_entitlements_provisioning_status_check;

alter table public.atlas_billing_entitlements
  add constraint atlas_billing_entitlements_provisioning_status_check
  check (provisioning_status in ('pending', 'linked', 'suspended', 'failed'));

create or replace function public.find_auth_user_id_by_email(p_email text)
returns uuid
language sql
stable
security definer
set search_path = public, auth
as $$
  select users.id
  from auth.users users
  where lower(users.email) = lower(btrim(p_email))
  limit 1;
$$;

revoke all on function public.find_auth_user_id_by_email(text)
from public, anon, authenticated;
grant execute on function public.find_auth_user_id_by_email(text)
to service_role;
