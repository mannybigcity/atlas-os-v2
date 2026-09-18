import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { CALL_PROSPECT_NEXT_ACTION } from "./prospect-places.ts";
import {
  EMAIL_SENT_FOLLOW_UP_EN,
  EMAIL_SENT_FOLLOW_UP_ES,
  REACHED_OUT_FOLLOW_UP_EN,
  belongsOnFollowUpDesk,
  emailSentFollowUp,
  followUpQueueDueAt,
  presentedFollowUpNextAction,
  reachedOutFollowUp,
} from "./follow-up-queue.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "../../..");
const readRepo = (rel: string) => readFileSync(join(root, rel), "utf8");

test("Follow-up includes contacted outreach even without a due date, and leaves undated To-call on Prospects", () => {
  assert.equal(belongsOnFollowUpDesk({ stage: "contacted", nextActionDue: null }), true);
  assert.equal(belongsOnFollowUpDesk({ stage: "contacted", nextAction: EMAIL_SENT_FOLLOW_UP_EN }), true);
  assert.equal(belongsOnFollowUpDesk({ stage: "follow_up_queued" }), true);
  assert.equal(belongsOnFollowUpDesk({ stage: "responded" }), true);
  assert.equal(
    belongsOnFollowUpDesk({ stage: "ready_for_follow_up", nextAction: CALL_PROSPECT_NEXT_ACTION }),
    false,
    "undated To-call stays on Prospects",
  );
  assert.equal(
    belongsOnFollowUpDesk({ stage: "ready_for_follow_up", nextActionDue: "2026-09-20" }),
    true,
    "a dated To-call still shows on Follow-up",
  );
  assert.equal(belongsOnFollowUpDesk({ stage: "needs_client_input" }), false);
  assert.equal(belongsOnFollowUpDesk({ stage: "won", nextActionDue: "2026-09-19" }), true);
  assert.equal(belongsOnFollowUpDesk({ stage: "won" }), false);
  assert.equal(belongsOnFollowUpDesk({ stage: "lost", nextActionDue: "2026-09-19" }), false);
  assert.equal(belongsOnFollowUpDesk({ stage: "archived", nextActionDue: "2026-09-19" }), false);
});

test("emailed people without a stored due date land in Today, not off the board", () => {
  const now = new Date(2026, 8, 16, 15, 0);
  assert.equal(followUpQueueDueAt({ nextActionDue: "2026-09-19" }, now), "2026-09-19");
  assert.equal(followUpQueueDueAt({ stage: "contacted", nextActionDue: null }, now), "2026-09-16");
});

test("outbound email queues a +3 day follow-up with a desk-readable next action", () => {
  const sentAt = new Date(2026, 8, 16, 12);
  const en = emailSentFollowUp({ sentAt, spanish: false });
  assert.equal(en.nextAction, EMAIL_SENT_FOLLOW_UP_EN);
  assert.equal(en.nextActionDue, "2026-09-19");
  const es = emailSentFollowUp({ sentAt, spanish: true });
  assert.equal(es.nextAction, EMAIL_SENT_FOLLOW_UP_ES);
  const reached = reachedOutFollowUp({ sentAt });
  assert.equal(reached.nextAction, REACHED_OUT_FOLLOW_UP_EN);
  assert.equal(reached.nextActionDue, "2026-09-19");
});

test("Follow-up copy replaces a leftover Call next-action after email/contacted", () => {
  assert.equal(
    presentedFollowUpNextAction({
      stage: "contacted",
      nextAction: CALL_PROSPECT_NEXT_ACTION,
      metadata: { last_desk_contact: { channel: "email", at: "2026-09-16T17:00:00.000Z" } },
    }),
    EMAIL_SENT_FOLLOW_UP_EN,
  );
  assert.equal(
    presentedFollowUpNextAction({
      stage: "contacted",
      nextAction: CALL_PROSPECT_NEXT_ACTION,
    }),
    REACHED_OUT_FOLLOW_UP_EN,
  );
  assert.equal(
    presentedFollowUpNextAction({
      stage: "contacted",
      nextAction: "Just following up on my email from Tuesday. Do you have a minute this week for a quick call?",
    }),
    "Just following up on my email from Tuesday. Do you have a minute this week for a quick call?",
  );
  assert.equal(
    presentedFollowUpNextAction({ stage: "ready_for_follow_up", nextAction: CALL_PROSPECT_NEXT_ACTION }),
    CALL_PROSPECT_NEXT_ACTION,
  );
});

test("Follow-up UI and writes use contacted membership, not ready_for_follow_up-only", () => {
  const board = readRepo("src/components/lions-den/lions-den-follow-up.tsx");
  const overview = readRepo("src/components/lions-den/lions-den-overview.tsx");
  const page = readRepo("src/components/lions-den/follow-up-desk-screen.tsx");
  const queries = readRepo("src/server/opportunities/queries.ts");
  const email = readRepo("src/server/opportunities/desk-email-actions.ts");
  const stages = readRepo("src/server/opportunities/prospect-actions.ts");
  const amanda = readRepo("netlify/functions/amanda-outreach.mjs");

  assert.match(board, /belongsOnFollowUpDesk/);
  assert.match(board, /presentedFollowUpNextAction/);
  assert.match(board, /followUpQueueDueAt/);
  assert.match(overview, /belongsOnFollowUpDesk/);
  assert.match(page, /getFollowUpOpportunities/);
  assert.doesNotMatch(page, /getOpportunityPipeline/);
  assert.match(readRepo("src/app/client/prospects/page.tsx"), /getOpportunityPipeline/);
  assert.doesNotMatch(readRepo("src/app/client/prospects/page.tsx"), /getFollowUpOpportunities/);
  assert.match(queries, /export async function getFollowUpOpportunities/);
  assert.match(queries, /organization_id/);
  assert.match(queries, /stage\.in\.\(contacted,follow_up_queued,responded\)/);
  assert.match(email, /emailSentFollowUp/);
  assert.match(email, /revalidatePath\("\/client\/david"\)/);
  assert.match(stages, /reachedOutFollowUp/);
  assert.match(amanda, /Email sent — follow up if no reply/);
  assert.match(amanda, /next_action_due/);
});
