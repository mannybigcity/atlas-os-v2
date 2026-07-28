-- Reconcile the Q-Time package against the live tenant's existing pilot labels.
-- Preserve prior research history by archiving superseded shortlist rows.

begin;

update public.organization_opportunities opportunities
set
  stage = 'archived',
  metadata = opportunities.metadata || jsonb_build_object(
    'superseded_by_package', 'qtime-week-2026-07-28',
    'archive_reason', 'Replaced by the five source-backed venue and food-truck prospects in the weekly package.'
  ),
  updated_at = now()
from public.organizations organizations
where opportunities.organization_id = organizations.id
  and organizations.slug = 'qtime-productions'
  and opportunities.name in (
    'Food Truck Battles food truck shortlist',
    'Food Truck Battles venue shortlist'
  )
  and opportunities.stage <> 'archived';

update public.organization_pilot_deliverables deliverables
set
  title = 'Food Truck Battles launch package',
  summary = 'This week: exactly three Roll''n Wars flyer concepts, five researched venue prospects, five researched food-truck prospects, and five social drafts ready for QTime review.',
  body = 'Package status: ready for review. MICAH prepared exactly three flyer concepts plus five social drafts for the week of July 28, 2026. HUNTER added five venue prospects and five food-truck prospects with concise public source links. All copy, research, and outreach steps are drafts only: no contact, publishing, event commitment, availability, performance result, or successful outreach is claimed. QTime approval and missing event details are required before DAVID prepares any outreach or MICAH publishes anything.',
  status = 'ready_for_review',
  updated_at = now()
from public.organizations organizations
where deliverables.organization_id = organizations.id
  and organizations.slug = 'qtime-productions'
  and deliverables.title = 'Food Truck Battles launch package';

commit;
