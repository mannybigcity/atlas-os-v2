-- SIS Custom Creations party availability.
-- One morning block and one afternoon block per day.
-- AM is 9:00–1:00 and PM is 2:00–6:00 in America/Chicago.
-- Tentative and confirmed rows occupy the block. Cancelled and not_scheduled do not.
-- Follow-up dates (next_action_due) are not holds.
-- This changes only organization_sis_party_events. AFE and sample desks are untouched.
--
-- Hosted Supabase does not always apply repo files on its own.
-- Run this file in the Supabase SQL editor before using the purple calendar.

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

comment on column public.organization_sis_party_events.party_slot is
  'SIS paint-party block: am = 9:00-1:00 America/Chicago, pm = 2:00-6:00. Occupied when calendar_status is tentative or confirmed.';

create unique index if not exists organization_sis_party_events_open_slot_uidx
  on public.organization_sis_party_events (organization_id, preferred_date, party_slot)
  where calendar_status in ('tentative', 'confirmed')
    and party_slot is not null
    and preferred_date is not null;
