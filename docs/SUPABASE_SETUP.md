# Supabase Setup

This document describes the manual Supabase setup required for the Atlas OS v2 authentication foundation.

## Packages used

Atlas uses the current Supabase SSR pattern for Next.js:

- `@supabase/supabase-js`
- `@supabase/ssr`

Deprecated auth-helper packages are intentionally not used.

## Create or open the Supabase project

1. Open the Supabase dashboard.
2. Create a new project or open the Atlas project.
3. Go to **Project Settings > API**.
4. Copy:
   - Project URL
   - Project API anon public key

Do not copy or use the service-role key in this application milestone.

## Configure local environment

Create `.env.local` from `.env.example`:

```bash
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-public-key
NEXT_PUBLIC_SITE_URL=http://localhost:3000
ATLAS_SUPER_ADMIN_EMAILS=info@atlasforentrepreneurs.com
```

Do not commit `.env.local`.

## Enable Email and Password authentication

1. Go to **Authentication > Providers**.
2. Enable **Email**.
3. Enable password-based sign-ins.
4. Magic Links are intentionally out of scope for this milestone.

## Configure URLs

For local development, add:

```text
http://localhost:3000
```

If Supabase asks for redirect URLs, add:

```text
http://localhost:3000/login
http://localhost:3000/auth/callback
http://localhost:3000/auth/confirm
http://localhost:3000/set-password
http://localhost:3000/reset-password
http://localhost:3000/client
http://localhost:3000/lions-den
```

Atlas uses `/auth/confirm` as a deliberate confirmation page for hashed,
one-time Supabase invitation and recovery tokens. The token is verified
server-side only after the user presses the secure confirmation button. An
invitation continues to `/set-password`; password recovery continues to
`/reset-password`.

In **Authentication > Emails > Invite user**, use:

```html
<h2>Welcome to Atlas</h2>
<p>Your private Atlas client workspace is ready.</p>
<p><a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&amp;type=invite&amp;next=/set-password">Accept invitation and create password</a></p>
<p>Your login email is the address where you received this invitation. Atlas never sends passwords by email.</p>
```

In **Authentication > Emails > Reset password**, use:

```html
<h2>Reset your Atlas password</h2>
<p><a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&amp;type=recovery&amp;next=/reset-password">Create a new password</a></p>
```

Keep the rest of the email content concise and do not expose the token anywhere
other than this link.

When Atlas is deployed, add the production equivalents for the live domain.
Set both the Supabase **Site URL** and `NEXT_PUBLIC_SITE_URL` to that exact
HTTPS origin. Email templates use this configured origin instead of links to
the public sales-page buttons.

## Create the Super Admin user

Create or invite this user in Supabase Auth:

```text
info@atlasforentrepreneurs.com
```

This milestone authorizes Super Admin access through the `ATLAS_SUPER_ADMIN_EMAILS` environment variable. No role, profile, organization, or permissions tables are created yet.

## Current protected routes

- `/client` requires any authenticated Supabase user.
- `/lions-den` requires an authenticated Supabase user whose email is listed in `ATLAS_SUPER_ADMIN_EMAILS`.
- `/forgot-password` requests a Supabase password recovery email.
- `/set-password` lets an invited user create a password after accepting a
  valid invitation.
- `/reset-password` updates the password only after a valid recovery session exists.

Authenticated non-admin users who visit `/lions-den` are redirected to `/client?access=denied`.

## Out of scope

This milestone does not add:

- Database tables
- Organizations/workspaces
- Profiles
- Billing
- AI retrieval
- Document storage
- Service-role keys
