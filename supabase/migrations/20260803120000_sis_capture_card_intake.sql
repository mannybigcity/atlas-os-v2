-- Atlas OS v2 - SIS public capture-card intake
-- Provides a narrow, auditable server-side path from the public SIS brand
-- into the private Atlas sales CRM without exposing CRM privileges to the
-- browser or public website.

create table if not exists public.atlas_public_intake_attempts (
  id uuid primary key default gen_random_uuid(),
  request_id text not null unique
    check (length(btrim(request_id)) between 8 and 120),
  source text not null default 'sis_capture_card'
    check (source = 'sis_capture_card'),
  outcome text not null
    check (
      outcome in (
        'received',
        'created',
        'updated',
        'duplicate',
        'invalid_request',
        'rate_limited',
        'failed'
      )
    ),
  outcome_reason text
    check (outcome_reason is null or length(btrim(outcome_reason)) between 2 and 2000),
  prospect_id uuid
    references public.atlas_sales_prospects(id) on delete set null,
  fingerprint text not null
    check (length(btrim(fingerprint)) = 64),
  ip_hash text
    check (ip_hash is null or length(btrim(ip_hash)) = 64),
  email_hash text
    check (email_hash is null or length(btrim(email_hash)) = 64),
  phone_hash text
    check (phone_hash is null or length(btrim(phone_hash)) = 64),
  user_agent text
    check (user_agent is null or length(btrim(user_agent)) between 2 and 512),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists atlas_public_intake_attempts_created_idx
  on public.atlas_public_intake_attempts(created_at desc);

create index if not exists atlas_public_intake_attempts_ip_idx
  on public.atlas_public_intake_attempts(ip_hash, created_at desc)
  where ip_hash is not null;

create index if not exists atlas_public_intake_attempts_email_idx
  on public.atlas_public_intake_attempts(email_hash, created_at desc)
  where email_hash is not null;

create index if not exists atlas_public_intake_attempts_phone_idx
  on public.atlas_public_intake_attempts(phone_hash, created_at desc)
  where phone_hash is not null;

drop trigger if exists atlas_public_intake_attempts_set_updated_at
  on public.atlas_public_intake_attempts;
create trigger atlas_public_intake_attempts_set_updated_at
before update on public.atlas_public_intake_attempts
for each row execute function public.set_updated_at();

alter table public.atlas_public_intake_attempts enable row level security;

revoke all on table public.atlas_public_intake_attempts
from public, anon, authenticated;

-- No direct public grants are provided. The intake route executes through a
-- server-only service-role client and the database function below.

create or replace function public.capture_sis_capture_card_intake(
  p_request_id text,
  p_business_name text,
  p_contact_name text,
  p_contact_email text,
  p_contact_phone text,
  p_website text,
  p_website_domain text,
  p_social_media text,
  p_source_url text,
  p_ip_hash text,
  p_email_hash text,
  p_phone_hash text,
  p_fingerprint text,
  p_user_agent text
)
returns table (
  attempt_id uuid,
  prospect_id uuid,
  outcome text,
  outcome_reason text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_request_id text := btrim(p_request_id);
  v_business_name text := btrim(p_business_name);
  v_contact_name text := nullif(btrim(p_contact_name), '');
  v_contact_email text := nullif(lower(btrim(p_contact_email)), '');
  v_contact_phone text := nullif(btrim(p_contact_phone), '');
  v_website text := nullif(btrim(p_website), '');
  v_website_domain text := nullif(lower(btrim(p_website_domain)), '');
  v_social_media text := nullif(btrim(p_social_media), '');
  v_source_url text := nullif(btrim(p_source_url), '');
  v_ip_hash text := nullif(btrim(p_ip_hash), '');
  v_email_hash text := nullif(btrim(p_email_hash), '');
  v_phone_hash text := nullif(btrim(p_phone_hash), '');
  v_fingerprint text := btrim(p_fingerprint);
  v_user_agent text := nullif(btrim(p_user_agent), '');
  v_attempt public.atlas_public_intake_attempts%rowtype;
  v_prospect public.atlas_sales_prospects%rowtype;
  v_changed_fields text[] := '{}'::text[];
  v_existing_changed boolean;
  v_recent_count integer;
begin
  perform pg_advisory_xact_lock(hashtext(v_request_id));

  insert into public.atlas_public_intake_attempts (
    request_id,
    source,
    outcome,
    outcome_reason,
    prospect_id,
    fingerprint,
    ip_hash,
    email_hash,
    phone_hash,
    user_agent
  ) values (
    v_request_id,
    'sis_capture_card',
    'received',
    null,
    null,
    v_fingerprint,
    v_ip_hash,
    v_email_hash,
    v_phone_hash,
    v_user_agent
  )
  on conflict (request_id) do update
    set updated_at = now()
  returning * into v_attempt;

  if v_attempt.outcome is distinct from 'received' then
    attempt_id := v_attempt.id;
    prospect_id := v_attempt.prospect_id;
    outcome := v_attempt.outcome;
    outcome_reason := v_attempt.outcome_reason;
    return next;
    return;
  end if;

  if v_ip_hash is not null then
    select count(*)
    into v_recent_count
    from public.atlas_public_intake_attempts attempts
    where attempts.ip_hash = v_ip_hash
      and attempts.created_at >= now() - interval '1 hour';

    if coalesce(v_recent_count, 0) >= 8 then
      update public.atlas_public_intake_attempts
      set outcome = 'rate_limited',
          outcome_reason = 'ip_rate_limit',
          updated_at = now()
      where id = v_attempt.id;

      attempt_id := v_attempt.id;
      prospect_id := null;
      outcome := 'rate_limited';
      outcome_reason := 'ip_rate_limit';
      return next;
      return;
    end if;
  end if;

  if v_email_hash is not null then
    select count(*)
    into v_recent_count
    from public.atlas_public_intake_attempts attempts
    where attempts.email_hash = v_email_hash
      and attempts.created_at >= now() - interval '24 hours';

    if coalesce(v_recent_count, 0) >= 3 then
      update public.atlas_public_intake_attempts
      set outcome = 'rate_limited',
          outcome_reason = 'email_rate_limit',
          updated_at = now()
      where id = v_attempt.id;

      attempt_id := v_attempt.id;
      prospect_id := null;
      outcome := 'rate_limited';
      outcome_reason := 'email_rate_limit';
      return next;
      return;
    end if;
  end if;

  if v_phone_hash is not null then
    select count(*)
    into v_recent_count
    from public.atlas_public_intake_attempts attempts
    where attempts.phone_hash = v_phone_hash
      and attempts.created_at >= now() - interval '24 hours';

    if coalesce(v_recent_count, 0) >= 3 then
      update public.atlas_public_intake_attempts
      set outcome = 'rate_limited',
          outcome_reason = 'phone_rate_limit',
          updated_at = now()
      where id = v_attempt.id;

      attempt_id := v_attempt.id;
      prospect_id := null;
      outcome := 'rate_limited';
      outcome_reason := 'phone_rate_limit';
      return next;
      return;
    end if;
  end if;

  if v_contact_email is not null then
    select *
    into v_prospect
    from public.atlas_sales_prospects
    where lower(contact_email) = v_contact_email
    order by updated_at desc, created_at desc
    limit 1;
  end if;

  if not found and v_website_domain is not null then
    select *
    into v_prospect
    from public.atlas_sales_prospects
    where lower(website_domain) = v_website_domain
    order by updated_at desc, created_at desc
    limit 1;
  end if;

  if not found and v_contact_phone is not null then
    select *
    into v_prospect
    from public.atlas_sales_prospects
    where regexp_replace(coalesce(contact_phone, ''), '[^0-9]', '', 'g')
      = regexp_replace(v_contact_phone, '[^0-9]', '', 'g')
    order by updated_at desc, created_at desc
    limit 1;
  end if;

  if not found then
    select *
    into v_prospect
    from public.atlas_sales_prospects
    where lower(btrim(business_name)) = lower(v_business_name)
    order by updated_at desc, created_at desc
    limit 1;
  end if;

  if not found then
    insert into public.atlas_sales_prospects (
      business_name,
      status,
      assigned_role,
      website,
      website_domain,
      contact_name,
      contact_email,
      contact_phone,
      social_media,
      contact_basis,
      created_by,
      updated_by
    ) values (
      v_business_name,
      'new',
      'hunter',
      v_website,
      v_website_domain,
      v_contact_name,
      v_contact_email,
      v_contact_phone,
      v_social_media,
      'inbound_consent',
      null,
      null
    )
    returning * into v_prospect;

    insert into public.atlas_sales_prospect_sources (
      prospect_id,
      source_type,
      external_id,
      source_url,
      retrieved_at,
      facts,
      created_by,
      created_at
    ) values (
      v_prospect.id,
      'manual',
      v_request_id,
      v_source_url,
      now(),
      jsonb_build_object(
        'capture_source', 'sis_capture_card',
        'request_id', v_request_id,
        'fingerprint', v_fingerprint,
        'business_name', v_business_name,
        'contact_name', v_contact_name,
        'contact_email', v_contact_email,
        'contact_phone', v_contact_phone,
        'website', v_website,
        'website_domain', v_website_domain,
        'social_media', v_social_media
      ),
      null,
      now()
    )
    on conflict (source_type, external_id)
      where external_id is not null
    do update set
      prospect_id = excluded.prospect_id,
      source_url = excluded.source_url,
      retrieved_at = excluded.retrieved_at,
      facts = excluded.facts;

    update public.atlas_public_intake_attempts
    set outcome = 'created',
        prospect_id = v_prospect.id,
        outcome_reason = null,
        updated_at = now()
    where id = v_attempt.id;

    attempt_id := v_attempt.id;
    prospect_id := v_prospect.id;
    outcome := 'created';
    outcome_reason := null;
    return next;
    return;
  end if;

  v_changed_fields := array_remove(array[
    case when btrim(v_prospect.business_name) is distinct from v_business_name then 'business_name' end,
    case when coalesce(v_prospect.contact_name, '') is distinct from coalesce(v_contact_name, '') then 'contact_name' end,
    case when coalesce(lower(v_prospect.contact_email), '') is distinct from coalesce(v_contact_email, '') then 'contact_email' end,
    case when regexp_replace(coalesce(v_prospect.contact_phone, ''), '[^0-9]', '', 'g')
      is distinct from regexp_replace(coalesce(v_contact_phone, ''), '[^0-9]', '', 'g')
      then 'contact_phone' end,
    case when coalesce(v_prospect.website, '') is distinct from coalesce(v_website, '') then 'website' end,
    case when coalesce(lower(v_prospect.website_domain), '') is distinct from coalesce(v_website_domain, '') then 'website_domain' end,
    case when coalesce(v_prospect.social_media, '') is distinct from coalesce(v_social_media, '') then 'social_media' end
  ], null);

  if cardinality(v_changed_fields) > 0 then
    update public.atlas_sales_prospects
    set
      business_name = v_business_name,
      contact_name = coalesce(v_contact_name, contact_name),
      contact_email = coalesce(v_contact_email, contact_email),
      contact_phone = coalesce(v_contact_phone, contact_phone),
      website = coalesce(v_website, website),
      website_domain = coalesce(v_website_domain, website_domain),
      social_media = coalesce(v_social_media, social_media),
      contact_basis = case
        when contact_basis = 'unknown' then 'inbound_consent'
        else contact_basis
      end,
      updated_by = null
    where id = v_prospect.id
    returning * into v_prospect;

    insert into public.atlas_sales_events (
      prospect_id,
      actor_user_id,
      actor_role,
      event_type,
      channel,
      direction,
      summary,
      metadata
    ) values (
      v_prospect.id,
      null,
      'system',
      'prospect.updated',
      'website',
      'internal',
      'SIS capture card intake updated an existing prospect',
      jsonb_build_object(
        'source', 'sis_capture_card',
        'request_id', v_request_id,
        'changed_fields', to_jsonb(v_changed_fields)
      )
    );

    update public.atlas_public_intake_attempts
    set outcome = 'updated',
        prospect_id = v_prospect.id,
        outcome_reason = null,
        updated_at = now()
    where id = v_attempt.id;

    attempt_id := v_attempt.id;
    prospect_id := v_prospect.id;
    outcome := 'updated';
    outcome_reason := null;
    return next;
    return;
  end if;

  insert into public.atlas_sales_prospect_sources (
    prospect_id,
    source_type,
    external_id,
    source_url,
    retrieved_at,
    facts,
    created_by,
    created_at
  ) values (
    v_prospect.id,
    'manual',
    v_request_id,
    v_source_url,
    now(),
    jsonb_build_object(
      'capture_source', 'sis_capture_card',
      'request_id', v_request_id,
      'fingerprint', v_fingerprint,
      'business_name', v_business_name,
      'contact_name', v_contact_name,
      'contact_email', v_contact_email,
      'contact_phone', v_contact_phone,
      'website', v_website,
      'website_domain', v_website_domain,
      'social_media', v_social_media
    ),
    null,
    now()
  )
  on conflict (source_type, external_id)
    where external_id is not null
  do update set
    prospect_id = excluded.prospect_id,
    source_url = excluded.source_url,
    retrieved_at = excluded.retrieved_at,
    facts = excluded.facts;

  update public.atlas_public_intake_attempts
  set outcome = 'duplicate',
      prospect_id = v_prospect.id,
      outcome_reason = 'matched existing prospect without changes',
      updated_at = now()
  where id = v_attempt.id;

  attempt_id := v_attempt.id;
  prospect_id := v_prospect.id;
  outcome := 'duplicate';
  outcome_reason := 'matched existing prospect without changes';
  return next;
  return;
exception
  when others then
    update public.atlas_public_intake_attempts
    set outcome = 'failed',
        outcome_reason = left(sqlerrm, 2000),
        updated_at = now()
    where id = v_attempt.id;
    raise;
end;
$$;

revoke execute on function public.capture_sis_capture_card_intake(
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text
)
from public, anon, authenticated;

grant execute on function public.capture_sis_capture_card_intake(
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text
)
to service_role;
