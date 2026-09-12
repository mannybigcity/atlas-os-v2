"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { FOUNDER_MAILBOX_EMAIL } from "@/lib/client-portal/identity";
import {
  inboundLeadAutoReply,
  inboundLeadOpportunityRow,
  inboundLeadOwnerEmail,
  leadPagePath,
  readInboundLeadValues,
  validateInboundLead,
} from "@/lib/lions-den/inbound-leads";
import { prospectDetailPath } from "@/lib/lions-den/prospect-places";
import { createServiceClient } from "@/lib/supabase/service";
import { getLeadPageOrganization, leadPageBaseUrl } from "@/server/leads/queries";
import { sendLeadEmail } from "@/server/leads/email";
import { inboundLeadOwnerSms } from "@/lib/notifications/owner-sms";
import { sendOwnerSms } from "@/server/notifications/twilio";

type OwnerContact = { emails: string[]; phone: string | null };

/** The people who should get the "new lead" email: every member's trial profile email, or the founder mailbox if none. */
async function leadPageOwners(organizationId: string): Promise<OwnerContact> {
  const service = createServiceClient();
  const { data: memberships } = await service
    .from("organization_memberships")
    .select("user_id")
    .eq("organization_id", organizationId)
    .limit(10);
  const userIds = (memberships ?? []).map((row) => String(row.user_id)).filter(Boolean);
  if (userIds.length === 0) return { emails: [FOUNDER_MAILBOX_EMAIL], phone: null };

  const { data: profiles } = await service
    .from("atlas_trial_profiles")
    .select("email, phone")
    .in("user_id", userIds);
  const emails = [...new Set((profiles ?? []).map((row) => String(row.email ?? "").trim().toLowerCase()).filter(Boolean))];
  const phone = (profiles ?? []).map((row) => String(row.phone ?? "").trim()).find(Boolean) ?? null;
  return { emails: emails.length > 0 ? emails : [FOUNDER_MAILBOX_EMAIL], phone };
}

function leadPageRedirect(slug: string, status: string, spanish: boolean) {
  const params = new URLSearchParams({ lead: status });
  if (spanish) params.set("lang", "es");
  return `${leadPagePath(slug)}?${params.toString()}`;
}

export async function submitInboundLead(formData: FormData) {
  const slug = String(formData.get("slug") ?? "").trim().slice(0, 120);
  const spanish = String(formData.get("lang") ?? "") === "es";
  // Bots fill every field; humans never see this one.
  if (String(formData.get("company") ?? "").trim()) {
    redirect(leadPageRedirect(slug, "sent", spanish));
  }

  const organization = await getLeadPageOrganization(slug);
  if (!organization) {
    redirect("/");
  }

  const values = readInboundLeadValues(formData);
  const errors = validateInboundLead(values, spanish);
  if (Object.keys(errors).length > 0) {
    redirect(leadPageRedirect(slug, "invalid", spanish));
  }

  const service = createServiceClient();
  const row = inboundLeadOpportunityRow({ organizationId: organization.id, slug, values, spanish });
  const { data: inserted, error } = await service
    .from("organization_opportunities")
    .insert(row)
    .select("id")
    .single();

  if (error || !inserted) {
    console.error("Atlas inbound lead insert failed", { code: error?.code, slug });
    redirect(leadPageRedirect(slug, "failed", spanish));
  }

  await service.from("organization_opportunity_events").insert({
    opportunity_id: inserted.id,
    organization_id: organization.id,
    event_type: "created",
    actor_role: "client",
    summary: `${values.name} asked for help through the lead page. Atlas emailed the owner and sent the lead a receipt from Amanda. No marketing was sent.`,
    body: values.problem,
  });

  const siteUrl = leadPageBaseUrl();
  const owners = await leadPageOwners(organization.id);
  const ownerMail = inboundLeadOwnerEmail({
    businessName: organization.name,
    values,
    prospectUrl: `${siteUrl}${prospectDetailPath(inserted.id)}`,
  });
  await sendLeadEmail({
    ...ownerMail,
    to: owners.emails,
    replyTo: values.email || null,
    idempotencyKey: `atlas-inbound-owner-${inserted.id}`,
  });

  // Owner-only text. The lead is never texted by Atlas.
  await sendOwnerSms({
    to: owners.phone,
    body: inboundLeadOwnerSms({
      businessName: organization.name,
      leadName: values.name,
      leadPhone: values.phone,
      problem: values.problem,
      prospectUrl: `${siteUrl}${prospectDetailPath(inserted.id)}`,
    }),
    idempotencyKey: `atlas-inbound-owner-sms-${inserted.id}`,
  });

  if (values.email) {
    const reply = inboundLeadAutoReply({
      businessName: organization.name,
      ownerPhone: owners.phone,
      values,
      spanish,
    });
    await sendLeadEmail({
      ...reply,
      to: [values.email],
      replyTo: owners.emails[0],
      idempotencyKey: `atlas-inbound-reply-${inserted.id}`,
    });
  }

  revalidatePath("/client");
  revalidatePath("/client/prospects");
  revalidatePath("/client/david");
  redirect(leadPageRedirect(slug, "sent", spanish));
}
