import type { OrganizationOpportunity } from "@/server/opportunities/queries";
import { prospectHasCallablePhone } from "./prospect-places.ts";
import { readLastDeskContact } from "./prospect-stages.ts";

/**
 * Stages that already mean the owner reached out (or closed the card).
 * These never belong on Calls to make — they stay on Prospects / Follow-up / Clients.
 */
const CONTACTED_STAGES = new Set([
  "contacted",
  "follow_up_queued",
  "responded",
  "won",
  "lost",
  "archived",
]);

const SYSTEM_NOTE_ROLES = new Set(["atlas", "hunter", "micah", "david"]);

/** HUNTER accept / sample seed lines. Not evidence the owner called. */
export function isBoilerplateUncontactedNote(text: string) {
  const raw = text.replace(/\s+/g, " ").trim();
  if (!raw) return true;
  return (
    /atlas has not contacted/i.test(raw) ||
    /atlas no los ha contactado/i.test(raw) ||
    /no contact was sent/i.test(raw) ||
    /accepted (this )?hunter find into prospects/i.test(raw) ||
    /accepted into prospects/i.test(raw)
  );
}

function hasDurableContactStamp(metadata: Record<string, unknown> | null | undefined) {
  const contactedAt = metadata?.owner_contacted_at;
  if (typeof contactedAt === "string" && !Number.isNaN(new Date(contactedAt).getTime())) return true;
  return Boolean(readLastDeskContact(metadata));
}

/**
 * Durable "already called" rule for Calls to make.
 *
 * A prospect is contacted when any of these already exist:
 * 1. `metadata.owner_contacted_at` (Call / WhatsApp / Email / Log call / Save note)
 * 2. `metadata.last_desk_contact`
 * 3. stage in contacted / follow_up_queued / responded / won / lost / archived
 * 4. activity `contacted` or `reply_received`
 * 5. an owner (`client` / `manual`) `note_added` that is not HUNTER/sample boilerplate
 *
 * No new column. Existing Blaze/Texas-style rows (outcome next-action + desk
 * contact stamp, or a real post-call note) drop off immediately.
 */
export function prospectHasBeenContacted(
  prospect: Pick<OrganizationOpportunity, "stage" | "metadata" | "events">,
) {
  if (hasDurableContactStamp(prospect.metadata)) return true;
  if (CONTACTED_STAGES.has(String(prospect.stage ?? ""))) return true;
  for (const event of prospect.events ?? []) {
    if (event.eventType === "contacted" || event.eventType === "reply_received") return true;
    if (
      event.eventType === "note_added" &&
      !SYSTEM_NOTE_ROLES.has(String(event.actorRole ?? "")) &&
      !isBoilerplateUncontactedNote(`${event.summary ?? ""} ${event.body ?? ""}`)
    ) {
      return true;
    }
  }
  return false;
}

/** Phone on file and never marked contacted. No-phone rows stay on Prospects. */
export function prospectBelongsOnCallsToMake(prospect: OrganizationOpportunity) {
  return prospectHasCallablePhone(prospect) && !prospectHasBeenContacted(prospect);
}
