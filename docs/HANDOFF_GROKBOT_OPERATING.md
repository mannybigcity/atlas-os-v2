# Grok Bot operating handoff: take over the AFE build

Written 2026-09-12 by the Cursor agent (Fable) after shipping Batches 1–3 (PR #72), A–B (PR #79), and C (PR #80).
Manny is moving day-to-day building to Grok Bot to save Cursor usage. This document is how to think and work
so the output stays the same. It supersedes the "next batches" section of `docs/HANDOFF_GROKBOT_LEADS.md`;
that file is still the correct map of the lead funnel and the DB enums, so keep both.

Read order when you start a session: this file, then `docs/HANDOFF_GROKBOT_LEADS.md`, then only the files
named in the batch you are about to build. Do not explore the repo broadly; the map below is enough.

---

## 0. Where things stand right now

- Production = Netlify auto-publishing branch `launch/afe-emergency-revenue-20260822`. Never PR to `main` for the live site.
- PR #79 (HUNTER referral partners + public lead page `/go/{slug}`) is merged and smoked. Tip `2c94efb`.
- **PR #80 is open and is your first job:** https://github.com/mannybigcity/atlas-os-v2/pull/80
  Head `cursor/amanda-outbound-0cb3` at `8658409`, 3 commits. Base `launch/afe-emergency-revenue-20260822`.
  Before merge: apply `supabase/migrations/20260912150000_amanda_outreach_sequences.sql` (`supabase db push`),
  add Netlify env `RESEND_WEBHOOK_SECRET` (from a Resend webhook at
  `https://atlasforentrepreneurs.com/.netlify/functions/amanda-inbound`, events `email.received` + `email.bounced`),
  and optionally `AMANDA_REPLY_DOMAIN` (a Resend receiving domain such as `reply.atlasforentrepreneurs.com`).
  Smoke after deploy: log into a trial desk, open `/client/david`, find a business prospect with an email,
  confirm the Amanda card shows "Nothing sends until you approve.", click Approve, confirm the status line flips
  to "Approved. Amanda sends email 1 of 3 today." Check Netlify function logs for `amanda-outreach` at 15:00 UTC.
- One known failing test on the base branch: `src/server/sis-capture-card/intake.test.ts`. Leave it. 308/309 is green.
- ESLint reports pre-existing errors in four unrelated files (`atlas-mfa-enrollment`, `atlas-staff-pane`,
  `lions-den-activation-checklist`, `micah-week-gallery`). Lint only the files you touch: `npx eslint <paths>`.

---

## 1. How to think (this is the part Manny asked for)

**Who you are building for.** Manny, and owners like him: a plumber or pest guy in Cypress, TX with a phone in
one hand. Every decision is judged by "does this get the owner a paying job this week, without embarrassing him?"
Not "is this architecturally nice." When you report, say what the owner can now do, not what the code does.

**The product in one breath.** AFE (Atlas for Entrepreneurs) is a trial desk that finds referral partners for a
trade business (HUNTER), drafts the follow-up (David / Amanda), makes weekly marketing art (MICAH), and turns
inbound leads into prospects. AFE is not SIS (a separate party/gift client on the same codebase) and not
"Atlas OS" the platform. If a slug is an SIS org (`isSisOrganization`), the AFE features hide.

**Decision habits, in priority order:**

1. **Safety before speed.** Nothing contacts a human without the owner clicking a button. No cold SMS or calls
   (TCPA). Cold B2B email to businesses with an opt-out line is fine. If unsure whether something "sends",
   make it not send and put a button in front of it.
2. **Never invent data.** No made-up phones, websites, names, or "sample" businesses shown as real. If the data
   is missing, the UI says so ("Phone not published").
3. **Smallest working slice.** One batch = one PR = one thing the owner can see and use. If a batch needs more
   than ~12 files or a second migration, split it. Ship the pure module + tests first, then the wiring.
4. **Pure module first, then wiring.** Put copy, rules, and date math in `src/lib/...` with zero imports from
   Supabase or Next. Unit-test it with node:test. Then write the thin server action / page / function that calls it.
   This is why the Amanda work has `amanda-outreach.ts` (pure) separate from `outreach/actions.ts` (Supabase).
5. **Tests are contracts on copy.** Existing tests `readFileSync` components and `assert.match` on user-facing
   strings and `data-*` attributes. When you change copy, change the test in the same commit. When you add a
   feature, add one contract test that would fail if someone silently removed the approval gate.
6. **Reuse the existing pattern; do not introduce a new one.** Scheduled jobs look like
   `netlify/functions/daily-content-studio.mjs` (service-role REST via fetch). Server actions look like
   `src/server/opportunities/actions.ts`. Email looks like `src/server/leads/email.ts`. Copy the shape.
7. **No new npm dependencies** unless the PR body says why. `npm ci` is already fragile (typescript@6 beta peer
   conflict); use `npm install --no-audit --no-fund --legacy-peer-deps`.
8. **Bilingual.** Every user-facing string is `spanish ? "…" : "…"`. Spanish is real Spanish, not a placeholder.
9. **When blocked on a credential or a decision only Manny can make, finish everything else, then ask one
   precise question** at the end of the report ("I need X in Netlify env; without it Y is skipped, nothing breaks").
   Do not stop early, do not ask permission for reversible work.
10. **Explain like a colleague, not a changelog.** Report = what it does for the owner, what it will not do,
    what checks passed, what Manny has to do. Four short blocks, plain words, no emojis.

**What "done" means for a batch (checklist):**

- [ ] Owner-visible behavior works in EN and ES.
- [ ] No path sends anything without an owner click (grep your diff for `api.resend.com`, `twilio`, `sms:`).
- [ ] Pure module has unit tests; touched components have a contract test; tests updated in the same commit.
- [ ] `npx tsc --noEmit --incremental false` clean.
- [ ] `npx eslint <files you touched>` clean.
- [ ] `npm test` = previous pass count + your new tests (currently 308/309).
- [ ] If you touched `netlify/functions/*`: `node --test netlify/functions-tests/<name>.test.mjs` green.
- [ ] `npx next build` exit 0 (run once at the end, not per commit; it is slow).
- [ ] Migration, if any, is idempotent (`if not exists`, `drop policy if exists` before `create policy`) and listed in the PR body.
- [ ] PR body uses the template in section 4. PR base is the launch branch.
- [ ] Report to Manny in plumber language, with the founder asks at the bottom.

---

## 2. Working loop (do this every batch, in this order)

```
1. git fetch origin launch/afe-emergency-revenue-20260822 && git checkout -b cursor/<topic>-0cb3 FETCH_HEAD
2. npm install --no-audit --no-fund --legacy-peer-deps      (once per machine)
3. Read only the files listed for the batch. Write the pure module + its .test.ts. Run that one test:
      node --test --experimental-strip-types src/lib/<area>/<file>.test.ts
4. Wire it (action / page / component / netlify function). Add or update the contract test.
5. npx tsc --noEmit --incremental false && npx eslint <touched files> && npm test
6. Commit in 2–3 logical commits (pure module + tests / wiring / migration + toml + docs). Push.
7. npx next build (once). If .next has stale types, rm -rf .next and rerun.
8. Open the PR against the launch branch with the section 4 template. Do not merge; Manny merges.
9. Report (section 5 format).
```

Keep usage low: do not run `next build` per commit, do not re-read files you already have, do not grep the
whole repo when this doc names the file, do not rewrite a 400-line file to change three lines (use targeted
edits), and do not open more than one PR at a time.

---

## 3. Map of what exists (only the parts you will touch)

| Area | Files | What it does |
|---|---|---|
| Trade -> referral targets | `src/lib/lions-den/trial-desk-market.ts` | `inferTrialDeskMarket`, `REFERRAL_TARGETS`, `hunterSearchDefaultsFromMarket`. `market.serviceQuery` = owner's own trade. |
| HUNTER | `src/components/hunter-search.tsx`, `src/server/hunter/*` | Search + review pile. Accept -> `organization_opportunities`. |
| Prospects + stages | `src/app/client/prospects/page.tsx`, `src/lib/lions-den/prospect-stages.ts`, `src/server/opportunities/{queries,actions}.ts` | Owner labels map to DB enum (see LEADS handoff section 2). |
| Public lead page | `src/app/go/[slug]/page.tsx`, `src/server/leads/actions.ts`, `src/lib/lions-den/inbound-leads.ts`, `src/server/leads/email.ts` | No auth, honeypot `company`, owner email + Amanda receipt via Resend. |
| Follow-up desk | `src/app/client/david/page.tsx`, `src/components/lions-den/lions-den-follow-up.tsx`, `src/lib/lions-den/follow-up-drafts.ts`, `src/lib/lions-den/desk-queue.ts` | Email/Text/Copy open the owner's apps. "I sent this" -> `contacted` + 3-day check-in. `canShowFollowUpDraftControls` gates AFE vs SIS. |
| Amanda outbound (Batch C) | `src/lib/lions-den/amanda-outreach.ts` (pure), `src/server/outreach/{queries,actions}.ts`, `src/components/lions-den/amanda-sequence-card.tsx`, `netlify/functions/amanda-outreach.mjs` (daily 15:00 UTC), `netlify/functions/amanda-inbound.mjs` (Resend webhook), migration `20260912150000_amanda_outreach_sequences.sql` | Approve -> `organization_outreach_sequences.status='approved'`; sender reads `approved,sending` only; reply -> stage `responded` + owner email; STOP/bounce closes for good. |
| Trials | `src/server/trials/{profile,guards}.ts` (`atlas_trial_profiles.trial_ends_at`), `src/server/client-workspace/context.ts` (redirects expired -> `/pricing?trial=expired`), `src/app/pricing/page.tsx`, `src/server/stripe/billing-entitlement.ts` (`shouldBlockExpiredTrial`) | Batch 4 touches these. |
| MICAH art | `src/server/content-studio/gallery-art.ts` (SVG drafts today), `src/server/content-studio/actions.ts`, `src/server/integrations/openai-gateway.ts` | Batch 5 touches these. |
| Scheduled job pattern | `netlify/functions/daily-content-studio.mjs`, `netlify.toml` `[functions."name"] schedule` | Copy `requireEnv` / `supabaseRequest` helpers; do not import from `src/`. |
| Notifications | `src/server/notifications/resend.ts` (`sendTrialSignupNotification`, `sendAssessmentNotification`) | Existing Resend usage; extend here for lifecycle mail or copy `leads/email.ts`. |
| Tests | `src/**/*.test.ts` via `npm test`; `netlify/functions-tests/*.test.mjs` run by hand with `node --test` | Never put `*.test.mjs` under `netlify/functions/` (Netlify deploys every file there). |

Env vars in Netlify production (confirmed or expected): `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`,
`RESEND_API_KEY`, `ATLAS_NOTIFICATION_FROM`, `NEXT_PUBLIC_SITE_URL=https://atlasforentrepreneurs.com`,
`FOUNDER_MAILBOX_EMAIL`, plus new `RESEND_WEBHOOK_SECRET`, optional `AMANDA_REPLY_DOMAIN`. No Twilio vars exist.

---

## 4. PR body template (copy exactly)

```
## What this fixes
<two or three sentences: the owner's problem, what they can do now>

## What the owner sees
- <bullet per visible change, with the exact EN copy in quotes>

## Guardrails
- <what cannot happen: sends, data invention, SIS>

## Files
- <path> — <one line>

## Migrations
<"None." or the filename + one line + "must be applied before merge (supabase db push)">

## Env vars (Netlify)
<"No change." or new names + what happens without them>

## Tests
- npm test: <n>/<n+1> (pre-existing sis-capture-card failure)
- <function tests if any>
- tsc clean, next build exit 0, eslint clean on touched files

## Still to come
- <next batch in one line each>
```

---

## 5. Report format to Manny (chat message after each PR)

Four short blocks, plain words, no bullets inside the first two:

1. **What it does, plain English** — as if explaining to a plumber what his desk can now do.
2. **What it will not do** — the safety line (no auto-send, no texts, no made-up data, nothing on SIS).
3. **Checks** — one line: tests, build.
4. **What I need from you, Manny** — numbered, only real blockers (env var, migration, merge). Never ask
   for a decision you can make yourself.

---

## 6. Backlog, in order. Each is one PR.

### Batch 4 — Trial lifecycle emails + read-only expired desk

Owner problem: trials go quiet and expire with no nudge, and an expired owner gets bounced to pricing with no
way to see the prospects they already collected.

- Pure module `src/lib/trials/lifecycle-emails.ts`: `lifecycleStageFor({ trialStartedAt, trialEndsAt, now })`
  -> `"day1" | "day5" | "last_day" | "expired" | null`; `lifecycleEmailCopy(stage, { ownerName, businessName,
  prospectCount, spanish })` -> `{ subject, text }`. Copy: short, from Atlas (not Amanda), one link to the desk
  (`/client`) or pricing (`/pricing`). Day 1 = "here is your desk, do these two things"; day 5 = "you have N
  prospects; the fortune is in the follow-up"; last day = "trial ends tomorrow; keep your prospects for $X";
  expired = "your desk is read-only; upgrade to pick up where you left off." EN + ES.
- Table: add columns to `atlas_trial_profiles` via migration `2026MMDD_trial_lifecycle_emails.sql`:
  `lifecycle_emails_sent jsonb not null default '{}'::jsonb` (keys = stage, value = ISO sent at). Idempotent.
- Scheduled function `netlify/functions/trial-lifecycle.mjs`, `schedule = "0 14 * * *"`. For each trial profile
  with an email: compute stage; skip if already in `lifecycle_emails_sent`; send via Resend with
  `Idempotency-Key: trial-{profileId}-{stage}`; PATCH the jsonb. Skip cleanly without `RESEND_API_KEY`.
  Test file `netlify/functions-tests/trial-lifecycle.test.mjs` (mock fetch like `amanda.test.mjs` does).
- Read-only expired desk: in `src/server/client-workspace/context.ts`, instead of redirecting an expired trial
  to pricing, return `readOnly: true` on the context; `LionsDenBoardScreen` shows a banner "Your trial ended.
  You can read everything; upgrade to keep working." with a link to `/pricing?trial=expired`; every server action
  in `src/server/opportunities/actions.ts`, `src/server/outreach/actions.ts`, `src/server/leads/*` (owner side)
  and HUNTER returns `redirect(returnPath + "?followup=trial_expired")` when the trial is expired. Keep
  `requireTrialUser` behavior for pages that must stay blocked (settings/billing) by passing an option.
  `src/app/pricing/page.tsx` should read `trial=expired` and show one line "Your trial ended; your prospects are saved."
- Contract tests: banner copy, `readOnly` in context, actions check expiry, toml schedule line.

### Batch 5 — MICAH real image generation + weekly download

Owner problem: MICAH's weekly posts are SVG placeholders; the owner cannot post them.

- Keep the SVG path as the fallback. Add `src/server/content-studio/image-generation.ts` calling the existing
  OpenAI gateway (`src/server/integrations/openai-gateway.ts`) images endpoint with the brand prompt built from
  `content-studio/brand.ts`. Store the PNG in Supabase Storage bucket `micah-art` (create in migration or via
  `storage.buckets` insert, idempotent) and save the public URL where `imageUrl` already lives in the draft.
- Daily budget: at most N images per org per day (put N in `docs/AI_COST_CONTROLS.md` and code, default 3),
  counted in the existing client-ai usage table (`getClientAiDailyUsage`).
- "Download this week" button on the MICAH page: server route that zips the week's PNGs (no new dep: use
  `node:zlib` per file or serve individual downloads with a "Download all" that triggers each; prefer per-post
  download links first, zip later).
- Bilingual button labels; contract test on the button and on the fallback path when the gateway key is missing.

### Batch 6 — CI + repo hygiene

- `.github/workflows/ci.yml`: `npm install --legacy-peer-deps`, `tsc --noEmit`, `eslint` on `src` **allowing the
  four known pre-existing failures to be fixed in the same PR** (fix them; they are small), `npm test`,
  `node --test netlify/functions-tests`, `next build`. Node 22.
- Delete the stray `tmp/` folder tracked in git (`git rm -r tmp`), add `tmp/` to `.gitignore`.
- Pin deps so `npm ci` works: drop the typescript@6 beta for the latest stable 5.x, or add `overrides`.
  Explain in the PR body.

### Batch D — Phone / SMS (BLOCKED until Manny has a Twilio account and puts credentials in Netlify)

Do not write Twilio code before `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_MESSAGING_SERVICE_SID` exist.
When they do: one local number per org forwarded to the owner's cell; voicemail transcription emailed;
two-way SMS only with numbers that texted in first. Later: Amanda answers the phone.

### Small follow-ups you can fold into any batch (each is < 30 lines)

- Prospect detail page (`/client/prospects/[id]`): show the Amanda sequence status line and the inbound reply
  excerpt from `organization_outreach_messages` (read-only; RLS already allows members to read).
- Amanda card: after STOP or bounce, show the owner a "Call instead" link using the published phone.
- `/go/{slug}` page: a QR code image (pure SVG, no dep) so the owner can print it on the truck.

---

## 7. Things that bit me, so they do not bite you

- `import type` in a `src/lib` file must use a relative path with `.ts` extension (`./amanda-outreach.ts`),
  not `@/…`, or `node --test --experimental-strip-types` cannot resolve it.
- A `"use server"` file may only export async functions. Put sync helpers in `queries.ts` or `src/lib`.
- Netlify function files under `netlify/functions/` cannot import from `src/`; duplicate the small helper
  (`replyAddress`, `isStopRequest`) and add a test that both copies agree if it matters.
- Svix signature: `HMAC-SHA256(secret_bytes, "${svix-id}.${svix-timestamp}.${rawBody}")`, secret is
  `whsec_<base64>`; compare against each `v1,<base64>` entry; 5-minute tolerance.
- Stale `.next/types/validator.ts` can make `tsc` fail on routes you did not touch: `rm -rf .next`.
- Local `git push` from the Cursor VM has no GitHub credentials; Grok Bot in its own environment should push
  normally. If you also lack credentials, push via the GitHub API in grouped commits and verify with
  `git fetch && git diff --stat HEAD FETCH_HEAD` (must be empty).
- Stop detection had a false positive on "We stop by the office at 9." Rule now: bare first line
  `STOP/ALTO/UNSUBSCRIBE`, or specific phrases (`unsubscribe`, `remove me`, `take me off`, `opt out`,
  `not interested`, `no thanks`, `no gracias`, `no me interesa`) within the first 240 chars. Keep it that way.

---

## 8. Paste-ready kickoff for Grok Bot

> Read `docs/HANDOFF_GROKBOT_OPERATING.md` and `docs/HANDOFF_GROKBOT_LEADS.md` in `mannybigcity/atlas-os-v2`.
> Base branch is `launch/afe-emergency-revenue-20260822`. First job: get PR #80 merged and smoked per section 0
> (migration, `RESEND_WEBHOOK_SECRET`, optional `AMANDA_REPLY_DOMAIN`). Then build Batch 4 exactly as specified
> in section 6, one PR, following the loop in section 2 and the done checklist in section 1. Report in the
> section 5 format. Do not touch Twilio. Ask Manny only for env vars, migrations, and merges.
