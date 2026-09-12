# Handoff: leads, follow-up, and Amanda (for Grok Bot)

> Update 2026-09-12 (later): PR #79 is merged and Batch C shipped as PR #80. For how to work and the current
> backlog, read `docs/HANDOFF_GROKBOT_OPERATING.md` first. Sections 2, 3, and 5 below are still accurate.

Written 2026-09-12 by the Cursor agent that built Batches 1–3 (merged, PR #72) and Batches A–B (open, PR #79).
Read this before touching anything under `src/lib/lions-den`, `src/server/leads`, `src/server/hunter`, or `src/app/go`.

## 1. Your first job: merge PR #79

- PR: https://github.com/mannybigcity/atlas-os-v2/pull/79
- Head: `cursor/afe-trial-conversion-0cb3` at `dbecb45` (or later). Base: `launch/afe-emergency-revenue-20260822`.
- **No migration.** Uses existing tables/columns only.
- Before merging, run locally (Node 20+):
  ```bash
  npm install --no-audit --no-fund --legacy-peer-deps   # plain `npm ci` fails on a typescript@6 beta peer conflict
  npx tsc --noEmit --incremental false
  npx eslint src
  npm test
  npx next build
  ```
  Expected: tsc/eslint clean, build lists the `/go/[slug]` route, tests 299/300. The one failing test is `src/server/sis-capture-card/intake.test.ts`; it fails on the base branch too. Leave it.
- After merge, confirm in Netlify production env: `RESEND_API_KEY`, `ATLAS_NOTIFICATION_FROM`, `NEXT_PUBLIC_SITE_URL=https://atlasforentrepreneurs.com`, `FOUNDER_MAILBOX_EMAIL`. Without Resend vars the lead still saves; only the two emails are skipped.
- Smoke test after deploy: open `https://atlasforentrepreneurs.com/go/<any-org-slug>` logged out, submit a fake lead, confirm it appears on `/client/prospects` with the **Inbound · hot** badge and the owner receives the email.

## 2. What exists now (the funnel)

```
HUNTER search  ->  REVIEW PILE  ->  Accept  ->  Prospects  ->  Follow-up desk  ->  Contacted -> Quoted -> Won (Clients)
                                                      ^
Public lead page /go/{slug}  ->  Inbound · hot prospect (stage "responded", due today) + owner email + Amanda receipt
```

| Piece | Where | Notes |
|---|---|---|
| Trade -> referral targets | `src/lib/lions-den/trial-desk-market.ts` (`REFERRAL_TARGETS`, `referralTargetsForVertical`, `isSelfSearch`, `hunterSearchDefaultsFromMarket`) | HUNTER defaults to the top referral partner (e.g. `property management company`), never the owner's own trade. `market.serviceQuery` is still the owner's trade and drives MICAH/seed copy. Do not swap them. |
| HUNTER form | `src/components/hunter-search.tsx` | Controlled `service` input; chips `data-hunter-target`; self-search banner `data-hunter-self-search`. |
| Public lead page | `src/app/go/[slug]/page.tsx` | No auth. `robots: index:false`. Honeypot field is `name="company"`. `/go` must stay out of `protectedRoutes` in `src/proxy.ts`. |
| Lead action | `src/server/leads/actions.ts` (`submitInboundLead`) | Service-role insert into `organization_opportunities`; writes a `created` event; owner email idempotency key `atlas-inbound-owner-{id}`, Amanda receipt `atlas-inbound-reply-{id}`. Redirects to `/go/{slug}?lead=sent`. |
| Lead copy + row shape | `src/lib/lions-den/inbound-leads.ts` | Pure functions, fully unit-tested. Change copy here, not in the action. |
| Lead mail sender | `src/server/leads/email.ts` | Small Resend wrapper. `src/server/notifications/resend.ts` is intentionally untouched. |
| Lead link card | `src/components/lions-den/inbound-lead-link-card.tsx`, rendered in `src/app/client/prospects/page.tsx` | Hidden for SIS orgs (`isSisOrganization`). |
| Follow-up desk | `src/components/lions-den/lions-den-follow-up.tsx`, `src/lib/lions-den/follow-up-drafts.ts`, `src/server/opportunities/actions.ts` (`markFollowUpSent`) | Email/Text/Copy buttons open the owner's own apps. "I sent this" -> stage `contacted`, 3-day check-in draft. Atlas transmits nothing. |
| Prospect stages | `src/lib/lions-den/prospect-stages.ts` | Owner-facing labels map onto the DB enum. |

DB enums you must respect (`organization_opportunities`):
- `stage`: researching, qualified, needs_client_input, ready_for_follow_up, follow_up_queued, contacted, responded, won, lost, archived
- `opportunity_type`: sponsor, food_truck, venue, partner, media, customer, other
- `owner_role`: atlas, hunter, micah, david, client, manual
- `research_summary` 10–3000 chars; `next_action` 5–1200 chars; `next_action_due` is a `date` (YYYY-MM-DD).
- `organization_opportunity_events.event_type`: created, research_added, next_action_set, follow_up_queued, contacted, reply_received, won, lost, note_added

## 3. Hard rules (do not break these)

1. **Atlas never cold-texts or cold-calls anyone.** No SMS to consumers without prior written consent (TCPA). Cold **B2B email** to businesses is acceptable with a working opt-out. Replies to an inbound request (Amanda's receipt) are fine.
2. **Every outbound message needs owner approval** before it is sent. Drafts, yes. Auto-send, no, until the owner clicks approve.
3. **Never invent data.** No fake phone numbers, websites, or business names. If Google did not publish a phone, say so.
4. **No new npm dependencies** without a reason written in the PR. `npm ci` already breaks on a peer conflict; do not make it worse.
5. **Bilingual.** Every user-facing string has an EN and ES branch (`spanish ? "…" : "…"`).
6. **Tests are file-content contracts.** Many tests `readFileSync` a component and `assert.match` on copy. If you change copy, update the matching test in the same commit.
7. **Migrations** go in `supabase/migrations/` with a timestamp prefix, idempotent (`if not exists`), and get listed in the PR body.

## 4. Next batches, in order

### Batch C — Amanda outbound (highest value, no Twilio needed)
Goal: the referral partners HUNTER finds get a short, approved B2B email from the owner's business, and their replies land in the desk.

- New table `organization_outreach_sequences` (org_id, opportunity_id, channel `email`, steps jsonb, status draft/approved/sending/paused/done, approved_at, approved_by) and `organization_outreach_messages` (sequence_id, step, to_email, subject, body, resend_id, sent_at, opened_at, replied_at). Idempotent migration.
- Amanda drafts a 3-step sequence per accepted prospect (intro, value one-liner, "should I stop?"). Draft copy lives in a pure module like `follow-up-drafts.ts` so it is unit-testable. Signed "Amanda, on behalf of {business}". Include a plain opt-out line.
- Owner approves per sequence on the Follow-up desk. Only approved sequences send.
- Sending: Netlify scheduled function (pattern: `netlify/functions/daily-content-studio.mjs`, registered in `netlify.toml`) runs daily, sends the next due step via Resend with `Reply-To` set to an inbound address.
- Replies: Resend inbound webhook -> Netlify function -> match by `to`/`in-reply-to` -> set opportunity stage `responded`, event `reply_received`, pause the sequence, email the owner. Resend receipts (`email.opened`, `email.bounced`) are optional.
- UI: sequence status on the prospect detail page; "Amanda drafted 3 emails. Approve to send." button.

### Batch D — Phone/SMS (blocked: owner has no Twilio account yet)
- Buy a local number per org, forward to the owner's cell, voicemail transcription emailed to the owner.
- Two-way SMS only for numbers that texted in first (inbound consent).
- Later: Amanda answers the phone (Twilio Voice + an LLM). Do not start this until Twilio credentials exist in Netlify env.

### Earlier deferred items
- Batch 4: lifecycle emails (day 1, day 5, last day, expired) via a scheduled Netlify function + Resend; read-only mode for expired trials (`src/server/client-workspace/context.ts` currently redirects expired trials to `/pricing?trial=expired`, and `src/app/pricing/page.tsx` ignores that param).
- Batch 5: MICAH real image generation + weekly download.
- Batch 6: GitHub Actions CI (tsc, eslint, test, build), remove the stray tmp client file, pin deps so `npm ci` works again.

## 5. Working conventions used so far

- Branch naming: `cursor/<topic>-0cb3`. Base every PR on `launch/afe-emergency-revenue-20260822`.
- One PR per batch or two small batches. PR body: What this fixes / per-batch bullets / Migrations / Tests / Still to come.
- Node test runner: `node --test --experimental-strip-types`; test files import siblings with the `.ts` extension.
- Server actions live in `src/server/<area>/actions.ts` with `"use server"`; pure helpers in `src/lib/…` so they can be unit-tested without Supabase.
- The owner (Manny) is not a developer. Explain what a change does for a plumber in Cypress, TX, not what it does to the code.
