# Handoff: Next Message Engine (Grok Bot)

Written 2026-09-13. Read `docs/HANDOFF_GROKBOT_OPERATING.md` first, then this file, then only the files listed below.

Production branch is `launch/afe-emergency-revenue-20260822`. Never PR this work to `main`.

---

## What Manny decided (do not reopen)

The Follow-up desk already has Email / WhatsApp / Copy, an in-desk email compose box, notes pinned to the prospect, and Amanda's 3-step B2B sequence card (PR #80).

The blank-page problem is real. The wrong fix is a 75% template library + 25% chat column on the right. Do not build that. Do not grow `atlas-staff-pane.tsx` into a second roommate on Follow-up.

Build a **Next Message Engine**: one recommended message on the compose surface, plus three rewrite chips. Owner still sends or approves. Nothing auto-sends.

Amanda stays the outbound name on sequences. The engine on the compose bar can say **Ask Amanda**. Do not invent a new agent.

---

## Owner-visible result (done means this)

On `/client/david` (Follow-up), when the owner opens Email compose for a prospect:

1. A thin strip above the white compose box shows:
   - One line job: e.g. "Re-engage after 11 quiet days" / "Quote follow-up" / "Need one fact before I write"
   - The recommended body already sitting in the compose textarea (subject filled too)
   - Chips: **Shorter** · **Softer** · **Ask for the yes** · **2 more**
2. Tapping a chip rewrites the textarea only. It does not send.
3. If notes are empty and stage has no last-touch fact, the strip says they need one note. It does not invent a job, a kid's name, a price, or a phone.
4. Existing Amanda sequence card stays under the Email / WhatsApp / Copy row for **business** prospects only. Do not merge the sequence card into the chips. Two jobs: sequence = scheduled 3-email B2B drip after Approve; engine = this-message-right-now for any prospect the owner is composing to.
5. Ask Atlas right-rail chat (`atlas-staff-pane.tsx`) does not grow. Leave it.

Spanish copy required on every new string.

SIS desks stay gated by `canShowFollowUpDraftControls`. Engine is AFE-only, same as Amanda sequences.

---

## Do not build

- A 75/25 layout or a templates catalog occupying the right rail
- A persistent Amanda chat column on Follow-up
- LLM calls in v1 if a deterministic draft from `follow-up-drafts.ts` + notes + stage is good enough
- New npm dependencies
- Twilio / SMS / auto-send
- SIS wiring
- Invented facts when notes are empty

---

## Files to read (only these)

| File | Why |
|---|---|
| `src/lib/lions-den/follow-up-drafts.ts` | Existing deterministic email/text drafts. Extend or wrap. |
| `src/lib/lions-den/amanda-outreach.ts` | Sequence rules, offer gates, STOP, status copy. Do not break. |
| `src/lib/lions-den/desk-queue.ts` | How follow-up rows are built. |
| `src/lib/lions-den/prospect-stages.ts` | Stage enum mapping. |
| `src/components/lions-den/desk-email-compose.tsx` | White compose box. Engine chips live here. |
| `src/components/lions-den/lions-den-follow-up.tsx` | Follow-up desk wiring. |
| `src/components/lions-den/amanda-sequence-card.tsx` | Keep as-is under the action row. |
| `src/components/lions-den/linked-notes-panel.tsx` | Notes already pin both ways (PR #92). Read notes; do not redesign notes. |
| `src/app/client/david/page.tsx` | Page data load. Pass notes + last activity into the engine. |
| `src/server/outreach/actions.ts` | Approve/stop sequences only. Engine v1 does not need a new send path. |
| `docs/HANDOFF_GROKBOT_OPERATING.md` | Working loop, PR template, safety rules. |

---

## Implementation (one PR)

Branch from launch:

```
git fetch origin launch/afe-emergency-revenue-20260822 && git checkout -b cursor/next-message-engine-0cb3 FETCH_HEAD
```

### 1. Pure module first

Add `src/lib/lions-den/next-message-engine.ts` with **zero** Next/Supabase imports.

```ts
export type NextMessageJob =
  | "first_touch"
  | "quiet_reopen"
  | "quote_follow"
  | "book_or_close"
  | "review_referral"
  | "need_one_fact";

export type NextMessageInput = {
  spanish: boolean;
  ownerFirstName: string;
  businessName: string;
  ownerPhone: string | null;
  prospectName: string;
  prospectCompany: string | null;
  stage: string;
  opportunityType: string | null;
  lastTouchAt: string | null;
  nowIso: string;
  notesText: string;          // concatenated linked notes, oldest last, cap 800 chars
  quoteAmount: string | null; // only if a real quote exists on the record
};

export type NextMessageResult = {
  job: NextMessageJob;
  jobLabel: string;     // one line, EN or ES
  subject: string;
  body: string;
  variants: {
    shorter: string;
    softer: string;
    askYes: string;
    extra: [string, string];
  };
};

export function nextMessage(input: NextMessageInput): NextMessageResult;
```

Rules inside `nextMessage`:

- If `notesText` is blank AND there is no `lastTouchAt` AND no `quoteAmount`, return `job: "need_one_fact"` with a body that asks the owner to add one note. Do not write a fake personal email.
- Quiet reopen: `lastTouchAt` older than 3 days.
- Quote follow: `quoteAmount` present and stage not won/lost.
- Review/referral: stage is won (reuse tone of `won-review-card.tsx`, do not duplicate that card).
- First touch: researching / new, has email, no last touch.
- Book/close: contacted or responded, has a note that implies interest. If the note does not imply interest, stay on quiet_reopen or first_touch. Do not guess "they said yes."
- Body: 3–6 short lines, plain text, no markdown, no emoji. Sign as the owner (`ownerFirstName` at `{businessName}`), not as Amanda, on this engine path. Amanda signature stays on the 3-step sequence only.
- Never include a phone that was not passed in. Never invent a website.
- Variants must be real rewrites of `body`, not the same paragraph three times.

Test file: `src/lib/lions-den/next-message-engine.test.ts` (`node:test`). Cover: empty notes → need_one_fact; quiet 11 days; quote present; won stage; Spanish jobLabel; no invented phone.

### 2. Wire compose only

`desk-email-compose.tsx`:

- Accept optional `engine: NextMessageResult | null`.
- Prefill subject + body from `engine` when the box opens if the textarea is empty.
- Render a compact strip (`data-next-message-engine`) with `jobLabel` and buttons `data-engine-chip="shorter|softer|askYes|more"`.
- Chips write into local state for the textarea. No server action required for chips in v1 (variants already computed).
- If `job === "need_one_fact"`, still show the strip; do not hide compose.

`lions-den-follow-up.tsx` + `src/app/client/david/page.tsx`:

- For each row, compute `nextMessage(...)` from prospect + linked notes + last activity + quote if present.
- Pass it into compose. Keep Amanda sequence card where it already is.

No new table. No new Netlify function. No new env var.

### 3. Contract tests

- `readFileSync` on `desk-email-compose.tsx` asserts `data-next-message-engine` and the four chip attributes exist.
- Assert the file still has no `api.resend.com` / send-on-chip path.
- Update any follow-up copy tests that snapshot the compose box.

### 4. Checks before PR

```
node --test --experimental-strip-types src/lib/lions-den/next-message-engine.test.ts
npx tsc --noEmit --incremental false
npx eslint src/lib/lions-den/next-message-engine.ts src/lib/lions-den/next-message-engine.test.ts src/components/lions-den/desk-email-compose.tsx src/components/lions-den/lions-den-follow-up.tsx
npm test
npx next build
```

PR base: `launch/afe-emergency-revenue-20260822`.
Do not merge. Manny merges.

---

## What this is not

Batch 4 (trial lifecycle), Batch 5 (MICAH images), Batch 6 (CI), Batch D (Twilio) stay on the operating handoff backlog. This PR cuts in front of them because it is the demo moment on Follow-up: open a prospect, see the next message, tap Ask for the yes, send.

PR #74 (night engine to production launch branch) is still open. Do not mix night-engine commits into this PR.

---

## Report to Manny after the PR is up

Four blocks, plumber English:

1. What the owner can do on Follow-up now.
2. What it will not do (no auto-send, no invented notes, no SIS, no new chat column).
3. Checks.
4. What you need from Manny (merge only, unless a real blocker).
