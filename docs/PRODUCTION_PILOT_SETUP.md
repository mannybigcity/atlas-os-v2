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
https://YOUR-DOMAIN/reset-password
https://YOUR-DOMAIN/client
https://YOUR-DOMAIN/lions-den
```

3. Keep `http://localhost:3000/**` as an additional development redirect.
4. Do not use a broad production wildcard.

In **Supabase > Authentication > Emails > Reset password**, use the
server-verifiable recovery link:

```html
<a href="{{ .RedirectTo }}?token_hash={{ .TokenHash }}&amp;type=recovery&amp;next=/reset-password">Reset password</a>
```

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
- Sign out clears the production session.
- Security response headers are present.
- No credentials or secrets appear in deployment logs.

## Cost posture

- Netlify Free: start at $0; automatic recharge remains off.
- Supabase Free: acceptable for the controlled pilot with manual recovery
  planning; reconsider after customer two or when availability demands it.
- AI/API spend: $0 because no AI feature is enabled.
