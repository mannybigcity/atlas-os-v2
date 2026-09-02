-- Isolated sample desk (slug afe-crm-demo) plus SIS sample-row cleanup.
--
-- FOUNDER: If production Supabase is not applying repo migrations automatically,
-- paste this file in the SQL editor. Deploying the site does not apply it.
-- This file is idempotent. It does not create an Auth user. It never writes
-- sample companies into SIS. Membership on afe-crm-demo is exclusive to
-- atlasforentrepreneurs+demo@gmail.com; anyone else (including the founder
-- Gmail mailbox) is detached. Do not attach the founder mailbox.

insert into public.organizations (name, slug)
select 'Sample desk', 'afe-crm-demo'
where not exists (
  select 1
  from public.organizations
  where lower(coalesce(slug, '')) = 'afe-crm-demo'
);

update public.organizations
set name = 'Sample desk'
where lower(coalesce(slug, '')) = 'afe-crm-demo'
  and coalesce(name, '') is distinct from 'Sample desk'
  and not public.is_sis_protected_organization(name, slug);

with sample as (
  select organizations.id
  from public.organizations
  where lower(coalesce(organizations.slug, '')) = 'afe-crm-demo'
    and not public.is_sis_protected_organization(organizations.name, organizations.slug)
  order by organizations.created_at asc
  limit 1
),
sample_prospects as (
  select
    sample.id as organization_id,
    seed.name,
    seed.opportunity_type,
    seed.stage,
    seed.fit_score,
    seed.owner_role,
    seed.source_label,
    seed.source_url,
    seed.contact_name,
    seed.contact_email,
    seed.contact_phone,
    seed.contact_social,
    seed.research_summary,
    seed.fit_reason,
    seed.next_action,
    current_date + seed.days_until_due as next_action_due,
    jsonb_build_object(
      'sample_desk', true,
      'demo', true,
      'demo_kind', 'afe_crm_sample_desk',
      'no_outreach_sent', true,
      'accepted_for_calling', true,
      'seed_key', seed.seed_key
    ) as metadata
  from sample
  cross join (
    values
      (
        'abc-plumbing',
        'ABC Plumbing',
        'customer',
        'ready_for_follow_up',
        78,
        'client',
        'Sample desk seed — no outreach',
        'https://example.invalid/sample/abc-plumbing',
        'Jordan Hale',
        'desk+abc-plumbing@example.invalid',
        '(555) 010-0101',
        'https://example.invalid/sample/abc-plumbing',
        'Sample record only. Fake plumbing shop asking about branded hats and a small crew paint-splatter party. Address is not real. Atlas must never email, call, or text this contact.',
        'Sample fixture for the call list. Jordan Hale is not a live outreach target.',
        'Call Jordan Hale at ABC Plumbing today. Atlas has not contacted them.',
        0
      ),
      (
        '123-catering',
        '123 Catering',
        'customer',
        'ready_for_follow_up',
        78,
        'client',
        'Sample desk seed — no outreach',
        'https://example.invalid/sample/123-catering',
        'Riley Chen',
        'desk+123-catering@example.invalid',
        '(555) 010-0102',
        'https://example.invalid/sample/123-catering',
        'Sample record only. Fake catering kitchen interested in staff shirts and a paint-party for a client appreciation night. Not a real caterer. Atlas must never email, call, or text this contact.',
        'Sample fixture so the Tomorrow queue has a dated next action.',
        'Follow up with Riley Chen at 123 Catering tomorrow. Atlas has not contacted them.',
        1
      ),
      (
        'xyz-electric',
        'XYZ Electric',
        'customer',
        'ready_for_follow_up',
        78,
        'client',
        'Sample desk seed — no outreach',
        'https://example.invalid/sample/xyz-electric',
        'Morgan Blake',
        'desk+xyz-electric@example.invalid',
        '(555) 010-0103',
        'https://example.invalid/sample/xyz-electric',
        'Sample record only. Fake electrical contractor looking at laser-engraved tool tags and a crew paint night. Not a real electrician. Atlas must never email, call, or text this contact.',
        'Sample fixture for the Later queue and calendar.',
        'Later follow-up with Morgan Blake at XYZ Electric. Atlas has not contacted them.',
        7
      )
  ) as seed(
    seed_key,
    name,
    opportunity_type,
    stage,
    fit_score,
    owner_role,
    source_label,
    source_url,
    contact_name,
    contact_email,
    contact_phone,
    contact_social,
    research_summary,
    fit_reason,
    next_action,
    days_until_due
  )
)
insert into public.organization_opportunities (
  organization_id,
  name,
  opportunity_type,
  stage,
  fit_score,
  owner_role,
  source_label,
  source_url,
  contact_name,
  contact_email,
  contact_phone,
  contact_social,
  research_summary,
  fit_reason,
  next_action,
  next_action_due,
  metadata
)
select
  organization_id,
  name,
  opportunity_type,
  stage,
  fit_score,
  owner_role,
  source_label,
  source_url,
  contact_name,
  contact_email,
  contact_phone,
  contact_social,
  research_summary,
  fit_reason,
  next_action,
  next_action_due,
  metadata
from sample_prospects
on conflict (organization_id, name, opportunity_type)
do update set
  stage = excluded.stage,
  fit_score = excluded.fit_score,
  owner_role = excluded.owner_role,
  source_label = excluded.source_label,
  source_url = excluded.source_url,
  contact_name = excluded.contact_name,
  contact_email = excluded.contact_email,
  contact_phone = excluded.contact_phone,
  contact_social = excluded.contact_social,
  research_summary = excluded.research_summary,
  fit_reason = excluded.fit_reason,
  next_action = excluded.next_action,
  next_action_due = excluded.next_action_due,
  metadata = excluded.metadata;

insert into public.organization_hunter_review_items (
  organization_id,
  place_id,
  name,
  formatted_address,
  google_maps_url,
  website_url,
  primary_type,
  business_status,
  search_query,
  status,
  accepted_opportunity_id
)
select
  sample.id,
  'sample-desk-oak-street-vinyl',
  'Oak Street Vinyl',
  '404 Sample Oak St (not a real location). Do not visit or contact.',
  'https://example.invalid/maps/sample-oak-street-vinyl',
  'https://example.invalid/sample/oak-street-vinyl',
  'sample_lead',
  'SAMPLE',
  'Sample desk hunter review pile — no live search',
  'pending',
  null
from public.organizations sample
where lower(coalesce(sample.slug, '')) = 'afe-crm-demo'
  and not public.is_sis_protected_organization(sample.name, sample.slug)
on conflict (organization_id, place_id)
do update set
  name = excluded.name,
  formatted_address = excluded.formatted_address,
  search_query = excluded.search_query,
  status = 'pending',
  accepted_opportunity_id = null;

insert into public.organization_notes (organization_id, title, body, attention_requested)
select
  sample.id,
  seed.title,
  seed.body,
  false
from public.organizations sample
cross join (
  values
    (
      'ABC Plumbing',
      E'Internal note — ABC Plumbing\n\nContact: Jordan Hale\nPhone: (555) 010-0101 (fake, do not dial as live outreach)\nEmail: desk+abc-plumbing@example.invalid\n\nThey want a quote for 12 embroidered hats and a Saturday paint-splatter party for the shop crew. Confirm guest count and whether they want a door-hanger theme.\n\nAtlas has not called, emailed, or texted anyone. The salesman owns the next step.'
    ),
    (
      '123 Catering',
      E'Internal note — 123 Catering\n\nContact: Riley Chen\nPhone: (555) 010-0102 (fake, do not dial as live outreach)\nEmail: desk+123-catering@example.invalid\n\nThey asked about 20 staff shirts and a door-hanger paint party after a tasting event. Confirm date, guest count, and whether they want a deposit invoice.\n\nAtlas has not called, emailed, or texted anyone. Follow up tomorrow.'
    ),
    (
      'XYZ Electric',
      E'Internal note — XYZ Electric\n\nContact: Morgan Blake\nPhone: (555) 010-0103 (fake, do not dial as live outreach)\nEmail: desk+xyz-electric@example.invalid\n\nThey want engraved tool tags and a Friday crew paint night in two weeks. Confirm venue access and whether they can host 8 guests in the shop.\n\nAtlas has not called, emailed, or texted anyone. This is a later follow-up only.'
    )
) as seed(title, body)
where lower(coalesce(sample.slug, '')) = 'afe-crm-demo'
  and not public.is_sis_protected_organization(sample.name, sample.slug)
  and not exists (
    select 1
    from public.organization_notes notes
    where notes.organization_id = sample.id
      and notes.title = seed.title
  );

-- Remove leaked sample rows from the live SIS tenant. Identity stays untouched.
with sis as (
  select organizations.id
  from public.organizations
  where public.is_sis_protected_organization(organizations.name, organizations.slug)
)
delete from public.organization_sis_activity_events
where organization_id in (select id from sis)
  and (
    event_type = 'demo_seeded'
    or coalesce(payload->>'demo_kind', '') = 'sis_lions_den_demo_desk'
    or coalesce(payload->>'demo', '') = 'true'
  );

with sis as (
  select organizations.id
  from public.organizations
  where public.is_sis_protected_organization(organizations.name, organizations.slug)
)
delete from public.organization_sis_party_events
where organization_id in (select id from sis)
  and host_name in ('Jordan Hale (DEMO)', 'Riley Chen (DEMO)', 'Morgan Blake (DEMO)');

with sis as (
  select organizations.id
  from public.organizations
  where public.is_sis_protected_organization(organizations.name, organizations.slug)
)
delete from public.organization_sis_fulfillment_jobs
where organization_id in (select id from sis)
  and order_id in (
    select id
    from public.organization_sis_orders
    where organization_id in (select id from sis)
      and order_number in ('DEMO-O-ABC', 'DEMO-O-123', 'DEMO-O-XYZ')
  );

with sis as (
  select organizations.id
  from public.organizations
  where public.is_sis_protected_organization(organizations.name, organizations.slug)
)
delete from public.organization_sis_order_items
where organization_id in (select id from sis)
  and order_id in (
    select id
    from public.organization_sis_orders
    where organization_id in (select id from sis)
      and order_number in ('DEMO-O-ABC', 'DEMO-O-123', 'DEMO-O-XYZ')
  );

with sis as (
  select organizations.id
  from public.organizations
  where public.is_sis_protected_organization(organizations.name, organizations.slug)
)
delete from public.organization_sis_orders
where organization_id in (select id from sis)
  and order_number in ('DEMO-O-ABC', 'DEMO-O-123', 'DEMO-O-XYZ');

with sis as (
  select organizations.id
  from public.organizations
  where public.is_sis_protected_organization(organizations.name, organizations.slug)
)
delete from public.organization_sis_quote_items
where organization_id in (select id from sis)
  and quote_id in (
    select id
    from public.organization_sis_quotes
    where organization_id in (select id from sis)
      and quote_number in ('DEMO-Q-ABC', 'DEMO-Q-123', 'DEMO-Q-XYZ')
  );

with sis as (
  select organizations.id
  from public.organizations
  where public.is_sis_protected_organization(organizations.name, organizations.slug)
)
delete from public.organization_sis_quotes
where organization_id in (select id from sis)
  and quote_number in ('DEMO-Q-ABC', 'DEMO-Q-123', 'DEMO-Q-XYZ');

with sis as (
  select organizations.id
  from public.organizations
  where public.is_sis_protected_organization(organizations.name, organizations.slug)
)
delete from public.organization_sis_leads
where organization_id in (select id from sis)
  and source_request_id in ('demo-desk-abc-plumbing', 'demo-desk-123-catering', 'demo-desk-xyz-electric');

with sis as (
  select organizations.id
  from public.organizations
  where public.is_sis_protected_organization(organizations.name, organizations.slug)
)
delete from public.organization_sis_customers
where organization_id in (select id from sis)
  and email in (
    'demo+abc-plumbing@example.invalid',
    'demo+123-catering@example.invalid',
    'demo+xyz-electric@example.invalid'
  );

with sis as (
  select organizations.id
  from public.organizations
  where public.is_sis_protected_organization(organizations.name, organizations.slug)
)
delete from public.organization_content_draft_events
where organization_id in (select id from sis)
  and draft_id in (
    select id
    from public.organization_content_drafts
    where organization_id in (select id from sis)
      and (
        campaign = 'DEMO desk sample'
        or coalesce(metadata->>'demo_kind', '') = 'sis_lions_den_demo_desk'
      )
  );

with sis as (
  select organizations.id
  from public.organizations
  where public.is_sis_protected_organization(organizations.name, organizations.slug)
)
delete from public.organization_content_drafts
where organization_id in (select id from sis)
  and (
    campaign = 'DEMO desk sample'
    or coalesce(metadata->>'demo_kind', '') = 'sis_lions_den_demo_desk'
  );

with sis as (
  select organizations.id
  from public.organizations
  where public.is_sis_protected_organization(organizations.name, organizations.slug)
)
delete from public.note_messages
where organization_id in (select id from sis)
  and note_id in (
    select id
    from public.organization_notes
    where organization_id in (select id from sis)
      and title in ('DEMO: ABC Plumbing', 'DEMO: 123 Catering', 'DEMO: XYZ Electric')
  );

with sis as (
  select organizations.id
  from public.organizations
  where public.is_sis_protected_organization(organizations.name, organizations.slug)
)
delete from public.organization_notes
where organization_id in (select id from sis)
  and title in ('DEMO: ABC Plumbing', 'DEMO: 123 Catering', 'DEMO: XYZ Electric');

with sis as (
  select organizations.id
  from public.organizations
  where public.is_sis_protected_organization(organizations.name, organizations.slug)
)
delete from public.organization_hunter_review_items
where organization_id in (select id from sis)
  and (
    place_id like 'demo-sis-desk-%'
    or name in (
      'ABC Plumbing (DEMO)',
      '123 Catering (DEMO)',
      'XYZ Electric (DEMO)',
      'Oak Street Vinyl (DEMO)'
    )
  );

with sis as (
  select organizations.id
  from public.organizations
  where public.is_sis_protected_organization(organizations.name, organizations.slug)
)
delete from public.organization_opportunity_events
where organization_id in (select id from sis)
  and opportunity_id in (
    select id
    from public.organization_opportunities
    where organization_id in (select id from sis)
      and name in ('ABC Plumbing (DEMO)', '123 Catering (DEMO)', 'XYZ Electric (DEMO)')
  );

with sis as (
  select organizations.id
  from public.organizations
  where public.is_sis_protected_organization(organizations.name, organizations.slug)
)
delete from public.organization_opportunities
where organization_id in (select id from sis)
  and (
    name in ('ABC Plumbing (DEMO)', '123 Catering (DEMO)', 'XYZ Electric (DEMO)')
    or coalesce(metadata->>'demo_kind', '') = 'sis_lions_den_demo_desk'
  );

-- Exclusive sample-desk login: Gmail plus-address only.
-- Anyone else on this org is detached, including the founder Gmail mailbox.
delete from public.organization_memberships memberships
using public.organizations sample, auth.users users
where memberships.organization_id = sample.id
  and memberships.user_id = users.id
  and lower(coalesce(sample.slug, '')) = 'afe-crm-demo'
  and not public.is_sis_protected_organization(sample.name, sample.slug)
  and lower(coalesce(users.email, '')) is distinct from 'atlasforentrepreneurs+demo@gmail.com';
