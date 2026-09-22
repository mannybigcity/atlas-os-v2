-- Public SIS paint-party availability.
--
-- Read: date + AM/PM only. No host name, email, phone, address, or lead id.
-- Write: a tentative inquiry that occupies the whole AM or PM block.
-- The party itself is 2–2.5 hours inside AM 9:00–1:00 or PM 2:00–6:00 America/Chicago.
--
-- Organization is resolved inside the database. Callers cannot pass an org id,
-- so this cannot read or write AFE, the sample desk, or any other tenant.
--
-- Hosted Supabase does not apply this file on deploy. Run it in the SQL editor
-- after supabase/migrations/20260922140000_sis_party_slot_holds.sql
-- (the column and unique index below are repeated so this file can stand alone).

alter table public.organization_sis_party_events
  add column if not exists party_slot text;

alter table public.organization_sis_party_events
  drop constraint if exists organization_sis_party_events_party_slot_check;

alter table public.organization_sis_party_events
  add constraint organization_sis_party_events_party_slot_check
  check (party_slot is null or party_slot in ('am', 'pm'));

alter table public.organization_sis_party_events
  drop constraint if exists organization_sis_party_events_slot_needs_date;

alter table public.organization_sis_party_events
  add constraint organization_sis_party_events_slot_needs_date
  check (party_slot is null or preferred_date is not null);

create unique index if not exists organization_sis_party_events_open_slot_uidx
  on public.organization_sis_party_events (organization_id, preferred_date, party_slot)
  where calendar_status in ('tentative', 'confirmed')
    and party_slot is not null
    and preferred_date is not null;

create table if not exists public.sis_public_party_attempts (
  id uuid primary key default gen_random_uuid(),
  request_id text not null unique
    check (length(btrim(request_id)) between 8 and 120),
  outcome text not null
    check (outcome in ('received', 'held', 'conflict', 'rate_limited', 'invalid', 'failed')),
  outcome_reason text
    check (outcome_reason is null or length(btrim(outcome_reason)) between 2 and 200),
  fingerprint text not null
    check (length(btrim(fingerprint)) = 64),
  ip_hash text
    check (ip_hash is null or length(btrim(ip_hash)) = 64),
  email_hash text
    check (email_hash is null or length(btrim(email_hash)) = 64),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists sis_public_party_attempts_ip_idx
  on public.sis_public_party_attempts (ip_hash, created_at desc)
  where ip_hash is not null;

create index if not exists sis_public_party_attempts_email_idx
  on public.sis_public_party_attempts (email_hash, created_at desc)
  where email_hash is not null;

drop trigger if exists sis_public_party_attempts_set_updated_at
  on public.sis_public_party_attempts;
create trigger sis_public_party_attempts_set_updated_at
before update on public.sis_public_party_attempts
for each row execute function public.set_updated_at();

alter table public.sis_public_party_attempts enable row level security;
revoke all on table public.sis_public_party_attempts from public, anon, authenticated;

create or replace function public.is_sis_protected_organization(p_name text, p_slug text)
returns boolean
language sql
immutable
as $$
  select
    coalesce(p_name, '') ~* 'sis[[:space:]]*custom[[:space:]]*creations'
    or coalesce(p_name, '') ~* 'sis[-_[:space:]]?diy'
    or coalesce(p_slug, '') ~* 'sis-diy';
$$;

create or replace function public.resolve_sis_party_organization_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select organizations.id
  from public.organizations
  where public.is_sis_protected_organization(organizations.name, organizations.slug)
  order by
    case when organizations.slug ~* 'sis-diy' then 0 else 1 end,
    organizations.created_at asc
  limit 1;
$$;

revoke all on function public.resolve_sis_party_organization_id() from public, anon, authenticated;
grant execute on function public.resolve_sis_party_organization_id() to service_role;

create or replace function public.list_sis_party_public_slots(
  p_from date,
  p_to date
)
returns table (
  preferred_date date,
  party_slot text
)
language plpgsql
stable
security definer
set search_path = public
as $$
#variable_conflict use_column
declare
  v_organization_id uuid;
begin
  if p_from is null or p_to is null or p_to < p_from or (p_to - p_from) > 62 then
    raise exception 'invalid date range';
  end if;

  v_organization_id := public.resolve_sis_party_organization_id();
  if v_organization_id is null then
    raise exception 'SIS organization is not configured';
  end if;

  return query
  select events.preferred_date, events.party_slot
  from public.organization_sis_party_events events
  where events.organization_id = v_organization_id
    and events.calendar_status in ('tentative', 'confirmed')
    and events.party_slot in ('am', 'pm')
    and events.preferred_date between p_from and p_to;
end;
$$;

revoke all on function public.list_sis_party_public_slots(date, date) from public, anon, authenticated;
grant execute on function public.list_sis_party_public_slots(date, date) to service_role;

create or replace function public.create_sis_party_public_hold(
  p_request_id text,
  p_host_name text,
  p_email text,
  p_phone text,
  p_party_type text,
  p_guest_count integer,
  p_preferred_date date,
  p_party_slot text,
  p_start_time text,
  p_zip text,
  p_notes text,
  p_source_url text,
  p_ip_hash text,
  p_email_hash text,
  p_fingerprint text
)
returns table (
  outcome text,
  outcome_reason text,
  preferred_date date,
  party_slot text,
  start_time text
)
language plpgsql
security definer
set search_path = public
as $$
#variable_conflict use_column
declare
  v_request_id text := btrim(p_request_id);
  v_host_name text := btrim(p_host_name);
  v_email text := nullif(lower(btrim(p_email)), '');
  v_phone text := nullif(btrim(p_phone), '');
  v_party_type text := btrim(p_party_type);
  v_slot text := lower(btrim(p_party_slot));
  v_start text := btrim(p_start_time);
  v_zip text := nullif(btrim(p_zip), '');
  v_notes text := nullif(btrim(p_notes), '');
  v_source_url text := nullif(btrim(p_source_url), '');
  v_ip_hash text := nullif(btrim(p_ip_hash), '');
  v_email_hash text := nullif(btrim(p_email_hash), '');
  v_fingerprint text := btrim(p_fingerprint);
  v_attempt public.sis_public_party_attempts%rowtype;
  v_organization_id uuid;
  v_owner uuid;
  v_customer_id uuid;
  v_lead_id uuid;
  v_today date;
  v_due date;
  v_starts timestamptz;
  v_recent integer;
  v_outcome text;
  v_reason text;
  v_phone_digits text;
begin
  if v_request_id is null or length(v_request_id) < 8 or length(v_request_id) > 120
     or v_fingerprint is null or length(v_fingerprint) <> 64 then
    raise exception 'invalid public party request';
  end if;

  perform pg_advisory_xact_lock(hashtext('sis-party-' || v_request_id));

  insert into public.sis_public_party_attempts (
    request_id, outcome, fingerprint, ip_hash, email_hash
  ) values (
    v_request_id, 'received', v_fingerprint, v_ip_hash, v_email_hash
  )
  on conflict (request_id) do update
    set updated_at = now()
  returning * into v_attempt;

  if v_attempt.outcome is distinct from 'received' then
    outcome := v_attempt.outcome;
    outcome_reason := v_attempt.outcome_reason;
    preferred_date := p_preferred_date;
    party_slot := v_slot;
    start_time := v_start;
    return next;
    return;
  end if;

  if v_ip_hash is not null then
    select count(*) into v_recent
    from public.sis_public_party_attempts attempts
    where attempts.ip_hash = v_ip_hash
      and attempts.created_at >= now() - interval '1 hour';
    if coalesce(v_recent, 0) >= 5 then
      update public.sis_public_party_attempts
      set outcome = 'rate_limited', outcome_reason = 'ip_rate_limit'
      where id = v_attempt.id;
      outcome := 'rate_limited';
      outcome_reason := 'ip_rate_limit';
      preferred_date := p_preferred_date;
      party_slot := v_slot;
      start_time := v_start;
      return next;
      return;
    end if;
  end if;

  if v_email_hash is not null then
    select count(*) into v_recent
    from public.sis_public_party_attempts attempts
    where attempts.email_hash = v_email_hash
      and attempts.created_at >= now() - interval '24 hours';
    if coalesce(v_recent, 0) >= 3 then
      update public.sis_public_party_attempts
      set outcome = 'rate_limited', outcome_reason = 'email_rate_limit'
      where id = v_attempt.id;
      outcome := 'rate_limited';
      outcome_reason := 'email_rate_limit';
      preferred_date := p_preferred_date;
      party_slot := v_slot;
      start_time := v_start;
      return next;
      return;
    end if;
  end if;

  v_today := (timezone('America/Chicago', now()))::date;
  v_phone_digits := regexp_replace(coalesce(v_phone, ''), '[^0-9]', '', 'g');
  v_reason := null;
  if length(v_host_name) < 2 or length(v_host_name) > 220 then
    v_reason := 'name';
  elsif v_email is null or length(v_email) < 5 or length(v_email) > 320
     or v_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then
    v_reason := 'email';
  elsif v_phone is not null and (length(v_phone) < 7 or length(v_phone) > 80 or length(v_phone_digits) < 10 or length(v_phone_digits) > 15) then
    v_reason := 'phone';
  elsif v_party_type not in (
    'Adult Paint Parties',
    'Kids Paint Parties',
    'Schools / Daycares',
    'Splatter Paint Experiences'
  ) then
    v_reason := 'party_type';
  elsif p_guest_count is not null and (p_guest_count < 1 or p_guest_count > 500) then
    v_reason := 'guest_count';
  elsif p_preferred_date is null or p_preferred_date < v_today or p_preferred_date > v_today + 120 then
    v_reason := 'date';
  elsif v_slot not in ('am', 'pm') then
    v_reason := 'slot';
  elsif (v_slot = 'am' and v_start not in ('09:00', '09:30', '10:00', '10:30'))
     or (v_slot = 'pm' and v_start not in ('14:00', '14:30', '15:00', '15:30')) then
    v_reason := 'start_time';
  elsif v_zip is not null and v_zip !~ '^[0-9]{5}(-[0-9]{4})?$' then
    v_reason := 'zip';
  elsif v_notes is not null and length(v_notes) > 2000 then
    v_reason := 'notes';
  end if;

  if v_reason is not null then
    update public.sis_public_party_attempts
    set outcome = 'invalid', outcome_reason = v_reason
    where id = v_attempt.id;
    outcome := 'invalid';
    outcome_reason := v_reason;
    preferred_date := p_preferred_date;
    party_slot := v_slot;
    start_time := v_start;
    return next;
    return;
  end if;

  v_organization_id := public.resolve_sis_party_organization_id();
  if v_organization_id is null then
    update public.sis_public_party_attempts
    set outcome = 'failed', outcome_reason = 'sis_org_missing'
    where id = v_attempt.id;
    outcome := 'failed';
    outcome_reason := 'sis_org_missing';
    preferred_date := p_preferred_date;
    party_slot := v_slot;
    start_time := v_start;
    return next;
    return;
  end if;

  select memberships.user_id
  into v_owner
  from public.organization_memberships memberships
  where memberships.organization_id = v_organization_id
    and memberships.role in ('owner', 'admin')
  order by case memberships.role when 'owner' then 0 else 1 end, memberships.created_at asc
  limit 1;

  if v_owner is null then
    update public.sis_public_party_attempts
    set outcome = 'failed', outcome_reason = 'sis_owner_missing'
    where id = v_attempt.id;
    outcome := 'failed';
    outcome_reason := 'sis_owner_missing';
    preferred_date := p_preferred_date;
    party_slot := v_slot;
    start_time := v_start;
    return next;
    return;
  end if;

  perform pg_advisory_xact_lock(hashtext(v_organization_id::text || ':' || p_preferred_date::text || ':' || v_slot));

  if exists (
    select 1
    from public.organization_sis_party_events events
    where events.organization_id = v_organization_id
      and events.preferred_date = p_preferred_date
      and events.party_slot = v_slot
      and events.calendar_status in ('tentative', 'confirmed')
  ) then
    update public.sis_public_party_attempts
    set outcome = 'conflict', outcome_reason = 'slot_taken'
    where id = v_attempt.id;
    outcome := 'conflict';
    outcome_reason := 'slot_taken';
    preferred_date := p_preferred_date;
    party_slot := v_slot;
    start_time := v_start;
    return next;
    return;
  end if;

  v_due := greatest(v_today, current_date);
  v_starts := (p_preferred_date::text || ' ' || v_start || ':00')::timestamp at time zone 'America/Chicago';
  v_outcome := 'held';
  v_reason := null;

  begin
    if v_email is not null then
      select customers.id
      into v_customer_id
      from public.organization_sis_customers customers
      where customers.organization_id = v_organization_id
        and lower(customers.email) = v_email
      order by customers.updated_at desc
      limit 1;
    end if;

    if v_customer_id is null then
      insert into public.organization_sis_customers (
        organization_id, display_name, email, phone, source_label, created_by
      ) values (
        v_organization_id, v_host_name, v_email, v_phone, 'SIS website party calendar', v_owner
      )
      returning id into v_customer_id;
    else
      update public.organization_sis_customers
      set display_name = v_host_name,
          phone = coalesce(v_phone, phone),
          updated_at = now()
      where id = v_customer_id
        and organization_id = v_organization_id;
    end if;

    insert into public.organization_sis_leads (
      organization_id,
      customer_id,
      status,
      offer,
      source_label,
      details,
      next_action,
      next_action_due,
      owner_user_id,
      source_request_id,
      raw_payload,
      created_by
    ) values (
      v_organization_id,
      v_customer_id,
      'new',
      v_party_type,
      'SIS website party calendar',
      concat_ws(
        E'\n',
        'Tentative website inquiry. The hold occupies the full AM or PM block.',
        'Requested start ' || v_start || ' America/Chicago.',
        'Block ' || v_slot || ' on ' || p_preferred_date::text || '.',
        case when v_zip is null then null else 'Zip: ' || v_zip end,
        v_notes
      ),
      'Contact website party inquiry within 24 hours',
      v_due,
      v_owner,
      v_request_id,
      jsonb_build_object(
        'source', 'sis_public_party_calendar',
        'party_type', v_party_type,
        'preferred_date', p_preferred_date,
        'party_slot', v_slot,
        'start_time', v_start,
        'zip', v_zip,
        'guest_count', p_guest_count,
        'source_url', v_source_url
      ),
      v_owner
    )
    returning id into v_lead_id;

    insert into public.organization_sis_party_events (
      organization_id,
      lead_id,
      host_name,
      stage,
      preferred_contact_method,
      party_type,
      guest_count,
      preferred_date,
      party_slot,
      party_starts_at,
      contact_consent,
      calendar_status,
      owner_user_id,
      next_action,
      next_action_due,
      created_by
    ) values (
      v_organization_id,
      v_lead_id,
      v_host_name,
      'new_inquiry',
      'email',
      v_party_type,
      p_guest_count,
      p_preferred_date,
      v_slot,
      v_starts,
      true,
      'tentative',
      v_owner,
      'Contact website party inquiry within 24 hours',
      v_due,
      v_owner
    );
  exception
    when unique_violation then
      v_outcome := 'conflict';
      v_reason := 'slot_taken';
  end;

  update public.sis_public_party_attempts
  set outcome = v_outcome, outcome_reason = v_reason
  where id = v_attempt.id;

  outcome := v_outcome;
  outcome_reason := v_reason;
  preferred_date := p_preferred_date;
  party_slot := v_slot;
  start_time := v_start;
  return next;
end;
$$;

revoke all on function public.create_sis_party_public_hold(
  text, text, text, text, text, integer, date, text, text, text, text, text, text, text, text
) from public, anon, authenticated;

grant execute on function public.create_sis_party_public_hold(
  text, text, text, text, text, integer, date, text, text, text, text, text, text, text, text
) to service_role;
