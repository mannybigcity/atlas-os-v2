"use server";

import { readFile } from "node:fs/promises";
import path from "node:path";

import { createClient } from "@/lib/supabase/server";
import { generateStructuredText } from "@/server/integrations/openai-responses";
import {
  IntegrationConfigurationError,
  IntegrationRequestError,
} from "@/server/integrations/errors";
import type { OpenAIStructuredTextResult } from "@/server/integrations/openai-responses";
import { isSuperAdminEmail } from "@/lib/env";
import { requireUser } from "@/server/auth/guards";
import { getUserMemberships } from "@/server/organizations/queries";
import { getClientDashboardData } from "@/server/client-dashboard/queries";
import {
  decideClientAiRoute,
  getClientAiRoleSpec,
  isBusinessRelevantPrompt,
  type ClientAiRole,
} from "@/server/client-ai/guardrails";
import {
  initialClientAiActionState,
  type ClientAiActionState,
  type ClientAiResponse,
} from "@/server/client-ai/types";
import {
  clientAiPlanLimits,
  getClientAiDailyQuestionCount,
  starterDailyQuestionLimit,
  type ClientAiDailyUsage,
  type ClientAiPlan,
} from "@/server/client-ai/queries";

const clientAiResponseSchema = {
  type: "object",
  additionalProperties: false,
  required: ["answer", "nextStep", "missingInputs"],
  properties: {
    answer: { type: "string", minLength: 20, maxLength: 1600 },
    nextStep: { type: "string", minLength: 5, maxLength: 200 },
    missingInputs: {
      type: "array",
      minItems: 0,
      maxItems: 4,
      items: { type: "string", minLength: 3, maxLength: 120 },
    },
  },
} as const;

function parseClientAiResponse(value: unknown): ClientAiResponse {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("invalid");
  }

  const candidate = value as {
    answer?: unknown;
    nextStep?: unknown;
    missingInputs?: unknown;
  };

  if (
    typeof candidate.answer !== "string" ||
    candidate.answer.trim().length < 20 ||
    candidate.answer.trim().length > 1600 ||
    typeof candidate.nextStep !== "string" ||
    candidate.nextStep.trim().length < 5 ||
    candidate.nextStep.trim().length > 200 ||
    !Array.isArray(candidate.missingInputs) ||
    candidate.missingInputs.length > 4
  ) {
    throw new Error("invalid");
  }

  const missingInputs = candidate.missingInputs.map((item) => {
    if (typeof item !== "string" || item.trim().length < 3) {
      throw new Error("invalid");
    }

    return item.trim();
  });

  return {
    answer: candidate.answer.trim(),
    nextStep: candidate.nextStep.trim(),
    missingInputs,
  };
}

function formatRequestResponse(input: {
  answer: string;
  nextStep: string;
  missingInputs: string[];
}) {
  const parts = [`Answer: ${input.answer}`, `Next step: ${input.nextStep}`];

  if (input.missingInputs.length > 0) {
    parts.push(`Missing inputs: ${input.missingInputs.join("; ")}`);
  }

  return parts.join("\n");
}

function compactList<T>(items: T[], limit = 5) {
  return items.slice(0, limit);
}

function cleanText(value: string | null | undefined) {
  const trimmed = String(value ?? "").trim();
  return trimmed.length > 0 ? trimmed : null;
}

function summarizeDashboard(organizationName: string, dashboard: Awaited<ReturnType<typeof getClientDashboardData>>) {
  const businessProfile = dashboard.businessProfile.setupRequired
    ? null
    : dashboard.businessProfile.data;
  const pilot = dashboard.pilot.setupRequired ? null : dashboard.pilot.data;
  const contentStudio = dashboard.contentStudio.setupRequired
    ? null
    : dashboard.contentStudio.data;
  const pipeline = dashboard.opportunityPipeline.setupRequired
    ? null
    : dashboard.opportunityPipeline.data;
  const activity = dashboard.activity.setupRequired ? [] : dashboard.activity.data;
  const notes = dashboard.notes.setupRequired ? [] : dashboard.notes.data;
  const aiRequests = dashboard.aiRequests.setupRequired ? [] : dashboard.aiRequests.data;

  const approvalQueue = [
    ...(pilot?.deliverables ?? [])
      .filter((deliverable) => deliverable.status === "ready_for_review")
      .map((deliverable) => ({
        type: "pilot_deliverable",
        title: deliverable.title,
        summary: deliverable.summary,
        updatedAt: deliverable.updatedAt,
      })),
    ...(contentStudio?.drafts ?? [])
      .filter((draft) => ["ready_for_review", "changes_requested"].includes(draft.status))
      .map((draft) => ({
        type: "content_draft",
        title: draft.title,
        summary: draft.caption.slice(0, 220),
        updatedAt: draft.updatedAt,
      })),
    ...notes
      .filter((note) => note.attentionRequested)
      .map((note) => ({
        type: "attention_note",
        title: note.title,
        summary: note.body?.slice(0, 220) ?? null,
        updatedAt: note.updatedAt,
      })),
  ];

  const calendarItems = [
    ...(pilot?.plan?.nextCheckInAt
      ? [
          {
            date: pilot.plan.nextCheckInAt,
            label: "Next check-in",
            detail: pilot.plan.thirtyDayGoal ?? "Pilot check-in",
          },
        ]
      : []),
    ...(contentStudio?.drafts ?? []).map((draft) => ({
      date: draft.draftDate,
      label: `${draft.campaign} draft`,
      detail: draft.title,
    })),
    ...(pipeline?.opportunities ?? [])
      .filter((opportunity) => Boolean(opportunity.nextActionDue))
      .map((opportunity) => ({
        date: opportunity.nextActionDue as string,
        label: `${opportunity.name} follow-up`,
        detail: opportunity.nextAction ?? opportunity.researchSummary.slice(0, 180),
      })),
  ].sort((left, right) => left.date.localeCompare(right.date));

  const openPipeline = (pipeline?.opportunities ?? [])
    .filter((opportunity) =>
      [
        "researching",
        "qualified",
        "needs_client_input",
        "ready_for_follow_up",
        "follow_up_queued",
        "contacted",
        "responded",
      ].includes(opportunity.stage),
    )
    .slice(0, 6)
    .map((opportunity) => ({
      name: opportunity.name,
      stage: opportunity.stage,
      fitScore: opportunity.fitScore,
      nextAction: opportunity.nextAction,
      dueDate: opportunity.nextActionDue,
    }));

  const weeklyActivity = activity.slice(0, 7).map((event) => ({
    title: event.title,
    type: event.eventType,
    occurredAt: event.occurredAt,
  }));

  const recentAiRequests = aiRequests.slice(0, 5).map((request) => ({
    role: request.role,
    scopeStatus: request.scopeStatus,
    status: request.status,
    createdAt: request.createdAt,
  }));

  return {
    organizationName,
    businessProfile: businessProfile
      ? {
          offer: cleanText(businessProfile.offer),
          targetCustomer: cleanText(businessProfile.targetCustomer),
          positioning: cleanText(businessProfile.positioning),
          currentGoals: cleanText(businessProfile.currentGoals),
          constraints: cleanText(businessProfile.constraints),
          updatedAt: businessProfile.updatedAt,
        }
      : null,
    plan: pilot?.plan
      ? {
          thirtyDayGoal: cleanText(pilot.plan.thirtyDayGoal),
          successDefinition: cleanText(pilot.plan.successDefinition),
          nextCheckInAt: pilot.plan.nextCheckInAt,
          status: pilot.plan.status,
          updatedAt: pilot.plan.updatedAt,
        }
      : null,
    counts: {
      pilotActions: pilot?.actions.length ?? 0,
      pilotReviewItems: pilot?.deliverables.filter((deliverable) => deliverable.status === "ready_for_review").length ?? 0,
      contentReviewItems: contentStudio?.drafts.filter((draft) => ["ready_for_review", "changes_requested"].includes(draft.status)).length ?? 0,
      opportunities: pipeline?.opportunities.length ?? 0,
      openPipelineItems: openPipeline.length,
      notes: notes.length,
      attentionNotes: notes.filter((note) => note.attentionRequested).length,
      activityItems: weeklyActivity.length,
      aiRequests: recentAiRequests.length,
      aiRequestsTotal: aiRequests.length,
    },
    approvalQueue,
    calendarItems,
    openPipeline,
    weeklyActivity,
    recentAiRequests,
    contentDrafts: compactList(
      (contentStudio?.drafts ?? []).map((draft) => ({
        title: draft.title,
        campaign: draft.campaign,
        status: draft.status,
        draftDate: draft.draftDate,
        headline: draft.headline,
      })),
    ),
    opportunities: compactList(
      (pipeline?.opportunities ?? []).map((opportunity) => ({
        name: opportunity.name,
        stage: opportunity.stage,
        fitScore: opportunity.fitScore,
        sourceLabel: opportunity.sourceLabel,
        nextAction: opportunity.nextAction,
      })),
    ),
    activitySummary: weeklyActivity,
  };
}

async function loadRoleMarkdown(role: ClientAiRole) {
  const spec = getClientAiRoleSpec(role);
  const markdownPath = path.join(
    /* turbopackIgnore: true */ process.cwd(),
    spec.markdownPath,
  );
  return readFile(markdownPath, "utf8");
}

async function logClientAiRequest(input: {
  organizationId: string;
  requestedBy: string;
  role: ClientAiRole;
  scopeStatus: ClientAiActionState["scopeStatus"];
  status: "succeeded" | "blocked" | "failed";
  prompt: string;
  response: string;
  routedTo: ClientAiRole | null;
}) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("organization_ai_requests")
    .insert({
      organization_id: input.organizationId,
      requested_by: input.requestedBy,
      role: input.role,
      scope_status: input.scopeStatus,
      status: input.status,
      prompt: input.prompt,
      response: input.response,
      routed_to: input.routedTo,
    })
    .select("id, created_at")
    .single();

  if (error) {
    throw error;
  }

  return {
    id: data.id as string,
    createdAt: data.created_at as string,
  };
}

function unloggedClientAiResponse(input: {
  status: "success" | "blocked" | "failed";
  role: ClientAiRole;
  routedTo: ClientAiRole | null;
  scopeStatus: ClientAiActionState["scopeStatus"];
  answer: string;
  nextStep: string;
  missingInputs?: string[];
  dailyUsage?: ClientAiDailyUsage | null;
}): ClientAiActionState {
  return {
    status: input.status,
    role: input.role,
    routedTo: input.routedTo,
    scopeStatus: input.scopeStatus,
    requestId: null,
    createdAt: null,
    answer: input.answer,
    nextStep: input.nextStep,
    missingInputs: input.missingInputs ?? [],
    error: null,
    dailyUsage: input.dailyUsage ?? null,
  };
}

type ClientAiReservationRow = {
  allowed: boolean;
  plan: ClientAiPlan;
  used: number;
  limit: number | null;
  remaining: number | null;
};

function reservationUsage(row: ClientAiReservationRow): ClientAiDailyUsage {
  const plan = row.plan in clientAiPlanLimits ? row.plan : "basic";
  const limit = clientAiPlanLimits[plan];
  return {
    plan,
    planLabel: plan === "unlimited" ? "Unlimited" : plan === "growth" ? "Growth" : "Basic",
    used: Math.max(0, Number(row.used) || 0),
    limit,
    remaining: limit === null ? null : Math.max(0, Number(row.remaining) || 0),
  };
}

async function reserveClientAiQuestion(organizationId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("reserve_client_ai_daily_question", {
    p_organization_id: organizationId,
  });
  const row = Array.isArray(data) ? data[0] : data;

  if (error || !row) return { error: error?.message ?? "AI usage is unavailable.", usage: null, allowed: false };

  const reservation = row as ClientAiReservationRow;
  return { error: null, usage: reservationUsage(reservation), allowed: reservation.allowed };
}

export async function submitClientAiRequest(
  _previousState: ClientAiActionState,
  formData: FormData,
): Promise<ClientAiActionState> {
  const user = await requireUser("/client");
  const organizationId = String(formData.get("organizationId") ?? "").trim();
  const roleValue = String(formData.get("role") ?? "").trim();
  const prompt = String(formData.get("prompt") ?? "").trim();

  if (!organizationId) {
    return {
      ...initialClientAiActionState,
      status: "failed",
      role: "atlas",
      error: "Select a workspace before asking the coordinator.",
    };
  }

  if (!roleValue || !["atlas", "hunter", "micah", "david"].includes(roleValue)) {
    return {
      ...initialClientAiActionState,
      status: "failed",
      role: "atlas",
      error: "Choose a valid role before sending the request.",
    };
  }

  const role = roleValue as ClientAiRole;
  const scopeMode = String(formData.get("scopeMode") ?? "").trim();

  if (prompt.length < 2) {
    return {
      ...initialClientAiActionState,
      status: "blocked",
      role,
      error: "Type a question before sending it to a role.",
    };
  }

  if (prompt.length > 1200) {
    return {
      ...initialClientAiActionState,
      status: "blocked",
      role,
      error: "Keep the request under 1,200 characters.",
    };
  }

  if (scopeMode === "business_only" && !isBusinessRelevantPrompt(prompt)) {
    const response =
      "I can only answer questions about your business, clients, follow-up, content, prospects, or operations in this workspace.";

    try {
      const logged = await logClientAiRequest({
        organizationId,
        requestedBy: user.id,
        role,
        scopeStatus: "declined",
        status: "blocked",
        prompt,
        response,
        routedTo: role,
      });

      return {
        status: "blocked",
        role,
        routedTo: role,
        scopeStatus: "declined",
        requestId: logged.id,
        createdAt: logged.createdAt,
        answer: response,
        nextStep: "Ask a question about your business or your customer work.",
        missingInputs: [],
        error: null,
      };
    } catch {
      return unloggedClientAiResponse({
        status: "blocked",
        role,
        routedTo: role,
        scopeStatus: "declined",
        answer: response,
        nextStep: "Ask a question about your business or your customer work.",
      });
    }
  }

  const isSuperAdmin = isSuperAdminEmail(user.email);
  const memberships = await getUserMemberships(user.id);
  if (memberships.setupRequired && !isSuperAdmin) {
    return {
      ...initialClientAiActionState,
      status: "failed",
      role,
      error: "Workspace access could not be loaded. Try again or contact your workspace team.",
    };
  }

  const membership = memberships.data.find(
    (entry) => entry.organization?.id === organizationId,
  );

  if (!membership && !isSuperAdmin) {
    return {
      ...initialClientAiActionState,
      status: "blocked",
      role,
      error: "That workspace is not assigned to your account.",
    };
  }

  const decision = decideClientAiRoute({ role, prompt });
  const responsePrefix = decision.scopeStatus === "declined"
    ? "That request is not allowed here."
    : decision.scopeStatus === "rerouted"
      ? decision.reason ?? "That request belongs with the coordinator."
      : null;

  if (decision.blocked) {
    const response = responsePrefix ?? "Type a specific question for this role.";

    try {
      const logged = await logClientAiRequest({
        organizationId,
        requestedBy: user.id,
        role,
        scopeStatus: decision.scopeStatus,
        status: "blocked",
        prompt,
        response,
        routedTo: decision.routedTo,
      });

      return {
        status: "blocked",
        role,
        routedTo: decision.routedTo,
        scopeStatus: decision.scopeStatus,
        requestId: logged.id,
        createdAt: logged.createdAt,
        answer: response,
        nextStep:
          decision.scopeStatus === "declined"
            ? "Ask the coordinator to handle a safe workspace question."
            : "Add the missing input and try again.",
        missingInputs:
          decision.scopeStatus === "needs_input" ? ["A clear question"] : [],
        error: null,
      };
    } catch {
      return unloggedClientAiResponse({
        status: "blocked",
        role,
        routedTo: decision.routedTo,
        scopeStatus: decision.scopeStatus,
        answer: response,
        nextStep:
          decision.scopeStatus === "declined"
            ? "Ask the coordinator to handle a safe workspace question."
            : "Add the missing input and try again.",
        missingInputs:
          decision.scopeStatus === "needs_input" ? ["A clear question"] : [],
      });
    }
  }

  const reservation = await reserveClientAiQuestion(organizationId);
  if (reservation.error || !reservation.usage) {
    return {
      ...initialClientAiActionState,
      status: "failed",
      role,
      error: "Workspace question usage could not be verified. Try again shortly.",
    };
  }

  if (!reservation.allowed) {
    return {
      ...initialClientAiActionState,
      status: "blocked",
      role,
      dailyUsage: reservation.usage,
      error: `${reservation.usage.planLabel} has reached its daily Ask Atlas limit. It resets tomorrow.`,
    };
  }

  const resolvedRole = decision.routedTo ?? role;
  const roleSpec = getClientAiRoleSpec(resolvedRole);

  if (decision.scopeStatus === "rerouted" && resolvedRole === "atlas") {
    const response =
      decision.reason ?? "That question belongs with the coordinator.";

    try {
      const logged = await logClientAiRequest({
        organizationId,
        requestedBy: user.id,
        role,
        scopeStatus: decision.scopeStatus,
        status: "succeeded",
        prompt,
        response,
        routedTo: resolvedRole,
      });

      return {
        status: "success",
        role,
        routedTo: resolvedRole,
        scopeStatus: decision.scopeStatus,
        requestId: logged.id,
        createdAt: logged.createdAt,
        answer: response,
        nextStep: "Switch to the coordinator for a workspace-wide answer.",
        missingInputs: [],
        error: null,
        dailyUsage: reservation.usage,
      };
    } catch {
      return unloggedClientAiResponse({
        status: "success",
        role,
        routedTo: resolvedRole,
        scopeStatus: decision.scopeStatus,
        answer: response,
        nextStep: "Switch to the coordinator for a workspace-wide answer.",
        dailyUsage: reservation.usage,
      });
    }
  }

  const dashboard = await getClientDashboardData(organizationId);
  const guardrails = await loadRoleMarkdown(resolvedRole);
  const workspaceSummary = summarizeDashboard(
    membership.organization?.name ?? "Client workspace",
    dashboard,
  );

  let result: OpenAIStructuredTextResult<ClientAiResponse>;

  try {
    result = await generateStructuredText({
      schemaName: `client_${resolvedRole}_response`,
      schema: clientAiResponseSchema,
      maxOutputTokens: 1_200,
      instructions: [
        `You are ${roleSpec.title} inside a protected client dashboard.`,
        `Follow the guardrails below exactly.`,
        `Use only the supplied workspace context and do not invent facts, metrics, events, or results.`,
        `Never browse the web, scrape sources, send messages, publish content, spend money, or change credentials.`,
        `If the request is missing key inputs, say exactly which ones are needed.`,
        `If the request would require an external action, respond that the workspace team must coordinate it.`,
        `Return only the requested JSON.`,
        "",
        guardrails,
      ].join("\n"),
      input: JSON.stringify({
        organizationName: membership.organization?.name ?? "Client workspace",
        role: resolvedRole,
        userPrompt: prompt,
        workspace: workspaceSummary,
      }),
      parse: parseClientAiResponse,
    });
  } catch (error) {
    const response =
      error instanceof IntegrationConfigurationError
        ? "OpenAI is not configured in the server runtime."
        : error instanceof IntegrationRequestError
          ? `OpenAI request failed (${error.code}).`
          : "The workspace could not generate a response right now.";

    try {
      const logged = await logClientAiRequest({
        organizationId,
        requestedBy: user.id,
        role,
        scopeStatus: "in_scope",
        status: error instanceof IntegrationConfigurationError ? "blocked" : "failed",
        prompt,
        response,
        routedTo: resolvedRole,
      });

      return {
        status: error instanceof IntegrationConfigurationError ? "blocked" : "failed",
        role,
        routedTo: resolvedRole,
        scopeStatus: "in_scope",
        requestId: logged.id,
        createdAt: logged.createdAt,
        answer: response,
        nextStep: "Try again after checking the server configuration.",
        missingInputs: [],
        error: null,
        dailyUsage: reservation.usage,
      };
    } catch {
      return unloggedClientAiResponse({
        status: error instanceof IntegrationConfigurationError ? "blocked" : "failed",
        role,
        routedTo: resolvedRole,
        scopeStatus: "in_scope",
        answer: response,
        nextStep: "Try again after checking the server configuration.",
        dailyUsage: reservation.usage,
      });
    }
  }

  const responseText = formatRequestResponse({
    answer: result.value.answer,
    nextStep: result.value.nextStep,
    missingInputs: result.value.missingInputs,
  });

  try {
    const logged = await logClientAiRequest({
      organizationId,
      requestedBy: user.id,
      role,
      scopeStatus: decision.scopeStatus,
      status: "succeeded",
      prompt,
      response: responseText,
      routedTo: resolvedRole,
    });

    return {
      status: "success",
      role,
      routedTo: resolvedRole,
      scopeStatus: decision.scopeStatus,
      requestId: logged.id,
      createdAt: logged.createdAt,
      answer: result.value.answer,
      nextStep: result.value.nextStep,
      missingInputs: result.value.missingInputs,
      error: null,
      dailyUsage: reservation.usage,
    };
  } catch {
    return unloggedClientAiResponse({
      status: "success",
      role,
      routedTo: resolvedRole,
      scopeStatus: decision.scopeStatus,
      answer: result.value.answer,
      nextStep: result.value.nextStep,
      missingInputs: result.value.missingInputs,
      dailyUsage: reservation.usage,
    });
  }

  const dailyUsage = await getClientAiDailyQuestionCount(organizationId);
  if (dailyUsage.error) {
    return {
      ...initialClientAiActionState,
      status: "failed",
      role,
      error: "Workspace question usage could not be verified. Try again shortly.",
    };
  }

  if (dailyUsage.count >= starterDailyQuestionLimit) {
    return {
      ...initialClientAiActionState,
      status: "blocked",
      role,
      error: "Today’s 10 included workspace questions have been used. Higher-tier limits are not active yet.",
    };
  }
}
