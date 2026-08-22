-- Atlas OS v2 - Plan-aware, organization-scoped client AI daily quotas.
-- All daily boundaries use America/Chicago so client-facing usage resets at the
-- same time as the Atlas operating day.

create table if not exists public.organization_ai_plans (
  organization_id uuid primary key references public.organizations(id) on delete cascade,
  plan_code text not null default 'basic'
    check (plan_code in ('basic', 'growth', 'unlimited')),
  updated_at timestamptz not null default now()
);

create table if not exists public.organization_ai_daily_usage (
  organization_id uuid not null references public.organizations(id) on delete cascade,
  usage_date date not null,
  question_count integer not null default 0 check (question_count >= 0),
  primary key (organization_id, usage_date)
);

alter table public.organization_ai_plans enable row level security;
alter table public.organization_ai_daily_usage enable row level security;

revoke all on table public.organization_ai_plans from public, anon, authenticated;
revoke all on table public.organization_ai_daily_usage from public, anon, authenticated;

create or replace function public.client_ai_plan_limit(p_plan_code text)
returns integer
language sql
immutable
set search_path = public, pg_temp
as $$
  select case p_plan_code
    when 'basic' then 5
    when 'growth' then 20
    when 'unlimited' then null
    else 5
  end;
$$;

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

  select coalesce(plans.plan_code, 'basic')
  into v_plan
  from public.organizations organizations
  left join public.organization_ai_plans plans
    on plans.organization_id = organizations.id
  where organizations.id = p_organization_id;

  if v_plan is null then
    raise exception 'Organization was not found' using errcode = 'P0002';
  end if;

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

  select coalesce(plans.plan_code, 'basic')
  into v_plan
  from public.organizations organizations
  left join public.organization_ai_plans plans
    on plans.organization_id = organizations.id
  where organizations.id = p_organization_id;

  if v_plan is null then
    raise exception 'Organization was not found' using errcode = 'P0002';
  end if;

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

revoke all on function public.client_ai_plan_limit(text) from public, anon, authenticated;
revoke all on function public.get_client_ai_daily_usage(uuid) from public, anon;
revoke all on function public.reserve_client_ai_daily_question(uuid) from public, anon;
grant execute on function public.get_client_ai_daily_usage(uuid) to authenticated;
grant execute on function public.reserve_client_ai_daily_question(uuid) to authenticated;
