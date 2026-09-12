-- The owner's own way to get paid (Zelle, Square, Stripe link, or a plain line).
-- Rides along in every quote the desk writes. No money moves through Atlas.
alter table public.organization_desk_settings
  add column if not exists pay_link text
    check (pay_link is null or length(btrim(pay_link)) between 3 and 500);
