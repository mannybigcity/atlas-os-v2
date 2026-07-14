# Founding Pilot Deployment and Isolation Gate

This checklist moves the Step 2 pilot workflow from local code into production
without provisioning QTIME prematurely. Complete it in order.

## 1. Apply the database migration

In the Supabase SQL Editor, run the complete contents of:

`supabase/migrations/20260713000000_founding_pilot_workflow.sql`

Then run these follow-up migrations in order:

1. `supabase/migrations/20260713001000_pilot_review_identity.sql`
2. `supabase/migrations/20260713002000_pilot_work_message_history.sql`

Expected result: `Success. No rows returned.`

Then refresh the Supabase Security Advisor. The migration should not introduce
new errors or warnings.

## 2. Deploy the application

Commit and push the Step 2 files to `main`. Wait for Netlify to show a published
production deploy for that commit. Do not click **Publish deploy** when Netlify
already labels the deploy **Published**.

## 3. Smoke-test with Atlas Test Organization

Before QTIME exists:

1. Sign in as Atlas Super Admin and open `/lions-den`.
2. Save a test 30-day plan for Atlas Test Organization.
3. Add three test actions.
4. Add one draft item under **Work for Client Review**. Confirm it is visible
   in the Lion's Den.
5. Sign in as the test client. Confirm the draft is not visible.
6. As Super Admin, change the work to `Ready for client review`.
7. As the test client owner/admin, request changes and enter a clear note.
8. As Super Admin, confirm the client's name, note, date, and time appear.
9. Revise the work and send it for review again.
10. As the test client, confirm the prior request remains in the message trail,
    the Atlas revision has its own timestamp, and the new message box is blank.
11. Approve the revised work, then confirm the approval is added to the trail.

Stop if any item fails.

## 4. Provision QTIME only after the smoke test passes

Use Supabase Authentication to create or invite Quincy with
`quincy@qtimeproductions.com`. Never choose or request his password. Record his
Auth user UUID, then run this in the SQL Editor after replacing
`QUINCY_AUTH_USER_ID`:

```sql
begin;

with qtime as (
  insert into public.organizations (name, slug)
  values ('QTIME Productions', 'qtime-productions')
  on conflict (slug) do update set name = excluded.name
  returning id
)
insert into public.organization_memberships (organization_id, user_id, role)
select id, 'QUINCY_AUTH_USER_ID'::uuid, 'owner'
from qtime
on conflict (organization_id, user_id)
do update set role = excluded.role;

commit;
```

Do not enter QTIME's business information until Quincy has authorized the pilot
scope and data use.

## 5. Cross-tenant isolation test

Use a private/incognito browser as Quincy:

1. Sign in through the production Atlas URL.
2. Confirm the workspace title is **QTIME Productions**.
3. Confirm no Atlas Test Organization messages, actions, work for review,
   history, or business profile data appear.
4. Open `/lions-den` directly. Confirm access is denied and the client workspace
   loads safely.
5. Sign out and confirm the public home page loads.

Then sign in as Atlas Super Admin:

1. Confirm both organizations appear in the Lion's Den.
2. Add a QTIME-only test action.
3. Sign back in as the test client and confirm the QTIME action is not visible.
4. Sign in as Quincy and confirm only the QTIME action is visible.

Record the test date, tester, accounts used, and pass/fail result. If any
cross-tenant data appears, stop onboarding immediately and do not send Quincy
credentials.

## 6. First approved pilot records

After Quincy confirms the scope, use the Lion's Den to enter:

- one 30-day goal;
- one plain-language success definition;
- the next check-in date;
- no more than three current actions; and
- the first item under **Work for Client Review** as a draft.

Only change work to **Ready for client review** after Manny has checked every
fact, source, claim, and recommendation.
