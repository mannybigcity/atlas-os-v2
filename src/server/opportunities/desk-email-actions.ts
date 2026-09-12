"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { sendLeadEmail } from "@/server/leads/email";
import { findEmailOnBusinessWebsite } from "@/server/hunter/website-email";
import { asOpportunityMetadata } from "@/server/opportunities/queries";
import { requireProspectOwner } from "@/server/opportunities/prospect-actions";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/i;

function text(formData: FormData, name: string, maxLength: number) {
  return String(formData.get(name) ?? "")
    .trim()
    .slice(0, maxLength);
}

function scopedPath(base: string, formData: FormData, status?: string) {
  const params = new URLSearchParams();
  const previewOrg = text(formData, "previewOrg", 80);
  const workspace = text(formData, "workspace", 80);
  if (previewOrg && slugPattern.test(previewOrg)) params.set("previewOrg", previewOrg);
  if (workspace && slugPattern.test(workspace)) params.set("workspace", workspace);
  if (status) params.set("prospect", status);
  const query = params.toString();
  return query ? `${base}?${query}` : base;
}

export async function findProspectWebsiteEmail(formData: FormData) {
  const organizationId = text(formData, "organizationId", 36);
  const opportunityId = text(formData, "opportunityId", 36);
  const { supabase } = await requireProspectOwner(organizationId, formData);
  if (!uuidPattern.test(opportunityId)) {
    redirect(scopedPath("/client/prospects", formData, "invalid"));
  }

  const { data: existing } = await supabase
    .from("organization_opportunities")
    .select("id, contact_email, contact_social, metadata")
    .eq("id", opportunityId)
    .eq("organization_id", organizationId)
    .maybeSingle();
  if (!existing) {
    redirect(scopedPath("/client/prospects", formData, "missing"));
  }

  const metadata = asOpportunityMetadata(existing.metadata);
  const website =
    (typeof metadata.website_url === "string" ? metadata.website_url : null) ||
    existing.contact_social;
  const found = await findEmailOnBusinessWebsite(website);
  if (!found) {
    redirect(scopedPath(`/client/prospects/${opportunityId}`, formData, "email_not_found"));
  }

  const { error } = await supabase
    .from("organization_opportunities")
    .update({
      contact_email: found,
      metadata: {
        ...metadata,
        hunter_website_email: found,
        hunter_website_email_at: new Date().toISOString(),
      },
    })
    .eq("id", opportunityId)
    .eq("organization_id", organizationId);

  if (error) {
    redirect(scopedPath(`/client/prospects/${opportunityId}`, formData, "failed"));
  }

  await supabase.from("organization_opportunity_events").insert({
    opportunity_id: opportunityId,
    organization_id: organizationId,
    event_type: "note_added",
    actor_role: "hunter",
    summary: `HUNTER found ${found} on the business website. Atlas did not email them.`,
    body: website,
  });

  revalidatePath(`/client/prospects/${opportunityId}`);
  redirect(scopedPath(`/client/prospects/${opportunityId}`, formData, "email_found"));
}

export async function sendDeskFollowUpEmail(formData: FormData) {
  const organizationId = text(formData, "organizationId", 36);
  const opportunityId = text(formData, "opportunityId", 36);
  const customerId = text(formData, "customerId", 36);
  const to = text(formData, "to", 320).toLowerCase();
  const subject = text(formData, "subject", 180);
  const body = text(formData, "body", 4000);
  const fromEmail = text(formData, "fromEmail", 320).toLowerCase();
  const returnTo = text(formData, "returnTo", 80);
  const { user, supabase } = await requireProspectOwner(organizationId, formData);
  const detailBase = returnTo.startsWith("/client/clients/")
    ? returnTo
    : opportunityId
      ? `/client/prospects/${opportunityId}`
      : customerId
        ? `/client/clients/${customerId}`
        : "/client/clients";

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to) || subject.length < 2 || body.length < 2) {
    redirect(scopedPath(detailBase, formData, "invalid"));
  }

  const replyTo = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fromEmail)
    ? fromEmail
    : user.email ?? undefined;
  const sent = await sendLeadEmail({
    to: [to],
    subject,
    text: body,
    html: `<pre style="font-family:Arial,sans-serif;white-space:pre-wrap">${body
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")}</pre>`,
    replyTo,
    idempotencyKey: `desk-email:${opportunityId || customerId}:${Date.now()}`,
  });

  if (uuidPattern.test(opportunityId)) {
    await supabase.from("organization_opportunity_events").insert({
      opportunity_id: opportunityId,
      organization_id: organizationId,
      event_type: "follow_up_sent",
      actor_role: "client",
      summary: sent.sent
        ? `Owner sent email from ${replyTo ?? "their login"} to ${to}.`
        : `Owner drafted email to ${to}. Delivery was not confirmed.`,
      body: `${subject}\n\n${body}`.slice(0, 4000),
    });
    await supabase
      .from("organization_opportunities")
      .update({
        stage: "contacted",
        next_action: "Wait for a reply, then follow up.",
      })
      .eq("id", opportunityId)
      .eq("organization_id", organizationId);
  }

  if (uuidPattern.test(customerId)) {
    const { data: customer } = await supabase
      .from("organization_sis_customers")
      .select("id, notes")
      .eq("id", customerId)
      .eq("organization_id", organizationId)
      .maybeSingle();
    if (customer) {
      const stamp = new Date().toISOString().slice(0, 10);
      const noteLine = `${stamp} · emailed ${to}: ${subject}`;
      await supabase
        .from("organization_sis_customers")
        .update({
          notes: [customer.notes, noteLine].filter(Boolean).join("\n").slice(0, 4000),
        })
        .eq("id", customerId)
        .eq("organization_id", organizationId);
    }
  }

  revalidatePath("/client/prospects");
  revalidatePath("/client/clients");
  if (opportunityId) revalidatePath(`/client/prospects/${opportunityId}`);
  if (customerId) revalidatePath(`/client/clients/${customerId}`);
  redirect(scopedPath(detailBase, formData, sent.sent ? "email_sent" : "email_queued"));
}
