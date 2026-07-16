-- Atlas OS v2 - Server-enforced public chat preview limit
-- Reserves at most three preview requests per server-issued browser session in 24 hours.

drop policy if exists "Anyone can capture a public chat turn"
  on public.atlas_public_chat_turns;

revoke insert on table public.atlas_public_chat_turns
from anon, authenticated;

create or replace function public.reserve_atlas_public_chat_turn(
  p_session_id uuid,
  p_page_path text,
  p_prompt text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
  v_turn_id uuid;
begin
  if p_session_id is null then
    raise exception 'A chat session is required' using errcode = '22023';
  end if;

  if length(btrim(coalesce(p_prompt, ''))) not between 1 and 800 then
    raise exception 'The chat prompt is invalid' using errcode = '22023';
  end if;

  if length(btrim(coalesce(p_page_path, ''))) not between 1 and 200
     or left(btrim(p_page_path), 1) <> '/' then
    p_page_path := '/';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_session_id::text, 0));

  select count(*)::integer
  into v_count
  from public.atlas_public_chat_turns
  where session_id = p_session_id
    and created_at >= now() - interval '24 hours'
    and metadata @> '{"limit_reservation": true}'::jsonb;

  if v_count >= 3 then
    return jsonb_build_object('allowed', false, 'remaining', 0);
  end if;

  insert into public.atlas_public_chat_turns (
    session_id,
    source,
    page_path,
    prompt,
    response,
    status,
    error_code,
    metadata
  ) values (
    p_session_id,
    'homepage_chat',
    btrim(p_page_path),
    btrim(p_prompt),
    '{}'::jsonb,
    'blocked',
    'preview_request_reserved',
    jsonb_build_object('limit_reservation', true)
  )
  returning id into v_turn_id;

  return jsonb_build_object(
    'allowed', true,
    'turn_id', v_turn_id,
    'remaining', greatest(2 - v_count, 0)
  );
end;
$$;

create or replace function public.finalize_atlas_public_chat_turn(
  p_turn_id uuid,
  p_response jsonb,
  p_model text,
  p_response_id text,
  p_status text,
  p_input_tokens integer,
  p_cached_input_tokens integer,
  p_output_tokens integer,
  p_reasoning_tokens integer,
  p_estimated_cost_microusd bigint,
  p_error_code text,
  p_metadata jsonb
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_updated integer;
  v_input integer := greatest(coalesce(p_input_tokens, 0), 0);
  v_output integer := greatest(coalesce(p_output_tokens, 0), 0);
begin
  if p_status not in ('succeeded', 'blocked', 'failed') then
    raise exception 'The chat status is invalid' using errcode = '22023';
  end if;

  update public.atlas_public_chat_turns
  set
    response = coalesce(p_response, '{}'::jsonb),
    model = nullif(btrim(coalesce(p_model, '')), ''),
    response_id = nullif(btrim(coalesce(p_response_id, '')), ''),
    status = p_status,
    input_tokens = v_input,
    cached_input_tokens = least(greatest(coalesce(p_cached_input_tokens, 0), 0), v_input),
    output_tokens = v_output,
    reasoning_tokens = least(greatest(coalesce(p_reasoning_tokens, 0), 0), v_output),
    estimated_cost_microusd = greatest(coalesce(p_estimated_cost_microusd, 0), 0),
    error_code = nullif(btrim(coalesce(p_error_code, '')), ''),
    metadata = coalesce(p_metadata, '{}'::jsonb)
      || jsonb_build_object('limit_reservation', true)
  where id = p_turn_id
    and error_code = 'preview_request_reserved'
    and metadata @> '{"limit_reservation": true}'::jsonb;

  get diagnostics v_updated = row_count;
  return v_updated = 1;
end;
$$;

revoke execute on function public.reserve_atlas_public_chat_turn(uuid, text, text)
from public;
grant execute on function public.reserve_atlas_public_chat_turn(uuid, text, text)
to anon, authenticated;

revoke execute on function public.finalize_atlas_public_chat_turn(
  uuid, jsonb, text, text, text, integer, integer, integer, integer, bigint, text, jsonb
) from public;
grant execute on function public.finalize_atlas_public_chat_turn(
  uuid, jsonb, text, text, text, integer, integer, integer, integer, bigint, text, jsonb
) to anon, authenticated;
