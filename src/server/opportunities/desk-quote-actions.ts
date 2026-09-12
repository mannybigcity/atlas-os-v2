"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  deskQuoteStatusLabel,
  formatUsd,
  isDeskQuoteStatus,
  newDeskQuote,
  normalizePayLink,
  readDeskQuotes,
  validateDeskQuote,
  validatePayLink,
  withDeskQuote,
} from "@/lib/lions-den/desk-quote";
import { FOLLOW_UP_CHECK_IN_DAYS } from "@/lib/lions-den/follow-up-drafts";
import { JOB_VALUE_METADATA_KEY } from "@/lib/lions-den/prospect-stages";
import { asOpportunityMetadata } from "@/server/opportunities/queries";
import { requireProspectOwner } from "@/server/opportunities/prospect-actions";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/i;

function text(formData: FormData, name: string, maxLength: number) {
  return String(formData.get(name) ?? "")
    .trim()
    .slice(0, maxLength);
}

function scopedPath(base: string, formData: FormData, status?: string, extra?: Record<string, string>) {
  const params = new URLSearchParams();
  const previewOrg = text(formData, "previewOrg", 80);
  const workspace = text(formData, "workspace", 80);
  if (previewOrg && slugPattern.test(previewOrg)) params.set("previewOrg", previewOrg);
  if (workspace && slugPattern.test(workspace)) params.set("workspace", workspace);
  if (status) params.set("prospect", status);
  for (const [key, value] of Object.entries(extra ?? {})) params.set(key, value);
  const query = params.toString();
  return query ? `${base}?${query}` : base;
}

function recordPath(opportunityId: string, formData: FormData) {
  const returnTo = text(formData, "returnTo", 80);
  return returnTo.startsWith("/client/clients/") ? returnTo : `/client/prospects/${opportunityId}`;
}

function revalidateRecord(opportunityId: string) {
  for (const path of ["/client", "/client/prospects", "/client/clients", "/client/david"]) {
    revalidatePath(path);
  }
  revalidatePath(`/client/prospects/${opportunityId}`);
  revalidatePath(`/client/clients/${opportunityId}`);
}

function localDateInDays(days: number) {
  const now = new Date();
  const due = new Date(now.getFullYear(), now.getMonth(), now.getDate() + days);
  return `${due.getFullYear()}-${String(due.getMonth() + 1).padStart(2, "0")}-${String(due.getDate()).padStart(2, "0")}`;
}

async function loadRecord(
  supabase: Awaited<ReturnType<typeof requireProspectOwner>>["supabase"],
  organizationId: string,
  opportunityId: string,
) {
  const { data } = await supabase
    .from("organization_opportunities")
    .select("id, name, stage, metadata")
    .eq("id", opportunityId)
    .eq("organization_id", organizationId)
    .maybeSingle();
  return data as { id: string; name: string; stage: string; metadata: unknown } | null;
}

/**
 * Writes the quote onto the record and opens the compose box with it. Nothing
 * is sent until the owner does it; no money moves through Atlas.
 */
export async function createDeskQuote(formData: FormData) {
  const organizationId = text(formData, "organizationId", 36);
  const opportunityId = text(formData, "opportunityId", 36);
  const spanish = text(formData, "lang", 2) === "es";
  const { user, supabase } = await requireProspectOwner(organizationId, formData);
  if (!uuidPattern.test(opportunityId)) {
    redirect(scopedPath("/client/prospects", formData, "invalid"));
  }
  const detailBase = recordPath(opportunityId, formData);
  const parsed = validateDeskQuote(
    {
      description: text(formData, "description", 700),
      amount: text(formData, "amount", 40),
      validDays: text(formData, "validDays", 4),
    },
    spanish,
  );
  if (Object.keys(parsed.errors).length > 0 || parsed.amountUsd == null) {
    redirect(scopedPath(detailBase, formData, "quote_invalid"));
  }

  const record = await loadRecord(supabase, organizationId, opportunityId);
  if (!record) {
    redirect(scopedPath(detailBase, formData, "missing"));
  }

  const quote = newDeskQuote({
    id: randomUUID(),
    description: parsed.description,
    amountUsd: parsed.amountUsd,
    validDays: parsed.validDays,
    by: user.email,
  });
  const metadata = withDeskQuote(asOpportunityMetadata(record.metadata), quote);

  const { error } = await supabase
    .from("organization_opportunities")
    .update({ metadata })
    .eq("id", opportunityId)
    .eq("organization_id", organizationId);
  if (error) {
    console.error("Desk quote save failed", error);
    redirect(scopedPath(detailBase, formData, "failed"));
  }

  await supabase.from("organization_opportunity_events").insert({
    opportunity_id: opportunityId,
    organization_id: organizationId,
    event_type: "note_added",
    actor_role: "client",
    summary: `${user.email ?? "Owner"} wrote a quote for ${formatUsd(quote.amountUsd)}, good through ${quote.validUntil}. Not sent yet.`.slice(0, 500),
    body: quote.description,
  });

  revalidateRecord(opportunityId);
  redirect(scopedPath(detailBase, formData, "quote_ready", { quote: quote.id }));
}

/**
 * "I sent it" queues a check-in. "They accepted" makes them a won client with
 * the job value filled in. "They said no" keeps the record open with a note.
 */
export async function setDeskQuoteStatus(formData: FormData) {
  const organizationId = text(formData, "organizationId", 36);
  const opportunityId = text(formData, "opportunityId", 36);
  const quoteId = text(formData, "quoteId", 36);
  const status = text(formData, "status", 12);
  const { user, supabase } = await requireProspectOwner(organizationId, formData);
  if (!uuidPattern.test(opportunityId)) {
    redirect(scopedPath("/client/prospects", formData, "invalid"));
  }
  const detailBase = recordPath(opportunityId, formData);
  if (!uuidPattern.test(quoteId) || !isDeskQuoteStatus(status) || status === "drafted") {
    redirect(scopedPath(detailBase, formData, "invalid"));
  }

  const record = await loadRecord(supabase, organizationId, opportunityId);
  if (!record) {
    redirect(scopedPath(detailBase, formData, "missing"));
  }
  const metadata = asOpportunityMetadata(record.metadata);
  const quote = readDeskQuotes(metadata).find((item) => item.id === quoteId);
  if (!quote) {
    redirect(scopedPath(detailBase, formData, "missing"));
  }

  const now = new Date();
  const actor = user.email ?? "Owner";
  const amount = formatUsd(quote.amountUsd);
  const updated = { ...quote, status, statusAt: now.toISOString() };
  let nextMetadata: Record<string, unknown> = withDeskQuote(metadata, updated);
  const closed = record.stage === "won" || record.stage === "lost";
  let columns: Record<string, unknown> = {};
  let event: { eventType: string; summary: string } | null = null;

  if (status === "sent") {
    event = { eventType: "contacted", summary: `${actor} sent the ${amount} quote. Atlas did not send it. Check-in queued for ${localDateInDays(FOLLOW_UP_CHECK_IN_DAYS)}.` };
    if (!closed) {
      columns = {
        stage: record.stage === "responded" ? "responded" : "contacted",
        next_action: formData.get("lang") === "es"
          ? `Solo confirmo que recibiste la cotización de ${amount}. ¿Alguna duda antes de agendar?`
          : `Just checking you received the ${amount} quote. Any questions before we get it on the calendar?`,
        next_action_due: localDateInDays(FOLLOW_UP_CHECK_IN_DAYS),
      };
      nextMetadata = { ...nextMetadata, owner_contacted_at: now.toISOString() };
    }
  } else if (status === "accepted") {
    event = { eventType: "won", summary: `Quote accepted. ${record.name} is a client. Job value ${amount}. Atlas did not contact anyone.` };
    nextMetadata = { ...nextMetadata, [JOB_VALUE_METADATA_KEY]: quote.amountUsd, won_at: now.toISOString() };
    columns = {
      stage: "won",
      next_action: "Client. Deliver the job and ask for a review or referral.",
      next_action_due: null,
    };
  } else {
    event = { eventType: "note_added", summary: `${actor} marked the ${amount} quote declined. Ask what number works, or check back in a few months.` };
    if (!closed) {
      columns = {
        next_action: formData.get("lang") === "es"
          ? "Dijeron no a la cotización. Pregunta qué precio les funciona, o vuelve en unos meses."
          : "They passed on the quote. Ask what number works, or check back in a few months.",
        next_action_due: localDateInDays(7),
      };
    }
  }

  const { error } = await supabase
    .from("organization_opportunities")
    .update({ metadata: nextMetadata, ...columns })
    .eq("id", opportunityId)
    .eq("organization_id", organizationId);
  if (error) {
    console.error("Desk quote status failed", error);
    redirect(scopedPath(detailBase, formData, "failed"));
  }

  await supabase.from("organization_opportunity_events").insert({
    opportunity_id: opportunityId,
    organization_id: organizationId,
    event_type: event.eventType,
    actor_role: "client",
    summary: event.summary.slice(0, 500),
    body: `${deskQuoteStatusLabel(status, false)}: ${quote.description}`.slice(0, 3000),
  });

  revalidateRecord(opportunityId);
  redirect(scopedPath(detailBase, formData, status === "accepted" ? "quote_accepted" : status === "sent" ? "quote_sent" : "quote_declined"));
}

/** The owner's own pay link or how-to-pay line. Saved once, used in every quote. */
export async function saveDeskPayLink(formData: FormData) {
  const organizationId = text(formData, "organizationId", 36);
  const opportunityId = text(formData, "opportunityId", 36);
  const spanish = text(formData, "lang", 2) === "es";
  const { supabase } = await requireProspectOwner(organizationId, formData);
  const detailBase = uuidPattern.test(opportunityId) ? recordPath(opportunityId, formData) : "/client/prospects";
  const raw = text(formData, "payLink", 600);
  if (validatePayLink(raw, spanish)) {
    redirect(scopedPath(detailBase, formData, "invalid"));
  }
  const payLink = normalizePayLink(raw) || null;
  const { error } = await supabase
    .from("organization_desk_settings")
    .upsert({ organization_id: organizationId, pay_link: payLink, updated_at: new Date().toISOString() }, { onConflict: "organization_id" });
  if (error) {
    console.error("Desk pay link save failed", error);
    redirect(scopedPath(detailBase, formData, "failed"));
  }
  if (uuidPattern.test(opportunityId)) revalidateRecord(opportunityId);
  redirect(scopedPath(detailBase, formData, "pay_link_saved"));
}
