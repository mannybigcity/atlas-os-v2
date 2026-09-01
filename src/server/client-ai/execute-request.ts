import {
  IntegrationConfigurationError,
  IntegrationRequestError,
} from "../integrations/errors.ts";
import { AI_NOT_ENABLED_MESSAGE } from "../integrations/openai-gateway.ts";
import type {
  OpenAIStructuredTextRequest,
  OpenAIStructuredTextResult,
} from "../integrations/openai-responses.ts";
import {
  atlasAskUsageFromCounts,
  isAtlasAskCapped,
} from "../../lib/lions-den/atlas-quota.ts";
import {
  ATLAS_OFF_TOPIC_REPLY,
  isLionDenJobPrompt,
} from "../../lib/lions-den/atlas-job-scope.ts";
import {
  decideClientAiRoute,
  getClientAiRoleSpec,
  isClientAiRole,
  type ClientAiRole,
} from "./guardrails.ts";
import {
  initialClientAiActionState,
  type ClientAiActionState,
  type ClientAiResponse,
} from "./types.ts";
import type { ClientAiDailyUsage } from "./queries.ts";

export const clientAiResponseSchema = {
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

type MembershipLike = {
  organization?: { id: string; name?: string | null } | null;
};

type Lookup<T> = {
  data: T;
  setupRequired: boolean;
  error: string | null;
};

type DashboardLike = {
  businessProfile: { setupRequired: boolean; data?: unknown };
  pilot: { setupRequired: boolean; data?: unknown };
  contentStudio: { setupRequired: boolean; data?: unknown };
  opportunityPipeline: { setupRequired: boolean; data?: unknown };
  activity: { setupRequired: boolean; data?: unknown };
  notes: { setupRequired: boolean; data?: unknown };
  aiRequests: { setupRequired: boolean; data?: unknown };
};

export type ClientAiRequestDeps = {
  requireUser: () => Promise<{ id: string; email?: string | null }>;
  isSuperAdminEmail: (email?: string | null) => boolean;
  getUserMemberships: (userId: string) => Promise<Lookup<MembershipLike[]>>;
  getClientAiDailyUsage: (organizationId: string) => Promise<Lookup<ClientAiDailyUsage>>;
  reserveClientAiQuestion: (organizationId: string) => Promise<{
    error: string | null;
    usage: ClientAiDailyUsage | null;
    allowed: boolean;
  }>;
  generateStructuredText: <T>(
    request: OpenAIStructuredTextRequest<T>,
  ) => Promise<OpenAIStructuredTextResult<T>>;
  getClientDashboardData: (organizationId: string) => Promise<DashboardLike>;
  loadRoleMarkdown: (role: ClientAiRole) => Promise<string>;
  logClientAiRequest: (input: {
    organizationId: string;
    requestedBy: string;
    role: ClientAiRole;
    scopeStatus: ClientAiActionState["scopeStatus"];
    status: "succeeded" | "blocked" | "failed";
    prompt: string;
    response: string;
    routedTo: ClientAiRole | null;
  }) => Promise<{ id: string; createdAt: string }>;
};

export function parseClientAiResponse(value: unknown): ClientAiResponse {
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

export function clientAiUserFacingError(error: unknown) {
  if (error instanceof IntegrationConfigurationError) {
    return AI_NOT_ENABLED_MESSAGE;
  }

  if (error instanceof IntegrationRequestError) {
    return `OpenAI request failed (${error.code}).`;
  }

  return "The workspace could not generate a response right now.";
}

export function resolveClientAiDailyUsage(lookup: Lookup<ClientAiDailyUsage>): ClientAiDailyUsage {
  if (lookup.setupRequired) {
    return atlasAskUsageFromCounts(0, "basic");
  }

  return lookup.data;
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

function summarizeDashboard(organizationName: string, dashboard: DashboardLike) {
  const businessProfile = dashboard.businessProfile.setupRequired
    ? null
    : (dashboard.businessProfile.data as {
        offer?: string | null;
        targetCustomer?: string | null;
        positioning?: string | null;
        currentGoals?: string | null;
        constraints?: string | null;
        updatedAt?: string;
      } | null);
  const pilot = dashboard.pilot.setupRequired
    ? null
    : (dashboard.pilot.data as {
        plan?: {
          thirtyDayGoal?: string | null;
          successDefinition?: string | null;
          nextCheckInAt?: string | null;
          status?: string;
          updatedAt?: string;
        } | null;
        actions?: unknown[];
        deliverables?: Array<{
          status: string;
          title: string;
          summary: string | null;
          updatedAt: string;
        }>;
      } | null);
  const contentStudio = dashboard.contentStudio.setupRequired
    ? null
    : (dashboard.contentStudio.data as {
        drafts?: Array<{
          status: string;
          title: string;
          caption: string;
          updatedAt: string;
          campaign: string;
          draftDate: string;
          headline: string;
        }>;
      } | null);
  const pipeline = dashboard.opportunityPipeline.setupRequired
    ? null
    : (dashboard.opportunityPipeline.data as {
        opportunities?: Array<{
          name: string;
          stage: string;
          fitScore: number | null;
          nextAction: string | null;
          nextActionDue: string | null;
          researchSummary: string;
          sourceLabel: string | null;
        }>;
      } | null);
  const activity = dashboard.activity.setupRequired
    ? []
    : ((dashboard.activity.data as Array<{
        title: string;
        eventType: string;
        occurredAt: string;
      }>) ?? []);
  const notes = dashboard.notes.setupRequired
    ? []
    : ((dashboard.notes.data as Array<{
        attentionRequested: boolean;
        title: string;
        body: string | null;
        updatedAt: string;
      }>) ?? []);
  const aiRequests = dashboard.aiRequests.setupRequired
    ? []
    : ((dashboard.aiRequests.data as Array<{
        role: string;
        scopeStatus: string;
        status: string;
        createdAt: string;
      }>) ?? []);

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
      pilotActions: pilot?.actions?.length ?? 0,
      pilotReviewItems: pilot?.deliverables?.filter((deliverable) => deliverable.status === "ready_for_review").length ?? 0,
      contentReviewItems: contentStudio?.drafts?.filter((draft) => ["ready_for_review", "changes_requested"].includes(draft.status)).length ?? 0,
      opportunities: pipeline?.opportunities?.length ?? 0,
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

function unloggedClientAiResponse(input: {
  status: "success" | "blocked" | "failed";
  role: ClientAiRole;
  routedTo: ClientAiRole | null;
  scopeStatus: ClientAiActionState["scopeStatus"];
  answer: string;
  nextStep: string;
  missingInputs?: string[];
  dailyUsage?: ClientAiDailyUsage | null;
  error?: string | null;
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
    error: input.error ?? null,
    dailyUsage: input.dailyUsage ?? null,
  };
}

async function commitSuccessfulAsk(
  deps: ClientAiRequestDeps,
  organizationId: string,
  fallback: ClientAiDailyUsage,
) {
  const reservation = await deps.reserveClientAiQuestion(organizationId);
  return reservation.usage ?? atlasAskUsageFromCounts(fallback.used + 1, fallback.plan);
}

export function createSubmitClientAiRequest(deps: ClientAiRequestDeps) {
  return async function submitClientAiRequest(
    _previousState: ClientAiActionState,
    formData: FormData,
  ): Promise<ClientAiActionState> {
    const user = await deps.requireUser();
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

    if (!roleValue || !isClientAiRole(roleValue)) {
      return {
        ...initialClientAiActionState,
        status: "failed",
        role: "atlas",
        error: "Choose a valid role before sending the request.",
      };
    }

    const role = roleValue;
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

    if (scopeMode === "business_only" && !isLionDenJobPrompt(prompt)) {
      const response = ATLAS_OFF_TOPIC_REPLY;

      try {
        const logged = await deps.logClientAiRequest({
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
          nextStep: "Ask about work on this desk.",
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
          nextStep: "Ask about work on this desk.",
        });
      }
    }

    const isSuperAdmin = deps.isSuperAdminEmail(user.email);
    const memberships = await deps.getUserMemberships(user.id);
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
        const logged = await deps.logClientAiRequest({
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

    const usageLookup = await deps.getClientAiDailyUsage(organizationId);
    const currentUsage = resolveClientAiDailyUsage(usageLookup);
    if (isAtlasAskCapped(currentUsage.used, currentUsage.plan)) {
      const shown = currentUsage.limit === null
        ? String(currentUsage.used)
        : `${currentUsage.used}/${currentUsage.limit}`;
      const response = `${currentUsage.planLabel} ${shown} today. GROW is 10/day. UNLIMITED is uncapped.`;
      return {
        ...initialClientAiActionState,
        status: "blocked",
        role,
        dailyUsage: currentUsage,
        answer: response,
        error: response,
      };
    }

    const resolvedRole = decision.routedTo ?? role;
    const roleSpec = getClientAiRoleSpec(resolvedRole);

    if (decision.scopeStatus === "rerouted" && resolvedRole === "atlas") {
      const response =
        decision.reason ?? "That question belongs with the coordinator.";
      const dailyUsage = await commitSuccessfulAsk(deps, organizationId, currentUsage);

      try {
        const logged = await deps.logClientAiRequest({
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
          dailyUsage,
        };
      } catch {
        return unloggedClientAiResponse({
          status: "success",
          role,
          routedTo: resolvedRole,
          scopeStatus: decision.scopeStatus,
          answer: response,
          nextStep: "Switch to the coordinator for a workspace-wide answer.",
          dailyUsage,
        });
      }
    }

    const dashboard = await deps.getClientDashboardData(organizationId);
    const guardrails = await deps.loadRoleMarkdown(resolvedRole);
    const organizationName = membership?.organization?.name ?? "Client workspace";
    const workspaceSummary = summarizeDashboard(organizationName, dashboard);

    let result: OpenAIStructuredTextResult<ClientAiResponse>;

    try {
      result = await deps.generateStructuredText({
        schemaName: `client_${resolvedRole}_response`,
        schema: clientAiResponseSchema,
        maxOutputTokens: 1_200,
        instructions: [
          `You are ${roleSpec.title} inside a protected client dashboard.`,
          `You only answer Lion's Den desk work for this client: pipeline, prospects, follow-up, notes, calendar, HUNTER pile, MICAH drafts, and their business on this desk.`,
          `Refuse trivia and anything that is not their job in this CRM. Never send email, SMS, calls, or social posts.`,
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
          organizationName,
          role: resolvedRole,
          userPrompt: prompt,
          workspace: workspaceSummary,
        }),
        parse: parseClientAiResponse,
      });
    } catch (error) {
      const response = clientAiUserFacingError(error);
      const failedStatus = error instanceof IntegrationConfigurationError ? "blocked" : "failed";

      try {
        const logged = await deps.logClientAiRequest({
          organizationId,
          requestedBy: user.id,
          role,
          scopeStatus: "in_scope",
          status: failedStatus === "blocked" ? "blocked" : "failed",
          prompt,
          response,
          routedTo: resolvedRole,
        });

        return {
          status: failedStatus,
          role,
          routedTo: resolvedRole,
          scopeStatus: "in_scope",
          requestId: logged.id,
          createdAt: logged.createdAt,
          answer: response,
          nextStep: "Try again after checking the server configuration.",
          missingInputs: [],
          error: response,
          dailyUsage: currentUsage,
        };
      } catch {
        return unloggedClientAiResponse({
          status: failedStatus,
          role,
          routedTo: resolvedRole,
          scopeStatus: "in_scope",
          answer: response,
          nextStep: "Try again after checking the server configuration.",
          dailyUsage: currentUsage,
          error: response,
        });
      }
    }

    const dailyUsage = await commitSuccessfulAsk(deps, organizationId, currentUsage);
    const responseText = formatRequestResponse({
      answer: result.value.answer,
      nextStep: result.value.nextStep,
      missingInputs: result.value.missingInputs,
    });

    try {
      const logged = await deps.logClientAiRequest({
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
        dailyUsage,
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
        dailyUsage,
      });
    }
  };
}
