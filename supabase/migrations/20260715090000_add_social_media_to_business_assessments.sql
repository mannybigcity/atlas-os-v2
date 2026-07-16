-- Atlas OS v2 - Social media context for business assessments
-- Captures public social links or handles used to review a prospect's presence.

alter table public.business_assessment_submissions
  add column if not exists social_media text
  check (
    social_media is null
    or length(btrim(social_media)) between 3 and 1500
  );
