-- Google Places Text Search already returns the published phone number with
-- every HUNTER result (the field mask pays for it). Until now the review pile
-- dropped it and fetched Place Details again on Accept, so the salesman could
-- not see a phone until after accepting. Keep the number with the find.
alter table public.organization_hunter_review_items
  add column if not exists phone text
    check (phone is null or length(btrim(phone)) between 7 and 80);
