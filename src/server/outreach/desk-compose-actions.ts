"use server";

import { revalidatePath } from "next/cache";
import { isSuperAdminEmail } from "@/lib/env";
import {
  isAfeCrmDemoOrganization,
  isAfeOperatorDeskOrganization,
  isSisOrganization,
} from "@/lib/client-portal/identity";
import {
  amandaComposeAiInput,
  amandaComposeAiInstructions,
  amandaComposeAiSchema,
  AMANDA_COMPOSE_AI_SCHEMA_NAME,
  nextMessageFromAiDraft,
  parseAmandaComposeAiDraft,
} from "@/lib/lions-den/amanda-compose-ai";
import { isAtlasAskCapped } from "@/lib/lions-den/atlas-quota";
import { lionsDenHref } from "@/lib/lions-den/client-hub";
import {
  amandaClose,
  hasSafeBusinessProfile,
  nextMessage,
  type NextMessageInput,
  type NextMessageResult,
} from "@/lib/lions-den/next-message-engine";
import {
  micahFlyerConfirmation,
  micahFlyerPrompt,
} from "@/lib/lions-den/micah-flyer-request";
import { requireUser } from "@/server/auth/guards";
import { getClientAiDailyUsage } from "@/server/client-ai/queries";
import { createMicahGalleryDraft, readMicahDemeanor } from "@/server/content-studio/gallery-draft";
import { isOpenAIConfigured } from "@/server/integrations/openai-gateway";
import { generateStructuredText } from "@/server/integrations/openai-responses";
import { getUserMemberships } from "@/server/organizations/queries";
import { createClient } from "@/lib/supabase/server";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type DeskComposeAiState = {
  status: "success" | "fallback" | "capped" | "error";
  engine: NextMessageResult;
  counted: boolean;
  message: string;
};

export type DeskMicahFlyerState = {
  status: "saved" | "queued" | "error";
  message: string;
  galleryHref: string | null;
};

type ComposeFacts = {
  organizationId: string;
  spanish: boolean;
  ownerFirstName: string;
  businessName: string;
  ownerPhone: string | null;
  trade: string | null;
  city: string | null;
  prospectName: string;
  prospectCompany: string | null;
  prospectType: string | null;
  notesText?: string | null;
  previewOrgSlug?: string | null;
  workspaceSlug?: string | null;
};

type ClientAiReservationRow = {
  allowed: boolean;
  plan: string;
  used: number;
  limit: number | null;
  remaining: number | null;
};

async function requireDeskMember(organizationId: string) {
  const user = await requireUser("/client");
  if (!uuidPattern.test(organizationId)) {
    return { error: "invalid", user: null, organization: null };
  }
  const supabase = await createClient();
  const { data: organization } = await supabase
    .from("organizations")
    .select("id, name, slug")
    .eq("id", organizationId)
    .maybeSingle();
  if (!organization) return { error: "invalid", user: null, organization: null };
  if (!isSuperAdminEmail(user.email)) {
    const memberships = await getUserMemberships(user.id);
    if (!memberships.data.some((item) => item.organization?.id === organizationId)) {
      return { error: "denied", user: null, organization: null };
    }
  }
  return {
    error: null,
    user,
    organization: organization as { id: string; name: string | null; slug: string | null },
  };
}

function composeInput(facts: ComposeFacts): NextMessageInput {
  return {
    spanish: facts.spanish,
    ownerFirstName: facts.ownerFirstName,
    businessName: facts.businessName,
    ownerPhone: facts.ownerPhone,
    trade: facts.trade,
    city: facts.city,
    prospectName: facts.prospectName,
    prospectCompany: facts.prospectCompany,
    prospectType: facts.prospectType,
    stage: "researching",
    opportunityType: "partner",
    lastTouchAt: null,
    nowIso: new Date().toISOString(),
    notesText: String(facts.notesText ?? ""),
    quoteAmount: null,
  };
}

async function reserveClientAiQuestion(organizationId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("reserve_client_ai_daily_question", {
    p_organization_id: organizationId,
  });
  const row = Array.isArray(data) ? data[0] : data;
  if (error || !row) return { allowed: false };
  return { allowed: Boolean((row as ClientAiReservationRow).allowed) };
}

async function logDeskAiRequest(input: {
  organizationId: string;
  requestedBy: string;
  role: "david" | "micah";
  status: "succeeded" | "blocked" | "failed";
  prompt: string;
  response: string;
}) {
  const supabase = await createClient();
  await supabase.from("organization_ai_requests").insert({
    organization_id: input.organizationId,
    requested_by: input.requestedBy,
    role: input.role,
    scope_status: "in_scope",
    status: input.status,
    prompt: input.prompt,
    response: input.response,
    routed_to: input.role,
  });
}

function fallbackMessage(spanish: boolean, reason: "capped" | "fallback") {
  if (spanish) {
    return reason === "capped"
      ? "Se acabó el cupo de AI de hoy. Quedó el primer saludo listo para enviar."
      : "Amanda usó el primer saludo fijo. Léelo y envíalo tú. Nada se mandó solo.";
  }
  return reason === "capped"
    ? "Today's AI budget is used. The first-hello draft is still ready to send."
    : "Amanda kept the first-hello draft. Read it and send it yourself. Nothing auto-sent.";
}

export async function requestAmandaFirstTouchDraft(facts: ComposeFacts): Promise<DeskComposeAiState> {
  const input = composeInput(facts);
  const engine = nextMessage(input);
  const spanish = facts.spanish;
  const auth = await requireDeskMember(facts.organizationId);
  if (auth.error || !auth.user) {
    return {
      status: "error",
      engine,
      counted: false,
      message: spanish ? "No se pudo pedir el borrador." : "Could not request that draft.",
    };
  }

  if (!hasSafeBusinessProfile(input)) {
    return {
      status: "fallback",
      engine,
      counted: false,
      message: spanish
        ? "Falta el perfil del negocio para escribir con AI. Quedó el borrador fijo."
        : "Not enough business profile for AI. The fixed draft is still there.",
    };
  }

  const usageLookup = await getClientAiDailyUsage(facts.organizationId);
  const usage = usageLookup.data;
  if (usageLookup.setupRequired || isAtlasAskCapped(usage.used, usage.plan)) {
    return {
      status: "capped",
      engine,
      counted: false,
      message: fallbackMessage(spanish, "capped"),
    };
  }

  if (!isOpenAIConfigured(process.env.OPENAI_API_KEY)) {
    return {
      status: "fallback",
      engine,
      counted: false,
      message: fallbackMessage(spanish, "fallback"),
    };
  }

  const close = amandaClose(input);
  try {
    const result = await generateStructuredText({
      schemaName: AMANDA_COMPOSE_AI_SCHEMA_NAME,
      schema: amandaComposeAiSchema,
      maxOutputTokens: 800,
      instructions: amandaComposeAiInstructions(spanish),
      input: JSON.stringify(amandaComposeAiInput(input, close)),
      parse: (value) => {
        const parsed = parseAmandaComposeAiDraft(value);
        if (!parsed) throw new Error("invalid");
        return parsed;
      },
    });
    const drafted = nextMessageFromAiDraft(input, result.value);
    if (!drafted) {
      await logDeskAiRequest({
        organizationId: facts.organizationId,
        requestedBy: auth.user.id,
        role: "david",
        status: "failed",
        prompt: "Ask Amanda first-touch",
        response: "AI draft failed safety checks. Deterministic first_touch kept.",
      });
      return { status: "fallback", engine, counted: false, message: fallbackMessage(spanish, "fallback") };
    }
    await reserveClientAiQuestion(facts.organizationId);
    await logDeskAiRequest({
      organizationId: facts.organizationId,
      requestedBy: auth.user.id,
      role: "david",
      status: "succeeded",
      prompt: "Ask Amanda first-touch",
      response: drafted.subject,
    });
    return {
      status: "success",
      engine: drafted,
      counted: true,
      message: spanish
        ? "Amanda reescribió el primer saludo. Léelo y envíalo tú. Nada se mandó solo."
        : "Amanda rewrote the first hello. Read it and send it yourself. Nothing auto-sent.",
    };
  } catch {
    await logDeskAiRequest({
      organizationId: facts.organizationId,
      requestedBy: auth.user.id,
      role: "david",
      status: "failed",
      prompt: "Ask Amanda first-touch",
      response: "AI unavailable. Deterministic first_touch kept.",
    }).catch(() => undefined);
    return { status: "fallback", engine, counted: false, message: fallbackMessage(spanish, "fallback") };
  }
}

export async function requestMicahFlyerDraft(facts: ComposeFacts): Promise<DeskMicahFlyerState> {
  const spanish = facts.spanish;
  const auth = await requireDeskMember(facts.organizationId);
  const galleryHref = lionsDenHref("/client/micah", facts.previewOrgSlug ?? undefined, facts.workspaceSlug ?? undefined);
  if (auth.error || !auth.user || !auth.organization) {
    return {
      status: "error",
      galleryHref: null,
      message: spanish ? "No se pudo pedir el flyer." : "Could not request that flyer.",
    };
  }

  const sisDesk = isSisOrganization(auth.organization);
  const afeHouse =
    isAfeCrmDemoOrganization(auth.organization) || isAfeOperatorDeskOrganization(auth.organization);
  const prompt = micahFlyerPrompt({
    spanish,
    prospectName: facts.prospectName,
    prospectCompany: facts.prospectCompany,
    prospectType: facts.prospectType,
    businessName: facts.businessName,
    trade: facts.trade,
    city: facts.city,
    sisDesk,
  });
  const stored = await readMicahDemeanor(facts.organizationId);
  const demeanor = stored && stored !== "faith" ? stored : "friendly_local";
  try {
    const draft = await createMicahGalleryDraft({
      organizationId: facts.organizationId,
      userId: auth.user.id,
      prompt,
      demeanor,
      demoDesk: afeHouse,
      focusDay: 1,
    });
    revalidatePath("/client/micah");
    const saved = draft.status === "success";
    return {
      status: saved ? "saved" : "queued",
      galleryHref,
      message: micahFlyerConfirmation({
        spanish,
        prospectName: facts.prospectName,
        saved,
        galleryHref,
      }),
    };
  } catch {
    return {
      status: "queued",
      galleryHref,
      message: micahFlyerConfirmation({
        spanish,
        prospectName: facts.prospectName,
        saved: false,
        galleryHref,
      }),
    };
  }
}
