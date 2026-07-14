# Founding Customer Onboarding

Use this process for QTIME PRODUCTIONS and other controlled founding-customer
pilots. Never store passwords, payment-card data, government IDs, or unrelated
confidential records in Atlas.

## Pilot intake

Collect only:

- Preferred customer name
- Business email
- Organization display name
- Time zone
- One-sentence business description
- Primary 30-day goal
- Top three current priorities
- Biggest operational pain point
- Written confirmation that the customer understands Atlas is an early pilot

The customer should enter business context after signing in whenever possible.

## Account creation

Account provisioning remains manual for the controlled pilot:

1. Create a separate organization for the customer's company.
2. In Supabase Authentication, use **Send invitation** for the customer's
   business email. Supabase creates the Auth user and sends a one-time link;
   Atlas never creates or emails a password.
3. Immediately add an `owner` membership connecting that Auth user to the
   correct organization before telling the customer to open the invitation.
4. Confirm the email button says **Accept invitation and create password** and
   opens production `/auth/confirm`, followed by `/set-password`.
5. The customer uses their email address as the login name and creates their
   own password. Never ask them to send that password to Atlas staff.
6. For an existing pre-provisioned user such as Quincy, send one new password
   reset only after the Reset password template and production URL settings
   have been verified.

Before sending any invitation or reset email, verify:

- Supabase **Site URL** is the live Atlas HTTPS origin.
- The Invite user and Reset password templates contain only the secure Atlas
  links documented in `docs/SUPABASE_SETUP.md`.
- The user's organization membership already points to the correct business.
- The link is tested with an Atlas-owned test user before it is sent to a real
  client.

## Data-isolation gate

Before sharing access:

1. Sign in as the QTIME pilot account.
2. Confirm only the QTIME organization is visible.
3. Confirm Atlas Test Organization data is not visible.
4. Attempt `/lions-den` and confirm safe denial.
5. Sign in as Super Admin and confirm QTIME appears in The Lion's Den.

If any isolation check fails, stop onboarding and do not enter customer data.

## First-session agenda

- Confirm the display name and organization name.
- Let the customer enter the business profile.
- Create the first real note conversation.
- Explain that `@Atlas` requests human Atlas Admin attention.
- State clearly that AI automation is not active yet.
- Record feedback without promising unbuilt features or dates.

## Legacy Atlas v1 data

Do not bulk-import Atlas v1 data. Inventory it first and migrate only approved,
useful business context. Exclude credentials, logs, generated content,
duplicates, and unverified records.
