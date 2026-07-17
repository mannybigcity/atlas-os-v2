# Atlas release checklist — July 16, 2026

This is the one-deploy checklist for the current Atlas website, CRM, public assessment, public chat preview, and QTime Productions client workspace.

## Release rule

Do not push or trigger a Netlify production deploy until the database steps below are complete. The website code expects the new database functions to exist.

## 1. Production database steps

Run these files in the Supabase SQL Editor, in this order:

1. `supabase/migrations/20260716110000_atlas_public_chat_server_limit.sql`
2. `supabase/migrations/20260716120000_atlas_client_access_roster.sql`

`Success. No rows returned` is the expected result for both migrations.

The first migration enforces the three-question public preview limit on the server. The second gives the Atlas Super Admin a private client-access roster for confirming invitations and sign-ins.

## 2. Netlify environment check

Required variables already used by production:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_SITE_URL`
- `ATLAS_SUPER_ADMIN_EMAILS`
- `OPENAI_API_KEY`
- `OPENAI_MODEL`

Optional notification variables:

- `RESEND_API_KEY`
- `ATLAS_NOTIFICATION_EMAIL`
- `ATLAS_NOTIFICATION_FROM`
- `SUPABASE_SERVICE_ROLE_KEY` — required only for the scheduled private chat digest

Never prefix the OpenAI, Resend, or Supabase service-role secrets with `NEXT_PUBLIC_`.

## 3. Local verification completed

- ESLint: passed
- Next.js production build and TypeScript: passed
- Public routes: returned HTTP 200
- Client and Super Admin routes while signed out: redirected to login
- Private/auth routes: excluded from search indexing
- Security headers: present
- Assessment accessibility: question labels, required radio groups, autofill hints, and announced errors added
- Dependency audit: two moderate findings remain in Next.js's bundled PostCSS 8.4.31. Atlas does not process user-supplied CSS, and the automated audit fix would perform an unsafe framework downgrade. Track for a stable Next.js fix.

## 4. One deployment

After Manny approves the release:

```powershell
git push origin main
```

Netlify should build the newest commit from `main`. Do not manually trigger extra deploys while that build is running.

## 5. Live smoke test

Verify these pages after Netlify reports `Published`:

- `/`
- `/assessment`
- `/login`
- `/forgot-password`
- `/privacy`
- `/terms`
- `/responsible-ai`
- `/accessibility`

Then verify:

1. Submit one public assessment and confirm it appears in `business_assessment_submissions` and the Atlas sales CRM.
2. Ask Atlas one public question and confirm the response is stored in `atlas_public_chat_turns`.
3. Confirm the fourth public question in the same browser is blocked and sends the visitor to the assessment.
4. Sign in as Atlas Super Admin and open the Lion's Den and sales CRM.

## 6. QTime acceptance test

After Quincy accepts the invitation and sets a password:

1. Quincy signs in at `/login`.
2. Quincy sees only the QTime Productions workspace.
3. Quincy can update the business profile and send an organization note.
4. Quincy can submit a review decision on QTime work.
5. `/lions-den` redirects Quincy back to the client workspace with access denied.
6. Sign out and sign back in once.
7. Atlas Super Admin confirms the QTime organization, owner membership, confirmed email, and last sign-in time in the client-access roster.

Do not add a second paying client until this isolation test passes.

