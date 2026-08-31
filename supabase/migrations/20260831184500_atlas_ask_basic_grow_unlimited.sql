-- Talk to Atlas daily caps: BASIC 5, GROW 10, UNLIMITED uncapped.
-- Read the live Stripe entitlement when the workspace is linked; otherwise
-- fall back to organization_ai_plans, then BASIC.

create or replace function public.client_ai_plan_limit(p_plan_code text)
returns integer
language sql
immutable
set search_path = public, pg_temp
as $$
  select case lower(coalesce(p_plan_code, 'basic'))
    when 'basic' then 5
    when 'growth' then 10
    when 'grow' then 10
    when 'unlimited' then null
    else 5
  end;
$$;

create or replace function public.resolve_client_ai_plan_code(p_organization_id uuid)
returns text
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select coalesce(
    (
      select case e.plan_slug
        when 'grow' then 'growth'
        else e.plan_slug
      end
      from public.atlas_billing_entitlements e
      where e.organization_id = p_organization_id
        and e.provisioning_status = 'linked'
        and lower(e.status) in ('active', 'paid', 'trialing')
      order by e.updated_at desc
      limit 1
    ),
    (
      select plans.plan_code
      from public.organization_ai_plans plans
      where plans.organization_id = p_organization_id
    ),
    'basic'
  );
$$;

revoke all on function public.resolve_client_ai_plan_code(uuid) from public, anon, authenticated;

create or replace function public.get_client_ai_daily_usage(
  p_organization_id uuid
)
returns table (
  plan text,
  used integer,
  "limit" integer,
  remaining integer
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_plan text;
  v_limit integer;
  v_usage_date date := (now() at time zone 'America/Chicago')::date;
begin
  if auth.uid() is null or not (
    public.is_atlas_super_admin()
    or exists (
      select 1
      from public.organization_memberships memberships
      where memberships.organization_id = p_organization_id
        and memberships.user_id = auth.uid()
    )
  ) then
    raise exception 'Workspace access is required' using errcode = '42501';
  end if;

  if not exists (select 1 from public.organizations organizations where organizations.id = p_organization_id) then
    raise exception 'Organization was not found' using errcode = 'P0002';
  end if;

  v_plan := public.resolve_client_ai_plan_code(p_organization_id);
  v_limit := public.client_ai_plan_limit(v_plan);

  return query
  select
    v_plan,
    coalesce(usage.question_count, 0),
    v_limit,
    case when v_limit is null then null else greatest(v_limit - coalesce(usage.question_count, 0), 0) end
  from (select 1) seed
  left join public.organization_ai_daily_usage usage
    on usage.organization_id = p_organization_id
   and usage.usage_date = v_usage_date;
end;
$$;

create or replace function public.reserve_client_ai_daily_question(
  p_organization_id uuid
)
returns table (
  allowed boolean,
  plan text,
  used integer,
  "limit" integer,
  remaining integer
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_plan text;
  v_limit integer;
  v_used integer;
  v_usage_date date := (now() at time zone 'America/Chicago')::date;
begin
  if auth.uid() is null or not (
    public.is_atlas_super_admin()
    or exists (
      select 1
      from public.organization_memberships memberships
      where memberships.organization_id = p_organization_id
        and memberships.user_id = auth.uid()
    )
  ) then
    raise exception 'Workspace access is required' using errcode = '42501';
  end if;

  if not exists (select 1 from public.organizations organizations where organizations.id = p_organization_id) then
    raise exception 'Organization was not found' using errcode = 'P0002';
  end if;

  v_plan := public.resolve_client_ai_plan_code(p_organization_id);
  v_limit := public.client_ai_plan_limit(v_plan);
  perform pg_advisory_xact_lock(hashtextextended(p_organization_id::text || ':' || v_usage_date::text, 0));

  select usage.question_count
  into v_used
  from public.organization_ai_daily_usage usage
  where usage.organization_id = p_organization_id
    and usage.usage_date = v_usage_date;

  v_used := coalesce(v_used, 0);
  if v_limit is not null and v_used >= v_limit then
    return query select false, v_plan, v_used, v_limit, 0;
    return;
  end if;

  insert into public.organization_ai_daily_usage (
    organization_id,
    usage_date,
    question_count
  ) values (
    p_organization_id,
    v_usage_date,
    1
  )
  on conflict (organization_id, usage_date)
  do update set question_count = organization_ai_daily_usage.question_count + 1
  returning question_count into v_used;

  return query select
    true,
    v_plan,
    v_used,
    v_limit,
    case when v_limit is null then null else greatest(v_limit - v_used, 0) end;
end;
$$;
