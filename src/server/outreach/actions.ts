"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isSisOrganization } from "@/lib/client-portal/identity";
import { amandaSequenceSteps, canOfferAmandaSequence } from "@/lib/lions-den/amanda-outreach";
import { isSuperAdminEmail } from "@/lib/env";
import { safeRedirectPath } from "@/lib/paths";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/server/auth/guards";
import { getUserMemberships } from "@/server/organizations/queries";
import { amandaBusinessFromWorkspace } from "@/server/outreach/queries";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function field(formData: FormData, name: string, maxLength: number) {
  const value = String(formData.get(name) ?? "").trim();
  return value ? value.slice(0, maxLength) : null;
}

function returnPath(formData: FormData, status: string) {
  const requested = String(formData.get("returnTo") ?? "").trim();
  const [pathname, query = ""] = requested.split("?");
  const safePath = pathname ? safeRedirectPath(pathname) : "/client/david";
  const destination = safePath.startsWith("/client/") ? safePath : "/client/david";
  const params = new URLSearchParams(query);
  const next = new URLSearchParams();
  const previewOrg = params.get("previewOrg");
  if (previewOrg && /^[a-z0-9]+(?:-[a-z0-9]+)*$/i.test(previewOrg)) next.set("previewOrg", previewOrg);
  next.set("followup", status);
  return `${destination}?${next.toString()}`;
}

async function requireAmandaOperator(organizationId: string, formData: FormData) {
  const user = await requireUser("/client/david");
  if (!uuidPattern.test(organizationId)) redirect(returnPath(formData, "invalid"));

  const supabase = await createClient();
  const { data: organization } = await supabase
    .from("organizations")
    .select("id, name, slug")
    .eq("id", organizationId)
    .maybeSingle();
  if (!organization) redirect(returnPath(formData, "missing_organization"));
  if (isSisOrganization(organization)) redirect(returnPath(formData, "sis_blocked"));

  if (!isSuperAdminEmail(user.email)) {
    const memberships = await getUserMemberships(user.id);
    if (!memberships.data.some((item) => item.organization?.id === organizationId)) {
      redirect("/client?access=denied");
    }
  }
  return { user, organization, supabase };
}

/**
 * The owner read all three drafts and said yes. Store the exact text, mark
 * approved, and let the scheduled sender pick it up. Nothing sends here.
 */
export async function approveAmandaSequence(formData: FormData) {
  const organizationId = field(formData, "organizationId", 36) ?? "";
  const opportunityId = field(formData, "opportunityId", 36) ?? "";
  const spanish = field(formData, "lang", 5) === "es";
  const { user, organization, supabase } = await requireAmandaOperator(organizationId, formData);
  if (!uuidPattern.test(opportunityId)) redirect(returnPath(formData, "invalid_draft"));

  const { data: prospect } = await supabase
    .from("organization_opportunities")
    .select("id, name, stage, opportunity_type, contact_name, contact_email, metadata")
    .eq("id", opportunityId)
    .eq("organization_id", organizationId)
    .maybeSingle();
  if (!prospect) redirect(returnPath(formData, "missing_draft"));

  const metadata = (prospect.metadata ?? {}) as Record<string, unknown>;
  if (
    !canOfferAmandaSequence({
      opportunityType: String(prospect.opportunity_type),
      contactEmail: prospect.contact_email,
      metadata,
      stage: String(prospect.stage),
    })
  ) {
    redirect(returnPath(formData, "amanda_no_email"));
  }

  // Once a business replied STOP, no re-approval reopens the sequence.
  const { data: existing } = await supabase
    .from("organization_outreach_sequences")
    .select("stopped_reason")
    .eq("opportunity_id", opportunityId)
    .eq("channel", "email")
    .maybeSingle();
  if (existing?.stopped_reason === "stop_request") {
    redirect(returnPath(formData, "amanda_stop_requested"));
  }

  const business = amandaBusinessFromWorkspace({
    organizationName: organization.name,
    userMetadata: user.user_metadata as Record<string, unknown>,
  });
  const steps = amandaSequenceSteps({
    business,
    prospect: {
      prospectName: prospect.name,
      contactName: prospect.contact_name,
      prospectType: typeof metadata.primary_type === "string" ? metadata.primary_type.replaceAll("_", " ") : null,
    },
    spanish,
  });

  const now = new Date().toISOString();
  const { error } = await supabase.from("organization_outreach_sequences").upsert(
    {
      organization_id: organizationId,
      opportunity_id: opportunityId,
      channel: "email",
      steps,
      status: "approved",
      current_step: 0,
      next_send_at: now,
      to_email: String(prospect.contact_email).trim().toLowerCase(),
      owner_email: user.email ?? null,
      approved_at: now,
      approved_by: user.id,
      stopped_reason: null,
      updated_at: now,
    },
    { onConflict: "opportunity_id,channel" },
  );
  if (error) {
    console.error("Amanda approve failed", error);
    redirect(returnPath(formData, "amanda_failed"));
  }

  await supabase.from("organization_opportunity_events").insert({
    opportunity_id: opportunityId,
    organization_id: organizationId,
    event_type: "follow_up_queued",
    actor_role: "client",
    summary: `Owner approved Amanda's ${steps.length}-email sequence to ${prospect.contact_email}. First email goes out on the next send run.`,
    body: steps[0]?.body ?? null,
  });

  revalidatePath("/client/david");
  revalidatePath(`/client/prospects/${opportunityId}`);
  redirect(returnPath(formData, "amanda_approved"));
}

/** The owner pulls the plug. Whatever has not gone out stays unsent. */
export async function stopAmandaSequence(formData: FormData) {
  const organizationId = field(formData, "organizationId", 36) ?? "";
  const opportunityId = field(formData, "opportunityId", 36) ?? "";
  const { supabase } = await requireAmandaOperator(organizationId, formData);
  if (!uuidPattern.test(opportunityId)) redirect(returnPath(formData, "invalid_draft"));

  const { error } = await supabase
    .from("organization_outreach_sequences")
    .update({ status: "paused", stopped_reason: "owner", next_send_at: null, updated_at: new Date().toISOString() })
    .eq("organization_id", organizationId)
    .eq("opportunity_id", opportunityId)
    .in("status", ["draft", "approved", "sending"]);
  if (error) {
    console.error("Amanda stop failed", error);
    redirect(returnPath(formData, "amanda_failed"));
  }

  await supabase.from("organization_opportunity_events").insert({
    opportunity_id: opportunityId,
    organization_id: organizationId,
    event_type: "note_added",
    actor_role: "client",
    summary: "Owner stopped Amanda's email sequence. Remaining emails will not be sent.",
  });

  revalidatePath("/client/david");
  revalidatePath(`/client/prospects/${opportunityId}`);
  redirect(returnPath(formData, "amanda_stopped"));
}
