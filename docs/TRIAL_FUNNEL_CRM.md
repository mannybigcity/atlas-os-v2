# 7-Day Trial Funnel → Prospects CRM

This is the runbook for turning a 7-day trial signup into a lead you can call,
text, email, edit, and close from The Lion's Den. It documents what shipped on
top of `launch/afe-emergency-revenue-20260822`, every button, and exactly what
each one writes.

## The problem this solves

Before this change a trial signup produced two things: a row in
`atlas_trial_profiles` (name, business, email, **phone**, business type, growth
goal) and a private trial workspace (an `organizations` row). The
**7 Day Trial** desk listed those workspaces, but the only click was
"open their desk". No phone was shown. Nothing landed in your CRM. There was
nothing to edit, no way to log a call, no stage.

Now every trial is also a **prospect in your own Prospects desk**
(the `atlas-for-entrepreneurs` operator workspace), stored in the same
`organization_opportunities` table that HUNTER finds use. No new table.
The link is `organization_opportunities.metadata ->> 'trial_user_id'`.

## The funnel, end to end

```
/start-trial form ──► atlas_trial_profiles (+ Auth user)
                 └──► trial workspace (organizations + owner membership)
                          │  ensureTrialWorkspace() creates the org
                          ▼
                 ensureTrialProspect()  ──► organization_opportunities row
                 (best effort, service    in the founder desk, stage
                  role, idempotent)       ready_for_follow_up, source
                                          "7 Day Trial signup", next action
                                          "Welcome call within 24 hours"
                          │
                          ▼
        7 Day Trial desk (/client/trial-inbox)   ◄── shows phone, goal, link state
        Prospects desk    (/client/prospects)     ◄── trial leads tagged "7 Day Trial"
        Follow-up desk    (/client/david)         ◄── next step + due date appear here
        Prospect record   (/client/prospects/:id) ◄── call / text / email / log / edit / stage
```

Atlas never emails, calls, or texts anyone. The Call / Text / Email buttons are
`tel:`, `sms:`, and `mailto:` links that open **your** phone or mail app.

## Buttons on the 7 Day Trial desk (`/client/trial-inbox`)

Visible to the super admin on the AFE operator desk only (unchanged rule).

| Button | What it does | What it writes |
| --- | --- | --- |
| **Call** | Opens your phone dialer with the trial owner's number. | Nothing. Log it afterwards on the prospect record. |
| **Text** | Opens SMS with a prefilled welcome message. | Nothing. |
| **Email** | Opens your mail app with a prefilled subject + body. | Nothing. |
| **Add to Prospects** | Creates the CRM record for this trial and opens it. | `organization_opportunities` insert in the founder desk + a `created` event. |
| **Open prospect →** | Shown instead of *Add* once the trial is linked. Opens the record. | Nothing. |
| **Open their desk** | Previews the trial owner's workspace (`/client?previewOrg=slug`). | Nothing. |
| **Add N to Prospects** (header) | Backfills every trial in the queue that has no CRM record. | One insert + `created` event per missing trial. Already-linked rows are skipped. |

Row badges: trial status (Signed up / Email confirmed / First login / In the
Den / Trial ended), email confirmation, and **In Prospects · stage** or
**Not in Prospects**.

## Buttons on the prospect record (`/client/prospects/:id`)

Available to the desk owner/admin and the super admin. Hidden on guest previews
and SIS desks. Every write also inserts an `organization_opportunity_events`
row so the **History** section on the page is a complete audit trail.

| Button | Form fields | Writes |
| --- | --- | --- |
| **Call / Text / Email** | – | Nothing (device links). |
| **Open their trial desk →** | – | Nothing. Super admin only, trial leads only. |
| **Save** (next step) | next step text, due date | `next_action`, `next_action_due`; stage moves to `follow_up_queued` from any pre-contact stage. Event `next_action_set`. Clearing the text clears both. |
| **Log it** (Log a touch) | how (call/text/email/in person/other), outcome, notes, optional next step + due | Stage per outcome (see below), `metadata.last_contacted_at / last_contact_channel / last_contact_outcome`, optional next step. Event `contacted`, `reply_received`, or `lost`. |
| **Save contact** | contact name, phone, email, notes | `contact_name`, `contact_phone`, `contact_email`, `research_summary`. Event `note_added`. |
| **Mark won** | – | `stage = won`. Event `won`. Shows on the Clients desk. |
| **Not a fit** | – | `stage = lost`. Event `lost`. |
| **Back to call list** | – | `stage = ready_for_follow_up`. Event `note_added`. |
| **Remove from desk** | – | `stage = archived` (hidden from lists, history kept). Returns to the Prospects list. |

Stage after a logged touch:

| Outcome | New stage |
| --- | --- |
| Reached them / Left a message / No answer / Wrong number | `contacted` (unless already `responded`, `won`, or `lost`) |
| They replied / Booked a meeting | `responded` |
| Not interested | `lost` |
| Anything on a `won` record | stays `won` |

There is no delete button anywhere. `authenticated` has no DELETE grant.

## What a trial prospect looks like

Built by `trialProspectInsertFields()` in `src/lib/lions-den/trial-prospect.ts`:

- `name`: the business name from the trial form. If two trials share a name the
  insert retries as `Name · Owner`, then `Name (workspace-slug)`, then
  `Name · <user id prefix>`.
- `opportunity_type`: `customer`. `owner_role`: `manual`. `fit_score`: 80.
- `stage`: `ready_for_follow_up` when the phone is usable, otherwise
  `needs_client_input` with a next action asking you to get a number.
- `source_label`: `7 Day Trial signup`.
- `contact_name / contact_email / contact_phone`: from the trial form.
- `research_summary`: signup date, business + type, goal in their words, trial
  workspace slug, "Atlas has not contacted them."
- `next_action`: "Welcome call within 24 hours. Ask about: <goal>."
  `next_action_due`: signup date + 1 day.
- `metadata`: `trial_user_id`, `trial_organization_id`,
  `trial_organization_slug`, `trial_started_at`, `trial_ends_at`,
  `business_type`, `primary_growth_goal`, `no_outreach_sent: true`,
  `accepted_for_calling`, `linked_from: trial_signup | trial_desk`.

## Migration

`supabase/migrations/20260908190000_trial_leads_in_prospects.sql`

- Index `organization_opportunities_trial_user_idx` on
  `(organization_id, metadata->>'trial_user_id')`.
- Policy **Members can update their prospects** so workspace members (not only
  Atlas Admin) can log touches, edit contacts, and move stages on prospects in
  their own workspace. Reads and inserts were already allowed.
- `service_role` grants on `atlas_trial_profiles`, `organizations`,
  `organization_opportunities`, `organization_opportunity_events` for the
  provisioning-time link.

Apply it the same way as every other migration in this repo (Supabase CLI or
the SQL editor). Until it is applied: the trial desk still loads, the auto-link
still works for the super admin path, and a plain member's stage/contact edits
will silently affect zero rows.

## Files

| Area | File |
| --- | --- |
| Trial → prospect mapping (pure) | `src/lib/lions-den/trial-prospect.ts` |
| Device contact links (pure) | `src/lib/lions-den/contact-links.ts` |
| Touch/stage rules + status copy (pure) | `src/lib/lions-den/prospect-actions.ts` |
| Link a trial to the founder desk | `src/server/trials/prospect-link.ts` |
| Auto-link on workspace creation | `src/server/trials/workspace.ts` |
| Trial desk data (phone, goal, link state) | `src/server/trials/inbox.ts`, `src/lib/lions-den/trial-inbox.ts` |
| Trial desk buttons (server actions) | `src/server/trials/desk-actions.ts` |
| Prospect record buttons (server actions) | `src/server/opportunities/actions.ts` |
| 7 Day Trial desk UI | `src/components/lions-den/lions-den-trial-inbox.tsx` |
| Prospect record UI | `src/components/lions-den/lions-den-prospect-detail.tsx` |
| Prospects list (trial tag) | `src/components/lions-den/lions-den-prospects.tsx` |
| Call / Text / Email strip | `src/components/lions-den/contact-buttons.tsx` |
| Tests | `src/lib/lions-den/trial-prospect.test.ts` |

## Daily loop

1. Open **7 Day Trial**. New rows show phone + goal. If any say *Not in
   Prospects*, press **Add N to Prospects** once.
2. For each new lead press **Call**. If they answer, press **Open prospect →**
   and **Log it** with the outcome and the next step.
3. No answer: **Text**, then **Log it** as *Left a message* with a next step
   for tomorrow. It now sits on **Follow-up** with a due date.
4. When they say yes: **Mark won**. They appear on **Clients**. When they say
   no: **Not a fit**. Nothing is deleted; the History stays.
