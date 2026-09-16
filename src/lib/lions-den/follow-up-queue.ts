import { deskDateInDays, deskDateOnly } from "../desk-time.ts";
import { FOLLOW_UP_CHECK_IN_DAYS } from "./follow-up-drafts.ts";
import { readLastDeskContact } from "./prospect-stages.ts";

/**
 * Stages that mean "we already reached out — the fortune is in the follow-up."
 * Keep these off the Prospects call list language (`ready_for_follow_up` = To call).
 */
export const FOLLOW_UP_OPEN_STAGES = new Set(["contacted", "follow_up_queued", "responded"]);
export const FOLLOW_UP_EXCLUDED_STAGES = new Set(["lost", "archived"]);

export const EMAIL_SENT_FOLLOW_UP_EN = "Email sent — follow up if no reply";
export const EMAIL_SENT_FOLLOW_UP_ES = "Correo enviado — da seguimiento si no hay respuesta";
export const REACHED_OUT_FOLLOW_UP_EN = "Reached out — follow up if no reply";
export const REACHED_OUT_FOLLOW_UP_ES = "Ya los contactaste — da seguimiento si no hay respuesta";

export type FollowUpQueueRecord = {
  stage?: string | null;
  nextAction?: string | null;
  nextActionDue?: string | null;
  metadata?: Record<string, unknown> | null;
};

/**
 * Follow-up desk membership. Dated next steps always belong here (including a
 * To-call row the owner scheduled). Contacted / queued / replied belong even
 * when the due date was never written — that is how emailed prospects used to
 * vanish after Gmail / Atlas send set stage=contacted without next_action_due.
 *
 * Lost and archived stay off. Won only appears when a review ask has a date.
 * Undated ready_for_follow_up stays on Prospects (the call list).
 */
export function belongsOnFollowUpDesk(item: FollowUpQueueRecord) {
  const stage = String(item.stage ?? "").trim();
  if (FOLLOW_UP_EXCLUDED_STAGES.has(stage)) return false;
  if (FOLLOW_UP_OPEN_STAGES.has(stage)) return true;
  return Boolean(String(item.nextActionDue ?? "").trim());
}

/** Bucket date for the Follow-up columns. Missing dates land on today so emailed people are visible now. */
export function followUpQueueDueAt(item: FollowUpQueueRecord, now = new Date()) {
  const due = String(item.nextActionDue ?? "").trim();
  if (due) return due;
  return deskDateOnly(now);
}

export function emailSentFollowUp(input: { spanish?: boolean; sentAt?: Date } = {}) {
  const sentAt = input.sentAt ?? new Date();
  return {
    nextAction: input.spanish ? EMAIL_SENT_FOLLOW_UP_ES : EMAIL_SENT_FOLLOW_UP_EN,
    nextActionDue: deskDateInDays(FOLLOW_UP_CHECK_IN_DAYS, { from: sentAt }),
  };
}

export function reachedOutFollowUp(input: { spanish?: boolean; sentAt?: Date } = {}) {
  const sentAt = input.sentAt ?? new Date();
  return {
    nextAction: input.spanish ? REACHED_OUT_FOLLOW_UP_ES : REACHED_OUT_FOLLOW_UP_EN,
    nextActionDue: deskDateInDays(FOLLOW_UP_CHECK_IN_DAYS, { from: sentAt }),
  };
}

function isLeftoverUncontactedNextAction(text: string) {
  if (!text) return true;
  return /atlas has not contacted/i.test(text) || /atlas no los ha contactado/i.test(text);
}

/**
 * What the Follow-up row should read. A leftover "Call this prospect. Atlas has
 * not contacted them." after an email/contacted stage is replaced with the
 * outreach reminder. Real check-in drafts stay as written.
 */
export function presentedFollowUpNextAction(item: FollowUpQueueRecord, spanish = false) {
  const existing = String(item.nextAction ?? "").trim();
  const stage = String(item.stage ?? "").trim();
  if (FOLLOW_UP_OPEN_STAGES.has(stage) && isLeftoverUncontactedNextAction(existing)) {
    const contact = readLastDeskContact(item.metadata);
    if (contact?.channel === "email") {
      return spanish ? EMAIL_SENT_FOLLOW_UP_ES : EMAIL_SENT_FOLLOW_UP_EN;
    }
    return spanish ? REACHED_OUT_FOLLOW_UP_ES : REACHED_OUT_FOLLOW_UP_EN;
  }
  return existing;
}
