-- Paste-ready production membership attach for the sample desk login.
-- Run only AFTER the Auth user exists. This file does not set a password.
--
-- Netlify / server env names (never put the password in git):
--   DEMO_LOGIN_EMAIL     (optional; defaults to atlasforentrepreneurs+demo@gmail.com)
--   DEMO_LOGIN_PASSWORD  (required for Show the desk)
--
-- Login is the Gmail plus-address. Mail arrives at the founder Gmail inbox.
-- Do not attach atlasforentrepreneurs@gmail.com itself — that mailbox stays DEMO-free.
-- Creating the Auth user: use scripts/provision-sample-desk-login.mjs
-- with SUPABASE_SERVICE_ROLE_KEY, NEXT_PUBLIC_SUPABASE_URL, and DEMO_LOGIN_PASSWORD.

delete from public.organization_memberships memberships
using public.organizations sample, auth.users users
where memberships.organization_id = sample.id
  and memberships.user_id = users.id
  and lower(coalesce(sample.slug, '')) = 'afe-crm-demo'
  and not public.is_sis_protected_organization(sample.name, sample.slug)
  and lower(coalesce(users.email, '')) is distinct from 'atlasforentrepreneurs+demo@gmail.com';

insert into public.organization_memberships (organization_id, user_id, role)
select
  organizations.id,
  users.id,
  'owner'
from public.organizations
join auth.users users
  on lower(users.email) = 'atlasforentrepreneurs+demo@gmail.com'
where lower(coalesce(organizations.slug, '')) = 'afe-crm-demo'
  and not public.is_sis_protected_organization(organizations.name, organizations.slug)
  and lower(coalesce(users.email, '')) <> 'atlasforentrepreneurs@gmail.com'
  and not exists (
    select 1
    from public.organization_memberships memberships
    where memberships.organization_id = organizations.id
      and memberships.user_id = users.id
  );
