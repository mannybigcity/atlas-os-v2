-- Q-Time weekly package: source-backed prospect research and reviewable content.
-- Applied only to the approved Atlas Operating System Supabase project.
-- All content and outreach remain approval-required; no contact or publishing occurs.

begin;

-- Keep the earlier generic pilot shortlist in history, but keep this package's
-- active dashboard count exact: five venues and five food-truck prospects.
update public.organization_opportunities opportunities
set
  stage = 'archived',
  metadata = opportunities.metadata || jsonb_build_object(
    'superseded_by_package', 'qtime-week-2026-07-28',
    'archive_reason', 'Replaced by source-backed weekly package research.'
  ),
  updated_at = now()
from public.organizations organizations
where opportunities.organization_id = organizations.id
  and organizations.slug = 'qtime-productions'
  and opportunities.name in (
    'US Foods sponsorship follow-up',
    'Denver food truck matchup shortlist',
    'New Terrain Brewing venue partner',
    'Colorado culinary sponsor list',
    'Food4Thought launch partners'
  );

insert into public.organization_opportunities (
  organization_id, name, opportunity_type, stage, fit_score, owner_role,
  source_label, source_url, research_summary, fit_reason, next_action,
  next_action_due, metadata
)
select
  organizations.id,
  seed.name,
  seed.opportunity_type,
  'needs_client_input',
  seed.fit_score,
  'hunter',
  seed.source_label,
  seed.source_url,
  seed.research_summary,
  seed.fit_reason,
  'Approval required: QTime should confirm this is a fit and approve any outreach draft before DAVID identifies a contact or sends anything.',
  seed.next_action_due,
  jsonb_build_object(
    'package', 'qtime-week-2026-07-28',
    'research_verified_at', '2026-07-28',
    'research_type', seed.opportunity_type,
    'approval_required', true,
    'outreach_sent', false
  )
from public.organizations organizations
cross join (
  values
    (
      'Renegade Brewing Company', 'venue', 90::smallint,
      'Renegade private events', 'https://www.renegadebrewing.com/private-events',
      'Renegade publicly describes private events in Denver, says it can assist with food options from its regular food-truck rotation or local caterers, and lists its 925 W 9th Ave location.',
      'The public event model is compatible with a food-and-beverage competition concept, subject to venue approval, capacity, permits, and date confirmation.', date '2026-07-29'
    ),
    (
      'Danico Brewing Company', 'venue', 86::smallint,
      'Danico event and food-truck schedule', 'https://www.danicobrewing.com/',
      'Danico publicly states that it does not serve food and uses rotating local food trucks, with an event and food-truck schedule and a Denver address.',
      'A rotating-truck taproom is a plausible research fit for a filmed matchup, but QTime must confirm production permissions, audience setup, and dates.', date '2026-07-30'
    ),
    (
      'New Terrain Brewing Company', 'venue', 88::smallint,
      'New Terrain private events', 'https://newterrainbrewing.com/private-events',
      'New Terrain publicly offers a private Terminus Room for groups of 20+ and says it always has a food truck; its public event calendar also lists Roll''n Wars-branded events.',
      'This is a high-relevance public lead, not evidence of a current QTime relationship or future availability; confirm the relationship and next step before outreach.', date '2026-07-31'
    ),
    (
      'Stanley Marketplace', 'venue', 80::smallint,
      'Stanley Marketplace events', 'https://www.stanleymarketplace.com/all-events',
      'Stanley Marketplace publicly maintains an events calendar at its Aurora marketplace, including free public events and private-event programming by marketplace tenants.',
      'The multi-vendor marketplace setting could support audience-facing culinary programming, but event ownership, space, permits, and food-truck rules need confirmation.', date '2026-08-01'
    ),
    (
      'Civic Center EATS / Civic Center Conservancy', 'venue', 84::smallint,
      'Civic Center EATS official site', 'https://civiccenterpark.org/events/eats/',
      'The official Civic Center EATS page describes the 2026 season, recurring Wednesday/Thursday food-truck programming, and a published vendor lineup in Civic Center Park.',
      'The established food-truck program is relevant for partnership or research, but it is not evidence that QTime can book or alter the program; confirm the correct proposal channel first.', date '2026-08-03'
    ),
    (
      'Pink Tank', 'food_truck', 88::smallint,
      'Pink Tank official site', 'https://www.eatpinktank.com/',
      'Pink Tank''s official site identifies it as a Denver food truck specializing in chicken and waffles and says it caters parties and events of different sizes.',
      'A clear signature category and public event catering fit make this a possible matchup candidate; menu, operating area, availability, and participation interest are unverified.', date '2026-07-29'
    ),
    (
      'Dos Gringos', 'food_truck', 86::smallint,
      'Dos Gringos official site', 'https://www.dosgringosco.com/',
      'Dos Gringos'' official site describes a Denver food truck established in 2016 with gourmet Mexican-American food and a public catering inquiry path.',
      'A distinct Mexican-American category could create a strong matchup angle; QTime still needs to approve outreach and confirm current service area and availability.', date '2026-07-30'
    ),
    (
      'True Love Tacos', 'food_truck', 85::smallint,
      'True Love Tacos official site', 'https://www.truelovetacos.com/',
      'True Love Tacos'' official site describes Denver-area food-truck catering, service across Denver and Aurora, and a fleet of four trucks.',
      'Publicly stated regional coverage and a focused taco concept make this a candidate for a food-focused matchup; no participation or date is confirmed.', date '2026-07-31'
    ),
    (
      'Gyros Town Food Truck', 'food_truck', 82::smallint,
      'Gyros Town official site', 'https://gyrostownfoodtruck.com/',
      'Gyros Town''s official site identifies a Denver food truck serving Greek and Mediterranean cuisine and publishes a catering menu and phone number.',
      'A distinct Mediterranean category broadens the matchup mix; QTime must approve any contact and verify current operations before using the number.', date '2026-08-01'
    ),
    (
      'Saucy Chops', 'food_truck', 80::smallint,
      'Saucy Chops official site', 'https://www.saucychops5280.com/',
      'Saucy Chops'' official site describes a Colorado food truck and catering business and presents event-oriented food offerings.',
      'The public catering positioning may fit event recruitment, but cuisine details, service area, availability, and interest in a filmed competition remain unverified.', date '2026-08-03'
    )
) as seed(
  name, opportunity_type, fit_score, source_label, source_url,
  research_summary, fit_reason, next_action_due
)
where organizations.slug = 'qtime-productions'
on conflict (organization_id, name, opportunity_type) do update
set
  stage = excluded.stage,
  fit_score = excluded.fit_score,
  owner_role = excluded.owner_role,
  source_label = excluded.source_label,
  source_url = excluded.source_url,
  research_summary = excluded.research_summary,
  fit_reason = excluded.fit_reason,
  next_action = excluded.next_action,
  next_action_due = excluded.next_action_due,
  metadata = excluded.metadata,
  updated_at = now();

insert into public.organization_opportunity_events (
  opportunity_id, organization_id, event_type, actor_role, summary, body
)
select
  opportunities.id,
  opportunities.organization_id,
  'research_added',
  'hunter',
  'HUNTER added source-backed public research for QTime review.',
  'No outreach was sent. QTime approval is required before DAVID prepares or sends a contact attempt.'
from public.organization_opportunities opportunities
join public.organizations organizations on organizations.id = opportunities.organization_id
where organizations.slug = 'qtime-productions'
  and opportunities.metadata ->> 'package' = 'qtime-week-2026-07-28'
  and not exists (
    select 1
    from public.organization_opportunity_events events
    where events.opportunity_id = opportunities.id
      and events.event_type = 'research_added'
      and events.body like 'No outreach was sent.%'
  );

-- Keep the three existing visual directions as exactly three flyer concepts,
-- and refresh their package date without creating duplicate flyer concepts.
update public.organization_content_drafts drafts
set
  draft_date = date '2026-07-28',
  status = 'ready_for_review',
  metadata = drafts.metadata || jsonb_build_object(
    'package', 'qtime-week-2026-07-28',
    'asset_type', 'flyer_concept',
    'approval_required', true,
    'published', false,
    'outreach_sent', false
  ),
  updated_at = now()
from public.organizations organizations
where drafts.organization_id = organizations.id
  and organizations.slug = 'qtime-productions'
  and drafts.slot in (
    'rolln-wars-concept-1', 'rolln-wars-concept-2', 'rolln-wars-concept-3'
  );

insert into public.organization_content_drafts (
  organization_id, draft_date, slot, campaign, title, headline,
  supporting_text, caption, call_to_action, platforms, visual_style,
  status, generated_by, generation_source, metadata
)
select
  organizations.id,
  seed.draft_date,
  seed.slot,
  'Roll''n Wars',
  seed.title,
  seed.headline,
  seed.supporting_text,
  seed.caption,
  seed.call_to_action,
  array['instagram', 'facebook', 'tiktok']::text[],
  seed.visual_style,
  'ready_for_review',
  'micah',
  'manual',
  jsonb_build_object(
    'package', 'qtime-week-2026-07-28',
    'asset_type', 'social_post',
    'approval_required', true,
    'published', false,
    'outreach_sent', false,
    'requires_event_details', true
  )
from public.organizations organizations
cross join (
  values
    (date '2026-07-28', 'qtime-week-social-1', 'Social 1 - Series introduction', 'A NEW FOOD STORY IS TAKING SHAPE', 'Roll''n Wars is a QTime Productions original concept for food, competition, and community.', E'What happens when local food stories meet a little friendly competition?\n\nRoll''n Wars is being shaped as a QTime Productions original series spotlighting the people and flavors behind local food businesses.\n\nEvent details and participating trucks are not confirmed yet. Follow along for the approved announcement.', 'Follow QTime Productions for the approved announcement.', 'premium_editorial'),
    (date '2026-07-29', 'qtime-week-social-2', 'Social 2 - Food truck invitation draft', 'WHO SHOULD ENTER THE BATTLE?', 'A draft invitation for QTime''s food-truck community.', E'Food trucks of Denver and Colorado: what signature dish would you bring to a friendly food battle?\n\nQTime is researching possible Roll''n Wars participants. This is a conversation starter only; no event date, venue, or participation has been confirmed.', 'Comment with the food truck you want to see featured. Approval required before posting.', 'street_festival'),
    (date '2026-07-30', 'qtime-week-social-3', 'Social 3 - Venue partner angle', 'THE RIGHT ROOM CHANGES THE STORY', 'A draft venue-partner message for review.', E'A great food competition needs a setting with room for flavor, conversation, and community.\n\nQTime is researching Denver-area venues that could fit a future Roll''n Wars production. No venue partnership or availability is confirmed.', 'Know a venue that belongs in the conversation? Share it with QTime for review.', 'broadcast'),
    (date '2026-07-31', 'qtime-week-social-4', 'Social 4 - Audience prompt', 'PICK THE MATCHUP', 'Which flavor face-off would you watch?', E'Tacos vs. chicken and waffles? Mediterranean plates vs. gourmet burgers?\n\nRoll''n Wars is a draft concept, and the matchup list is still being researched. Tell QTime which kind of food story you would watch.', 'Save this prompt for an approved audience post. No matchup is confirmed.', 'street_festival'),
    (date '2026-08-01', 'qtime-week-social-5', 'Social 5 - Review checkpoint', 'BUILT FOR FOOD. MADE FOR PEOPLE.', 'A review-stage closing post.', E'Behind every great food business is a story worth hearing. QTime is reviewing the first Roll''n Wars creative directions and researching possible partners for a future production.', 'QTime approval is required before this draft is posted or shared.', 'premium_editorial')
) as seed(draft_date, slot, title, headline, supporting_text, caption, call_to_action, visual_style)
where organizations.slug = 'qtime-productions'
on conflict (organization_id, draft_date, slot) do update
set
  title = excluded.title,
  headline = excluded.headline,
  supporting_text = excluded.supporting_text,
  caption = excluded.caption,
  call_to_action = excluded.call_to_action,
  platforms = excluded.platforms,
  visual_style = excluded.visual_style,
  status = excluded.status,
  metadata = excluded.metadata,
  updated_at = now();

insert into public.organization_content_draft_events (
  draft_id, organization_id, event_type, note, actor_label
)
select
  drafts.id,
  drafts.organization_id,
  'created',
  'MICAH prepared this social draft for QTime review. It has not been published.',
  'Atlas / MICAH'
from public.organization_content_drafts drafts
join public.organizations organizations on organizations.id = drafts.organization_id
where organizations.slug = 'qtime-productions'
  and drafts.metadata ->> 'package' = 'qtime-week-2026-07-28'
  and drafts.metadata ->> 'asset_type' = 'social_post'
  and not exists (
    select 1
    from public.organization_content_draft_events events
    where events.draft_id = drafts.id
      and events.event_type = 'created'
      and events.note like 'MICAH prepared this social draft%'
  );

update public.organization_pilot_deliverables deliverables
set
  summary = 'This week: exactly three Roll''n Wars flyer concepts, five researched venue prospects, five researched food-truck prospects, and five social drafts ready for QTime review.',
  body = 'Package status: ready for review. MICAH prepared exactly three flyer concepts plus five social drafts for the week of July 28, 2026. HUNTER added five venue prospects and five food-truck prospects with concise public source links. All copy, research, and outreach steps are drafts only: no contact, publishing, event commitment, availability, performance result, or successful outreach is claimed. QTime approval and missing event details are required before DAVID prepares any outreach or MICAH publishes anything.',
  status = 'ready_for_review',
  updated_at = now()
from public.organizations organizations
where deliverables.organization_id = organizations.id
  and organizations.slug = 'qtime-productions'
  and deliverables.title = 'Roll''n Wars content sample package';

commit;
