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

1. Create the user in Supabase Authentication using a strong random temporary
   password that is never sent to the customer and never placed in Git/chat.
2. Create a separate organization for the customer's company.
3. Add an `owner` membership connecting that user to the organization.
4. Send one password-recovery email from production `/forgot-password` so the
   customer chooses their own password.
5. Confirm the link opens the production `/reset-password` flow.
6. Never ask the customer to send their password to Atlas staff.

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

