-- Atlas OS v2 - Super Admin client access roster
-- Lets Atlas verify organization membership before sending a client access email.

create or replace function public.get_atlas_client_access_roster()
returns table (
  organization_id uuid,
  organization_name text,
  organization_slug text,
  membership_role text,
  user_id uuid,
  email text,
  email_confirmed_at timestamptz,
  last_sign_in_at timestamptz
)
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if auth.uid() is null or not public.is_atlas_super_admin() then
    raise exception 'Atlas Super Admin access is required'
      using errcode = '42501';
  end if;

  return query
  select
    organizations.id,
    organizations.name,
    organizations.slug,
    memberships.role::text,
    users.id,
    lower(users.email)::text,
    users.email_confirmed_at,
    users.last_sign_in_at
  from public.organization_memberships memberships
  join public.organizations organizations
    on organizations.id = memberships.organization_id
  join auth.users users
    on users.id = memberships.user_id
  order by organizations.name, lower(users.email);
end;
$$;

revoke all on function public.get_atlas_client_access_roster()
from public, anon;
grant execute on function public.get_atlas_client_access_roster()
to authenticated;

