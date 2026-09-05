# Production Pilot Setup

This checklist prepares Atlas OS v2 for one controlled paying-customer pilot.
It is not approval for a public launch.

## Hosting decision

Use Netlify's Free plan for the first pilot:

- Next.js App Router, Server Actions, middleware, and SSR are supported by
  Netlify's maintained OpenNext adapter.
- Custom domains and HTTPS are included.
- Keep automatic credit recharge disabled to prevent surprise spending.

Vercel Hobby is not used because its current terms restrict it to
non-commercial personal use.

## Deploy from the private GitHub repository

1. Create or sign in to the Atlas Netlify account.
2. Select **Add new project > Import an existing project**.
3. Connect GitHub and select `mannybigcity/atlas-os-v2`.
4. Confirm the production branch is `main`.
5. The committed `netlify.toml` runs `npm run build` and publishes `.next`.
6. Do not deploy until the environment variables below are configured.

## Production environment variables

Add these in **Netlify > Project configuration > Environment variables**:

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
NEXT_PUBLIC_SITE_URL
ATLAS_SUPER_ADMIN_EMAILS
```

Rules:

- `NEXT_PUBLIC_SITE_URL` must be the exact HTTPS production origin with no
  path, such as `https://app.example.com`.
- Use the Supabase anon/publishable key only. Do not add a service-role key.
- Never place real values in Git, `.env.example`, screenshots, or chat.

## Supabase Auth URL configuration

In **Supabase > Authentication > URL Configuration**:

1. Set **Site URL** to the exact production HTTPS origin.
2. Add these exact production redirect URLs:

```text
https://YOUR-DOMAIN/login
https://YOUR-DOMAIN/auth/callback
https://YOUR-DOMAIN/auth/confirm
https://YOUR-DOMAIN/set-password
https://YOUR-DOMAIN/reset-password
https://YOUR-DOMAIN/client
https://YOUR-DOMAIN/lions-den
```

3. Keep `http://localhost:3000/**` as an additional development redirect.
4. Do not use a broad production wildcard.

Keep both production origins allowed while the custom domain is being moved:

```text
https://atlasforentrepreneurs.com/auth/confirm
https://atlas-os-v2.netlify.app/auth/confirm
```

In **Supabase > Authentication > Emails > Invite user**, use:

```html
<h2>Welcome to Atlas</h2>
<p>Your private Atlas client workspace is ready.</p>
<p><a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&amp;type=invite&amp;next=/set-password">Accept invitation and create password</a></p>
<p>Your login email is the address where you received this invitation. Atlas never sends passwords by email.</p>
```

In **Supabase > Authentication > Emails > Confirm signup**, use:

```html
<h2>Confirm your Atlas email</h2>
<p><a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&amp;type=email&amp;next=/client%3Fstatus%3Dwelcome">Confirm email address</a></p>
<p>Atlas will open The Lion's Den after confirmation.</p>
```

In **Supabase > Authentication > Emails > Reset password**, use:

```html
<h2>Reset your Atlas password</h2>
<p><a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&amp;type=recovery&amp;next=/reset-password">Create a new password</a></p>
```

Do not use `{{ .ConfirmationURL }}` for these templates. Email security
scanners can prefetch that one-click URL and consume the one-time token before
the user opens it. The token-hash links above only verify after the user presses
the Atlas confirmation button.

These links open a confirmation page first. Atlas verifies the one-time token
only after the user presses the secure confirmation button. Signup confirmation
opens The Lion's Den at /client; invitations open the create-password page; reset
emails open the reset-password page.

## Supabase production checks

Before QTIME data is entered:

- Run Supabase Security Advisor and resolve critical findings.
- Verify RLS is enabled on every `public` table.
- Enable MFA on the Atlas Supabase and GitHub administrator accounts.
- Enable database SSL enforcement if available for the project plan.
- Keep public signup disabled.
- Record the current Auth email rate limit.
- Document a weekly manual database export until managed downloadable backups
  are available.

## Deployment validation

Validate in production:

- `/` and `/login` load over HTTPS.
- Logged-out `/client` and `/lions-den` requests redirect to login.
- A client cannot access `/lions-den`.
- Super Admin lands on `/lions-den` after a normal login.
- Password-recovery links return to the production domain.
- Invitation links open **Create your Atlas password**, then open the correct
  private client workspace.
- Sign out clears the production session.
- Security response headers are present.
- No credentials or secrets appear in deployment logs.

## Cost posture

- Netlify Free: start at $0; automatic recharge remains off.
- Supabase Free: acceptable for the controlled pilot with manual recovery
  planning; reconsider after customer two or when availability demands it.
- AI/API spend: $0 because no AI feature is enabled.
