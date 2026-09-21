-- One morning snapshot of Today's 5 per desk. Replaced when the owner's
-- local date changes so Google Places is not called on every desk open.
alter table public.organization_desk_settings
  add column if not exists todays_five jsonb;
