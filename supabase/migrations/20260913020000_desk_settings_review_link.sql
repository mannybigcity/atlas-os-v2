-- Owner's Google review link. Used to prefill the review-and-referral ask
-- that the desk queues three days after a prospect is marked won.
alter table public.organization_desk_settings
  add column if not exists review_link text
  check (review_link is null or length(btrim(review_link)) between 3 and 500);
