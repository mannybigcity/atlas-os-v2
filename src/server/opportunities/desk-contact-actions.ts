"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prospectTelHref, prospectWhatsAppHref } from "@/lib/lions-den/prospect-places";
import {
  deskContactStamp,
  deskContactSummary,
  type DeskContactChannel,
} from "@/lib/lions-den/prospect-stages";
import { asOpportunityMetadata } from "@/server/opportunities/queries";
import { requireProspectOwner } from "@/server/opportunities/prospect-actions";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/i;
const STAGES_PAST_CONTACTED = new Set(["contacted", "responded", "won", "lost"]);

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

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

/**
 * Writes Call / WhatsApp onto the record so management can see the attempt.
 * The browser then opens the owner's phone or WhatsApp. Atlas does not dial or send.
 */
export async function logDeskContact(formData: FormData) {
  const organizationId = text(formData, "organizationId", 36);
  const opportunityId = text(formData, "opportunityId", 36);
  const customerId = text(formData, "customerId", 36);
  const channel = text(formData, "channel", 16) as DeskContactChannel;
  const spanish = text(formData, "lang", 2) === "es";
  const returnTo = text(formData, "returnTo", 80);
  const { user, supabase } = await requireProspectOwner(organizationId, formData);
  const actor = user.email ?? "Owner";
  const detailBase = returnTo.startsWith("/client/clients/")
    ? returnTo
    : opportunityId
      ? `/client/prospects/${opportunityId}`
      : customerId
        ? `/client/clients/${customerId}`
        : "/client/prospects";

  if (channel !== "call" && channel !== "whatsapp") {
    redirect(scopedPath(detailBase, formData, "invalid"));
  }

  if (uuidPattern.test(opportunityId)) {
    const { data } = await supabase
      .from("organization_opportunities")
      .select("id, contact_phone, metadata, stage")
      .eq("id", opportunityId)
      .eq("organization_id", organizationId)
      .maybeSingle();
    if (!data) {
      redirect(scopedPath(detailBase, formData, "missing"));
    }
    const metadata = asOpportunityMetadata(data.metadata);
    const phone =
      data.contact_phone ||
      (typeof metadata.national_phone_number === "string" ? metadata.national_phone_number : null) ||
      (typeof metadata.international_phone_number === "string" ? metadata.international_phone_number : null);
    const href =
      channel === "call"
        ? prospectTelHref(phone)
        : prospectWhatsAppHref(
            phone,
            spanish
              ? "Hola, te escribo para dar seguimiento. ¿Tienes un momento?"
              : "Hi, I'm following up. Do you have a few minutes?",
          );
    if (!href) {
      redirect(scopedPath(detailBase, formData, "invalid"));
    }

    const stamp = deskContactStamp(channel, actor);
    const { error: eventError } = await supabase.from("organization_opportunity_events").insert({
      opportunity_id: opportunityId,
      organization_id: organizationId,
      event_type: "contacted",
      actor_role: "client",
      summary: deskContactSummary(channel, phone ?? "", actor).slice(0, 500),
      body: href.slice(0, 3000),
    });
    if (eventError) {
      console.error("Desk contact event failed", eventError);
    }
    const { error: updateError } = await supabase
      .from("organization_opportunities")
      .update({
        metadata: {
          ...metadata,
          last_desk_contact: stamp,
          owner_contacted_at: stamp.at,
        },
        ...(STAGES_PAST_CONTACTED.has(String(data.stage))
          ? {}
          : { stage: "contacted", next_action: "Wait for a reply, then follow up." }),
      })
      .eq("id", opportunityId)
      .eq("organization_id", organizationId);
    if (updateError) {
      console.error("Desk contact stamp failed", updateError);
    }

    revalidatePath("/client/prospects");
    revalidatePath("/client/clients");
    revalidatePath(`/client/prospects/${opportunityId}`);
    revalidatePath(`/client/clients/${opportunityId}`);
    return;
  }

  if (uuidPattern.test(customerId)) {
    const { data: customer } = await supabase
      .from("organization_sis_customers")
      .select("id, phone, notes, metadata")
      .eq("id", customerId)
      .eq("organization_id", organizationId)
      .maybeSingle();
    if (!customer) {
      redirect(scopedPath(detailBase, formData, "missing"));
    }
    const phone = customer.phone;
    const href = channel === "call" ? prospectTelHref(phone) : prospectWhatsAppHref(phone);
    if (!href) {
      redirect(scopedPath(detailBase, formData, "invalid"));
    }
    const stamp = deskContactStamp(channel, actor);
    const day = stamp.at.slice(0, 10);
    const noteLine =
      channel === "call"
        ? `${day} · called ${phone} · ${actor}`
        : `${day} · WhatsApp ${phone} · ${actor}`;
    const { error: customerError } = await supabase
      .from("organization_sis_customers")
      .update({
        notes: [customer.notes, noteLine].filter(Boolean).join("\n").slice(0, 4000),
        metadata: {
          ...asRecord(customer.metadata),
          last_desk_contact: stamp,
        },
      })
      .eq("id", customerId)
      .eq("organization_id", organizationId);
    if (customerError) {
      console.error("SIS desk contact stamp failed", customerError);
    }
    revalidatePath("/client/clients");
    revalidatePath(`/client/clients/${customerId}`);
    return;
  }

  redirect(scopedPath(detailBase, formData, "invalid"));
}
