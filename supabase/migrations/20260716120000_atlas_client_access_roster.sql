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

-- Attach an existing Supabase Auth user to a client organization without
-- exposing auth.users to the browser or requiring hand-written membership SQL.
create or replace function public.assign_atlas_client_membership(
  p_email text,
  p_organization_id uuid,
  p_role text default 'member'
)
returns uuid
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_user_id uuid;
begin
  if auth.uid() is null or not public.is_atlas_super_admin() then
    raise exception 'Atlas Super Admin access is required'
      using errcode = '42501';
  end if;

  if p_email is null or btrim(p_email) = '' then
    raise exception 'Client email is required'
      using errcode = '22023';
  end if;

  if p_role not in ('owner', 'admin', 'member') then
    raise exception 'Invalid organization membership role'
      using errcode = '22023';
  end if;

  if not exists (
    select 1 from public.organizations where id = p_organization_id
  ) then
    raise exception 'Organization was not found'
      using errcode = 'P0002';
  end if;

  select users.id
  into v_user_id
  from auth.users users
  where lower(users.email) = lower(btrim(p_email))
  limit 1;

  if v_user_id is null then
    raise exception 'Supabase Auth user was not found'
      using errcode = 'P0002';
  end if;

  insert into public.organization_memberships (
    organization_id,
    user_id,
    role
  ) values (
    p_organization_id,
    v_user_id,
    p_role::public.organization_membership_role
  )
  on conflict (organization_id, user_id)
  do update set role = excluded.role;

  return v_user_id;
end;
$$;

revoke all on function public.assign_atlas_client_membership(text, uuid, text)
from public, anon;
grant execute on function public.assign_atlas_client_membership(text, uuid, text)
to authenticated;
