"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isSisOrganization } from "@/lib/client-portal/identity";
import { isSuperAdminEmail } from "@/lib/env";
import { TRIAL_SAMPLE_PLACE_PREFIX } from "@/lib/lions-den/trial-samples";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/server/auth/guards";
import { getUserMemberships } from "@/server/organizations/queries";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function returnPath(formData: FormData, status: string) {
  const params = new URLSearchParams();
  const workspace = String(formData.get("workspace") ?? "").trim();
  if (workspace && /^[a-z0-9]+(?:-[a-z0-9]+)*$/i.test(workspace)) {
    params.set("workspace", workspace);
  }
  params.set("samples", status);
  return `/client?${params.toString()}`;
}

export async function clearTrialSamples(formData: FormData) {
  const organizationId = String(formData.get("organizationId") ?? "").trim();
  const user = await requireUser("/client");
  if (!uuidPattern.test(organizationId)) {
    redirect(returnPath(formData, "invalid"));
  }

  const supabase = await createClient();
  const { data: organization } = await supabase
    .from("organizations")
    .select("id, name, slug")
    .eq("id", organizationId)
    .maybeSingle();
  if (!organization || isSisOrganization(organization)) {
    redirect(returnPath(formData, "invalid"));
  }

  if (!isSuperAdminEmail(user.email)) {
    const memberships = await getUserMemberships(user.id);
    const membership = memberships.data.find((item) => item.organization?.id === organizationId);
    if (!membership) {
      redirect("/client?access=denied");
    }
  }

  // Record the decision first so a partially failed delete never re-seeds.
  const settings = await supabase.from("organization_desk_settings").upsert(
    {
      organization_id: organizationId,
      samples_cleared_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "organization_id" },
  );
  if (settings.error) {
    console.error("Atlas clear samples: settings write failed", settings.error);
    redirect(returnPath(formData, "failed"));
  }

  const sampleOpportunities = await supabase
    .from("organization_opportunities")
    .select("id")
    .eq("organization_id", organizationId)
    .eq("metadata->>trial_seed", "true");
  const opportunityIds = ((sampleOpportunities.data ?? []) as Array<{ id: string }>).map((row) => row.id);

  if (opportunityIds.length > 0) {
    await supabase.from("organization_opportunity_events").delete().in("opportunity_id", opportunityIds);
    await supabase
      .from("organization_hunter_review_items")
      .update({ accepted_opportunity_id: null })
      .eq("organization_id", organizationId)
      .in("accepted_opportunity_id", opportunityIds);
    const opportunities = await supabase
      .from("organization_opportunities")
      .delete()
      .eq("organization_id", organizationId)
      .in("id", opportunityIds);
    if (opportunities.error) {
      console.error("Atlas clear samples: opportunity delete failed", opportunities.error);
      redirect(returnPath(formData, "failed"));
    }
  }

  const hunter = await supabase
    .from("organization_hunter_review_items")
    .delete()
    .eq("organization_id", organizationId)
    .like("place_id", `${TRIAL_SAMPLE_PLACE_PREFIX}%`);
  if (hunter.error) {
    console.error("Atlas clear samples: hunter delete failed", hunter.error);
    redirect(returnPath(formData, "failed"));
  }

  const sampleDrafts = await supabase
    .from("organization_content_drafts")
    .select("id")
    .eq("organization_id", organizationId)
    .eq("metadata->>trial_seed", "true");
  const draftIds = ((sampleDrafts.data ?? []) as Array<{ id: string }>).map((row) => row.id);
  if (draftIds.length > 0) {
    await supabase.from("organization_content_draft_events").delete().in("draft_id", draftIds);
    const drafts = await supabase
      .from("organization_content_drafts")
      .delete()
      .eq("organization_id", organizationId)
      .in("id", draftIds);
    if (drafts.error) {
      console.error("Atlas clear samples: draft delete failed", drafts.error);
      redirect(returnPath(formData, "failed"));
    }
  }

  for (const path of ["/client", "/client/prospects", "/client/clients", "/client/david", "/client/hunter", "/client/micah", "/client/calendar"]) {
    revalidatePath(path);
  }
  redirect(returnPath(formData, "cleared"));
}
