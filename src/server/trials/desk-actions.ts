"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isSuperAdminEmail } from "@/lib/env";
import { trialInboxProspectHref } from "@/lib/lions-den/trial-inbox";
import { requireUser } from "@/server/auth/guards";
import { getAfeTrialInbox } from "@/server/trials/inbox";
import { ensureTrialProspect } from "@/server/trials/prospect-link";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function trialDeskHref(status: string, extra: Record<string, string | number> = {}) {
  const params = new URLSearchParams({ trial: status });
  for (const [key, value] of Object.entries(extra)) params.set(key, String(value));
  return `/client/trial-inbox?${params.toString()}`;
}

async function requireTrialDeskOperator() {
  const user = await requireUser("/client/trial-inbox");
  if (!isSuperAdminEmail(user.email)) {
    redirect("/client?access=denied");
  }
  return user;
}

function revalidateTrialDesks() {
  revalidatePath("/client");
  revalidatePath("/client/trial-inbox");
  revalidatePath("/client/prospects");
  revalidatePath("/client/david");
}

/** "Add to Prospects" on one trial row. Lands on the new CRM record. */
export async function addTrialToProspects(formData: FormData) {
  await requireTrialDeskOperator();
  const userId = String(formData.get("userId") ?? "").trim();
  const organizationId = String(formData.get("organizationId") ?? "").trim();

  if (!uuidPattern.test(userId) || !uuidPattern.test(organizationId)) {
    redirect(trialDeskHref("invalid"));
  }

  const result = await ensureTrialProspect({ userId, organizationId, linkedFrom: "trial_desk" });
  revalidateTrialDesks();

  if (!result.ok) {
    redirect(trialDeskHref("add_failed", { reason: result.error }));
  }

  const href = trialInboxProspectHref(result.prospectId);
  redirect(`${href}?status=${result.created ? "trial_added" : "trial_linked"}`);
}

/** "Add all to Prospects": backfills every trial in the queue that has no CRM record yet. */
export async function syncTrialsToProspects() {
  await requireTrialDeskOperator();
  const inbox = await getAfeTrialInbox();
  if (inbox.setupRequired) {
    redirect(trialDeskHref("sync_failed"));
  }

  let added = 0;
  let failed = 0;
  for (const row of inbox.data) {
    if (row.prospectId) continue;
    const result = await ensureTrialProspect(
      { userId: row.userId, organizationId: row.organizationId, linkedFrom: "trial_desk" },
    );
    if (result.ok) {
      if (result.created) added += 1;
    } else if (result.error !== "excluded") {
      failed += 1;
    }
  }

  revalidateTrialDesks();
  redirect(trialDeskHref("synced", { added, failed }));
}
