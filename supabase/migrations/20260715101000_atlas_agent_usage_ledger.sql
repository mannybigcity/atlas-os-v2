-- Atlas OS v2 - Private agent workflow and API usage ledger
-- Keeps provider use, token counts, result counts, and cost estimates visible.
-- Rows are append-only; corrections are represented by a later run record.

create table if not exists public.atlas_agent_runs (
  id uuid primary key default gen_random_uuid(),
  prospect_id uuid references public.atlas_sales_prospects(id) on delete restrict,
  organization_id uuid references public.organizations(id) on delete restrict,
  role text not null
    check (role in ('atlas', 'hunter', 'micah', 'david')),
  workflow text not null
    check (length(btrim(workflow)) between 2 and 150),
  provider text not null
    check (provider in ('manual', 'system', 'google_places', 'openai')),
  model text
    check (model is null or length(btrim(model)) between 1 and 150),
  status text not null
    check (status in ('succeeded', 'failed', 'blocked')),
  request_units integer not null default 0
    check (request_units between 0 and 1000),
  input_tokens integer not null default 0
    check (input_tokens >= 0),
  cached_input_tokens integer not null default 0
    check (cached_input_tokens >= 0 and cached_input_tokens <= input_tokens),
  output_tokens integer not null default 0
    check (output_tokens >= 0),
  reasoning_tokens integer not null default 0
    check (reasoning_tokens >= 0 and reasoning_tokens <= output_tokens),
  estimated_cost_microusd bigint not null default 0
    check (estimated_cost_microusd >= 0),
  result_count integer not null default 0
    check (result_count >= 0),
  initiated_by uuid references auth.users(id) on delete set null,
  error_code text
    check (error_code is null or length(btrim(error_code)) between 1 and 150),
  metadata jsonb not null default '{}'::jsonb
    check (jsonb_typeof(metadata) = 'object'),
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists atlas_agent_runs_occurred_idx
  on public.atlas_agent_runs(occurred_at desc);

create index if not exists atlas_agent_runs_prospect_idx
  on public.atlas_agent_runs(prospect_id, occurred_at desc)
  where prospect_id is not null;

create index if not exists atlas_agent_runs_organization_idx
  on public.atlas_agent_runs(organization_id, occurred_at desc)
  where organization_id is not null;

alter table public.atlas_agent_runs enable row level security;

drop policy if exists "Atlas Admin can read agent runs"
  on public.atlas_agent_runs;
create policy "Atlas Admin can read agent runs"
on public.atlas_agent_runs
for select
to authenticated
using (public.is_atlas_super_admin());

drop policy if exists "Atlas Admin can create agent runs"
  on public.atlas_agent_runs;
create policy "Atlas Admin can create agent runs"
on public.atlas_agent_runs
for insert
to authenticated
with check (
  public.is_atlas_super_admin()
  and initiated_by = auth.uid()
);

revoke all on table public.atlas_agent_runs
from public, anon, authenticated;
grant select, insert on table public.atlas_agent_runs
to authenticated;

-- Record the successful model call and the resulting MICAH draft together.
-- The daily cap is a final database guard against accidental repeated clicks.
create or replace function public.record_atlas_micah_social_sample(
  p_prospect_id uuid,
  p_model text,
  p_input_tokens integer,
  p_cached_input_tokens integer,
  p_output_tokens integer,
  p_reasoning_tokens integer,
  p_estimated_cost_microusd bigint,
  p_body text,
  p_metadata jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_event_id uuid;
begin
  if auth.uid() is null or not public.is_atlas_super_admin() then
    raise exception 'Atlas Super Admin access is required'
      using errcode = '42501';
  end if;

  if not exists (
    select 1 from public.atlas_sales_prospects where id = p_prospect_id
  ) then
    raise exception 'Sales prospect was not found'
      using errcode = 'P0002';
  end if;

  if (
    select count(*)
    from public.atlas_agent_runs
    where prospect_id = p_prospect_id
      and role = 'micah'
      and workflow = 'prospect_social_sample'
      and provider = 'openai'
      and status = 'succeeded'
      and occurred_at >= date_trunc('day', now())
  ) >= 3 then
    raise exception 'The daily MICAH sample limit has been reached'
      using errcode = '54000';
  end if;

  insert into public.atlas_agent_runs (
    prospect_id,
    role,
    workflow,
    provider,
    model,
    status,
    request_units,
    input_tokens,
    cached_input_tokens,
    output_tokens,
    reasoning_tokens,
    estimated_cost_microusd,
    result_count,
    initiated_by,
    metadata
  ) values (
    p_prospect_id,
    'micah',
    'prospect_social_sample',
    'openai',
    p_model,
    'succeeded',
    1,
    greatest(coalesce(p_input_tokens, 0), 0),
    least(
      greatest(coalesce(p_cached_input_tokens, 0), 0),
      greatest(coalesce(p_input_tokens, 0), 0)
    ),
    greatest(coalesce(p_output_tokens, 0), 0),
    least(
      greatest(coalesce(p_reasoning_tokens, 0), 0),
      greatest(coalesce(p_output_tokens, 0), 0)
    ),
    greatest(coalesce(p_estimated_cost_microusd, 0), 0),
    3,
    auth.uid(),
    coalesce(p_metadata, '{}'::jsonb)
  );

  insert into public.atlas_sales_events (
    prospect_id,
    actor_user_id,
    actor_role,
    event_type,
    direction,
    summary,
    body,
    metadata
  ) values (
    p_prospect_id,
    auth.uid(),
    'micah',
    'outreach.draft_created',
    'internal',
    'MICAH created a three-post social content sample',
    p_body,
    coalesce(p_metadata, '{}'::jsonb)
  ) returning id into v_event_id;

  return v_event_id;
end;
$$;

revoke execute on function public.record_atlas_micah_social_sample(
  uuid, text, integer, integer, integer, integer, bigint, text, jsonb
) from public, anon;
grant execute on function public.record_atlas_micah_social_sample(
  uuid, text, integer, integer, integer, integer, bigint, text, jsonb
) to authenticated;

-- No UPDATE or DELETE policy/grant is provided. The ledger is retained.
