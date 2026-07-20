alter table public.business_assessment_submissions
  add column if not exists monthly_lead_volume text,
  add column if not exists follow_up_speed text,
  add column if not exists pilot_budget text,
  add column if not exists preferred_contact_method text;

comment on column public.business_assessment_submissions.monthly_lead_volume is
  'Self-reported monthly new-lead volume from the Atlas website assessment.';
comment on column public.business_assessment_submissions.follow_up_speed is
  'Self-reported average lead follow-up speed from the Atlas website assessment.';
comment on column public.business_assessment_submissions.pilot_budget is
  'Self-reported realistic budget range for a potential Atlas pilot.';
comment on column public.business_assessment_submissions.preferred_contact_method is
  'Preferred follow-up method for the assessment submitter.';
