-- Ask Atlas: allow the Amanda client-closer role on organization AI requests.

do $$
begin
  if to_regclass('public.organization_ai_requests') is null then
    return;
  end if;

  alter table public.organization_ai_requests
    drop constraint if exists organization_ai_requests_role_check;

  alter table public.organization_ai_requests
    add constraint organization_ai_requests_role_check
    check (role in ('atlas', 'hunter', 'micah', 'david', 'amanda'));

  alter table public.organization_ai_requests
    drop constraint if exists organization_ai_requests_routed_to_check;

  alter table public.organization_ai_requests
    add constraint organization_ai_requests_routed_to_check
    check (routed_to is null or routed_to in ('atlas', 'hunter', 'micah', 'david', 'amanda'));
end;
$$;
