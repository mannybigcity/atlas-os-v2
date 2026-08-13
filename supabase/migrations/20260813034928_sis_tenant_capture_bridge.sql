-- Server-only bridge from the validated SIS capture-card endpoint into the
-- SIS organization workspace. The function intentionally resolves the
-- organization by its fixed slug and never trusts a public organization id.

create or replace function public.capture_sis_tenant_lead(
  p_request_id text,
  p_business_name text,
  p_contact_name text,
  p_contact_email text,
  p_contact_phone text,
  p_website text,
  p_social_media text,
  p_source_url text
)
returns table (
  lead_id uuid,
  outcome text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_organization_id uuid;
  v_customer_id uuid;
  v_lead_id uuid;
  v_display_name text := coalesce(nullif(btrim(p_contact_name), ''), btrim(p_business_name));
  v_email text := nullif(lower(btrim(p_contact_email)), '');
  v_phone text := nullif(btrim(p_contact_phone), '');
  v_offer text := 'Website inquiry';
  v_details text := concat_ws(
    E'\n',
    nullif(concat('Business: ', nullif(btrim(p_business_name), '')), 'Business: '),
    nullif(concat('Website: ', nullif(btrim(p_website), '')), 'Website: '),
    nullif(concat('Social: ', nullif(btrim(p_social_media), '')), 'Social: ')
  );
begin
  if nullif(btrim(p_request_id), '') is null then
    raise exception 'SIS tenant intake requires a request id';
  end if;

  select id
  into v_organization_id
  from public.organizations
  where slug = 'sis-custom-creations';

  if v_organization_id is null then
    raise exception 'SIS organization is not configured';
  end if;

  if v_email is not null then
    select id
    into v_customer_id
    from public.organization_sis_customers
    where organization_id = v_organization_id
      and lower(email) = v_email
    order by updated_at desc
    limit 1;
  end if;

  if v_customer_id is null then
    insert into public.organization_sis_customers (
      organization_id,
      display_name,
      business_name,
      email,
      phone,
      source_label,
      metadata
    ) values (
      v_organization_id,
      v_display_name,
      nullif(btrim(p_business_name), ''),
      v_email,
      v_phone,
      'SIS website',
      jsonb_build_object('website', nullif(btrim(p_website), ''), 'social_media', nullif(btrim(p_social_media), ''))
    )
    returning id into v_customer_id;
  else
    update public.organization_sis_customers
    set display_name = v_display_name,
        business_name = coalesce(nullif(btrim(p_business_name), ''), business_name),
        phone = coalesce(v_phone, phone),
        metadata = metadata || jsonb_build_object('website', nullif(btrim(p_website), ''), 'social_media', nullif(btrim(p_social_media), '')),
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
    source_request_id,
    raw_payload
  ) values (
    v_organization_id,
    v_customer_id,
    'new',
    v_offer,
    'SIS website',
    v_details,
    btrim(p_request_id),
    jsonb_build_object(
      'business_name', nullif(btrim(p_business_name), ''),
      'contact_name', nullif(btrim(p_contact_name), ''),
      'contact_email', v_email,
      'contact_phone', v_phone,
      'website', nullif(btrim(p_website), ''),
      'social_media', nullif(btrim(p_social_media), ''),
      'source_url', nullif(btrim(p_source_url), '')
    )
  )
  on conflict (organization_id, source_request_id) do update
    set customer_id = excluded.customer_id,
        details = excluded.details,
        raw_payload = excluded.raw_payload,
        updated_at = now()
  returning id into v_lead_id;

  lead_id := v_lead_id;
  outcome := 'accepted';
  return next;
end;
$$;

revoke execute on function public.capture_sis_tenant_lead(
  text, text, text, text, text, text, text, text
)
from public, anon, authenticated;

grant execute on function public.capture_sis_tenant_lead(
  text, text, text, text, text, text, text, text
)
to service_role;
