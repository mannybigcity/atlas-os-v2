"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isSisOrganization } from "@/lib/client-portal/identity";
import { followUpSentCheckIn } from "@/lib/lions-den/follow-up-drafts";
import { isSuperAdminEmail } from "@/lib/env";
import { safeRedirectPath } from "@/lib/paths";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/server/auth/guards";
import { asOpportunityMetadata } from "@/server/opportunities/queries";
import { getUserMemberships } from "@/server/organizations/queries";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function field(formData: FormData, name: string, maxLength: number) {
  const value = String(formData.get(name) ?? "").trim();
  return value ? value.slice(0, maxLength) : null;
}

function followUpReturnPath(formData: FormData, status: string) {
  const requested = String(formData.get("returnTo") ?? "").trim();
  const [pathname, query = ""] = requested.split("?");
  const safePath = pathname ? safeRedirectPath(pathname) : "/client/david";
  const destination =
    safePath === "/client/david" || safePath.startsWith("/client/david")
      ? safePath
      : "/client/david";
  const params = new URLSearchParams(query);
  const next = new URLSearchParams();
  const previewOrg = params.get("previewOrg");
  const workspace = params.get("workspace");
  if (
    previewOrg &&
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/i.test(previewOrg) &&
    !/^afe-crm-demo$/i.test(previewOrg)
  ) {
    next.set("previewOrg", previewOrg);
  }
  if (workspace && /^[a-z0-9]+(?:-[a-z0-9]+)*$/i.test(workspace)) {
    next.set("workspace", workspace);
  }
  next.set("followup", status);
  return `${destination}?${next.toString()}`;
}

async function requireAfeFollowUpOperator(organizationId: string, formData: FormData) {
  const user = await requireUser("/client/david");
  if (!uuidPattern.test(organizationId)) {
    redirect(followUpReturnPath(formData, "invalid"));
  }

  const supabase = await createClient();
  const { data: organization } = await supabase
    .from("organizations")
    .select("id, name, slug")
    .eq("id", organizationId)
    .maybeSingle();

  if (!organization) {
    redirect(followUpReturnPath(formData, "missing_organization"));
  }

  if (isSisOrganization(organization)) {
    redirect(followUpReturnPath(formData, "sis_blocked"));
  }

  if (!isSuperAdminEmail(user.email)) {
    const memberships = await getUserMemberships(user.id);
    const membership = memberships.data.find((item) => item.organization?.id === organizationId);
    if (!membership) {
      redirect("/client?access=denied");
    }
  }

  return { user, organization, supabase };
}

async function loadFollowUpDraft(
  supabase: Awaited<ReturnType<typeof createClient>>,
  organizationId: string,
  opportunityId: string,
) {
  const { data, error } = await supabase
    .from("organization_opportunities")
    .select(
      "id, organization_id, name, stage, contact_name, contact_email, contact_phone, next_action, next_action_due, metadata",
    )
    .eq("id", opportunityId)
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (error || !data) return null;
  return data;
}

function revalidateFollowUpDesk() {
  revalidatePath("/client");
  revalidatePath("/client/david");
  revalidatePath("/client/prospects");
}

export async function updateFollowUpDraft(formData: FormData) {
  const organizationId = field(formData, "organizationId", 36) ?? "";
  const opportunityId = field(formData, "opportunityId", 36) ?? "";
  const draftBody = field(formData, "draftBody", 4000);
  const { supabase } = await requireAfeFollowUpOperator(organizationId, formData);

  if (!uuidPattern.test(opportunityId) || !draftBody) {
    redirect(followUpReturnPath(formData, "invalid_draft"));
  }

  const draft = await loadFollowUpDraft(supabase, organizationId, opportunityId);
  if (!draft) {
    redirect(followUpReturnPath(formData, "missing_draft"));
  }

  const { error } = await supabase
    .from("organization_opportunities")
    .update({
      next_action: draftBody,
    })
    .eq("id", opportunityId)
    .eq("organization_id", organizationId);

  if (error) {
    redirect(followUpReturnPath(formData, "edit_failed"));
  }

  await supabase.from("organization_opportunity_events").insert({
    opportunity_id: opportunityId,
    organization_id: organizationId,
    event_type: "next_action_set",
    actor_role: "client",
    summary: "Owner edited the follow-up draft. Atlas did not email, call, or text anyone.",
    body: draftBody,
  });

  revalidateFollowUpDesk();
  redirect(followUpReturnPath(formData, "edited"));
}

/** Stages that already sit past "contacted"; sending another note must not move them backward. */
const STAGES_PAST_CONTACTED = new Set(["contacted", "responded", "won", "lost"]);

/**
 * The owner tells us they sent the draft themselves (email, text, or by hand).
 * Atlas records that, moves the prospect to Contacted, and queues a check-in
 * draft a few days out. Nothing is transmitted by Atlas.
 */
export async function markFollowUpSent(formData: FormData) {
  const organizationId = field(formData, "organizationId", 36) ?? "";
  const opportunityId = field(formData, "opportunityId", 36) ?? "";
  const spanish = field(formData, "lang", 5) === "es";
  const { supabase } = await requireAfeFollowUpOperator(organizationId, formData);

  if (!uuidPattern.test(opportunityId)) {
    redirect(followUpReturnPath(formData, "invalid_draft"));
  }

  const draft = await loadFollowUpDraft(supabase, organizationId, opportunityId);
  if (!draft) {
    redirect(followUpReturnPath(formData, "missing_draft"));
  }

  const sentAt = new Date();
  const checkIn = followUpSentCheckIn({ contactName: draft.contact_name, spanish, sentAt });
  const metadata = {
    ...asOpportunityMetadata(draft.metadata),
    owner_sent_at: sentAt.toISOString(),
    owner_contacted_at: sentAt.toISOString(),
    no_outreach_sent: true,
  };
  const stage = STAGES_PAST_CONTACTED.has(String(draft.stage)) ? draft.stage : "contacted";

  const { error } = await supabase
    .from("organization_opportunities")
    .update({
      stage,
      metadata,
      next_action: checkIn.nextAction,
      next_action_due: checkIn.nextActionDue,
    })
    .eq("id", opportunityId)
    .eq("organization_id", organizationId);

  if (error) {
    console.error("Atlas follow-up sent mark failed", error);
    redirect(followUpReturnPath(formData, "sent_failed"));
  }

  await supabase.from("organization_opportunity_events").insert({
    opportunity_id: opportunityId,
    organization_id: organizationId,
    event_type: "contacted",
    actor_role: "client",
    summary: `Owner sent the follow-up themselves. Atlas did not email, call, or text anyone. Check-in queued for ${checkIn.nextActionDue}.`,
    body: draft.next_action,
  });

  revalidateFollowUpDesk();
  revalidatePath(`/client/prospects/${opportunityId}`);
  redirect(followUpReturnPath(formData, "sent"));
}

export async function deleteFollowUpDraft(formData: FormData) {
  const organizationId = field(formData, "organizationId", 36) ?? "";
  const opportunityId = field(formData, "opportunityId", 36) ?? "";
  const { supabase } = await requireAfeFollowUpOperator(organizationId, formData);

  if (!uuidPattern.test(opportunityId)) {
    redirect(followUpReturnPath(formData, "invalid_draft"));
  }

  const draft = await loadFollowUpDraft(supabase, organizationId, opportunityId);
  if (!draft) {
    redirect(followUpReturnPath(formData, "missing_draft"));
  }

  const { error } = await supabase
    .from("organization_opportunities")
    .update({
      next_action: null,
      next_action_due: null,
    })
    .eq("id", opportunityId)
    .eq("organization_id", organizationId);

  if (error) {
    redirect(followUpReturnPath(formData, "delete_failed"));
  }

  await supabase.from("organization_opportunity_events").insert({
    opportunity_id: opportunityId,
    organization_id: organizationId,
    event_type: "next_action_set",
    actor_role: "client",
    summary: "Owner deleted the follow-up draft from the queue. Atlas did not contact anyone.",
    body: draft.next_action,
  });

  revalidateFollowUpDesk();
  redirect(followUpReturnPath(formData, "deleted"));
}
