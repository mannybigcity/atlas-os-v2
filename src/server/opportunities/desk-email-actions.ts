"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { readDeskEmailAttachments } from "@/lib/lions-den/desk-email-attachments";
import { sendLeadEmail } from "@/server/leads/email";
import { fillMissingOpportunityEmail } from "@/server/hunter/fill-website-email";
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
  await requireProspectOwner(organizationId, formData);
  if (!uuidPattern.test(opportunityId)) {
    redirect(scopedPath("/client/prospects", formData, "invalid"));
  }

  const filled = await fillMissingOpportunityEmail(organizationId, opportunityId);
  const returnTo = text(formData, "returnTo", 80);
  const detailBase = returnTo.startsWith("/client/clients/")
    ? returnTo
    : `/client/prospects/${opportunityId}`;
  if (!filled.email) {
    redirect(scopedPath(detailBase, formData, "email_not_found"));
  }

  revalidatePath(`/client/prospects/${opportunityId}`);
  revalidatePath(`/client/clients/${opportunityId}`);
  redirect(scopedPath(detailBase, formData, "email_found"));
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

  const files = await readDeskEmailAttachments(formData);
  if (!files.ok) {
    redirect(scopedPath(detailBase, formData, "invalid"));
  }

  const replyTo = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fromEmail)
    ? fromEmail
    : user.email ?? undefined;
  const attachmentNames = files.attachments.map((file) => file.filename);
  const sent = await sendLeadEmail({
    to: [to],
    subject,
    text: body,
    html: `<pre style="font-family:Arial,sans-serif;white-space:pre-wrap">${body
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")}</pre>`,
    replyTo,
    attachments: files.attachments,
    idempotencyKey: `desk-email:${opportunityId || customerId}:${Date.now()}`,
  });

  if (uuidPattern.test(opportunityId)) {
    await supabase.from("organization_opportunity_events").insert({
      opportunity_id: opportunityId,
      organization_id: organizationId,
      event_type: "follow_up_sent",
      actor_role: "client",
      summary: sent.sent
        ? `Owner sent email from ${replyTo ?? "their login"} to ${to}${
            attachmentNames.length ? ` with ${attachmentNames.join(", ")}` : ""
          }.`
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
      const noteLine = `${stamp} · emailed ${to}: ${subject}${
        attachmentNames.length ? ` · ${attachmentNames.join(", ")}` : ""
      }`;
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
