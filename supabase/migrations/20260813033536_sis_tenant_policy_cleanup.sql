-- Remove the original fulfillment FOR ALL policy so the table has one
-- member-read policy and separate manager INSERT/UPDATE policies.
drop policy if exists "SIS managers can manage fulfillment jobs"
on public.organization_sis_fulfillment_jobs;
