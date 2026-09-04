# Trial workspace provisioning — re-smoke

After deploying the fix (app + migration `20260904150000_trial_workspace_service_role_grants.sql`):

## 1. Apply the migration

In Supabase SQL Editor, run:

```text
supabase/migrations/20260904150000_trial_workspace_service_role_grants.sql
```

## 2. Existing smoke account

1. Open https://atlasforentrepreneurs.com/login
2. Sign in as `atlasforentrepreneurs+smoke-den-0904b@gmail.com` / `AtlasQa!20260904b`
3. Expect redirect to `/client` with **no** `error=workspace_setup` query param
4. Expect workspace name like **Smoke Den HVAC** (not the unassigned banner)
5. Refresh `/client` directly — must **not** hit `ERR_TOO_MANY_REDIRECTS`

## 3. Fresh trial (optional)

1. Sign up at `/start-trial` with a new plus-address email
2. Confirm email from inbox
3. Land on `/client?status=welcome` with an assigned workspace

## 4. Failure path (staging only)

If provisioning is forced to fail, `/client?error=workspace_setup&reason=<reason>` should render **once** with a rose alert and **no** redirect loop. Valid reasons: `lookup_failed`, `create_failed`, `membership_failed`, `missing_identity`.

## 5. Logs

On failure, Netlify function logs should include Supabase `code` and `message` under scopes:

- `Atlas trial workspace membership lookup failed`
- `Atlas trial organization insert failed`
- `Atlas trial membership creation failed`
- `Atlas trial workspace creation failed`
