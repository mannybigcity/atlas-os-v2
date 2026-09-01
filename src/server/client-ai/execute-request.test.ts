import assert from "node:assert/strict";
import test from "node:test";
import {
  IntegrationConfigurationError,
  IntegrationRequestError,
} from "../integrations/errors.ts";
import { AI_NOT_ENABLED_MESSAGE } from "../integrations/openai-gateway.ts";
import {
  atlasAskUsageFromCounts,
} from "../../lib/lions-den/atlas-quota.ts";
import { ATLAS_OFF_TOPIC_REPLY } from "../../lib/lions-den/atlas-job-scope.ts";
import {
  ATLAS_INCOMPLETE_RESPONSE_MESSAGE,
  clientAiUserFacingError,
  createSubmitClientAiRequest,
  parseClientAiResponse,
  resolveClientAiDailyUsage,
  type ClientAiRequestDeps,
} from "./execute-request.ts";
import { initialClientAiActionState } from "./types.ts";
import type { ClientAiDailyUsage } from "./queries.ts";
import { MAX_OPENAI_OUTPUT_TOKENS } from "../integrations/openai-responses.ts";

const DEMO_ORG_ID = "org-afe-crm-demo";
const DEMO_ORG = {
  id: DEMO_ORG_ID,
  name: "AFE CRM Demo",
  slug: "afe-crm-demo",
};

const IN_SCOPE_FOLLOW_UP =
  "What follow-up is due for ABC Plumbing (DEMO) on this desk?";
const OFF_TOPIC_WEATHER = "What's the weather this weekend?";
const IN_SCOPE_COMPANIES =
  "Who are the DEMO companies on this desk: ABC Plumbing, 123 Catering, XYZ Electric?";

const DESK_ANSWER =
  "ABC Plumbing (DEMO) is due today. 123 Catering (DEMO) is tomorrow and XYZ Electric (DEMO) is later. Atlas has not contacted them.";

function emptyDashboard() {
  const missing = { data: null, setupRequired: true as const, error: "unavailable" };
  return {
    businessProfile: missing,
    pilot: missing,
    contentStudio: missing,
    opportunityPipeline: missing,
    activity: { data: [], setupRequired: true as const, error: "unavailable" },
    notes: { data: [], setupRequired: true as const, error: "unavailable" },
    aiRequests: { data: [], setupRequired: true as const, error: "unavailable" },
  };
}

function askForm(prompt: string, organizationId = DEMO_ORG_ID) {
  const form = new FormData();
  form.set("organizationId", organizationId);
  form.set("role", "atlas");
  form.set("scopeMode", "business_only");
  form.set("prompt", prompt);
  return form;
}

function createHarness(options: {
  used?: number;
  plan?: ClientAiDailyUsage["plan"];
  setupRequired?: boolean;
  isSuperAdmin?: boolean;
  memberships?: ClientAiRequestDeps["getUserMemberships"];
  generate?: ClientAiRequestDeps["generateStructuredText"];
  generateError?: unknown;
}) {
  let used = options.used ?? 0;
  let generateCalls = 0;
  let reserveCalls = 0;
  const tokenCaps: number[] = [];
  const plan = options.plan ?? "basic";

  const generate: ClientAiRequestDeps["generateStructuredText"] =
    options.generate ??
    (async (request) => {
      generateCalls += 1;
      tokenCaps.push(request.maxOutputTokens ?? -1);
      if (options.generateError) throw options.generateError;
      return {
        value: request.parse({
          answer: DESK_ANSWER,
          nextStep: "Work the next DEMO follow-up on this desk.",
          missingInputs: [],
        }),
        model: "gpt-5-mini",
        responseId: `resp_${generateCalls}`,
        usage: {
          inputTokens: 10,
          cachedInputTokens: 0,
          outputTokens: 20,
          reasoningTokens: 0,
          totalTokens: 30,
        },
      };
    });

  const deps: ClientAiRequestDeps = {
    requireUser: async () => ({ id: "founder", email: "founder@example.com" }),
    isSuperAdminEmail: () => options.isSuperAdmin ?? true,
    getUserMemberships:
      options.memberships ??
      (async () => ({ data: [], setupRequired: false, error: null })),
    getClientAiDailyUsage: async () => ({
      data: atlasAskUsageFromCounts(used, plan),
      setupRequired: options.setupRequired ?? false,
      error: options.setupRequired ? "missing rpc" : null,
    }),
    reserveClientAiQuestion: async () => {
      reserveCalls += 1;
      used += 1;
      return {
        error: null,
        allowed: true,
        usage: atlasAskUsageFromCounts(used, plan),
      };
    },
    generateStructuredText: generate,
    getClientDashboardData: async () => emptyDashboard(),
    loadRoleMarkdown: async () => "# Atlas\n",
    logClientAiRequest: async () => ({
      id: `req-${generateCalls + reserveCalls + 1}`,
      createdAt: "2026-09-01T00:00:00.000Z",
    }),
  };

  return {
    submit: createSubmitClientAiRequest(deps),
    stats: () => ({ used, generateCalls, reserveCalls, tokenCaps }),
  };
}

test("usage RPC setupRequired fail-opens to BASIC 0/5", () => {
  const usage = resolveClientAiDailyUsage({
    data: atlasAskUsageFromCounts(0, "basic"),
    setupRequired: true,
    error: "missing rpc",
  });
  assert.equal(usage.plan, "basic");
  assert.equal(usage.used, 0);
  assert.equal(usage.limit, 5);
});

test("IntegrationConfigurationError maps to AI is not enabled on this site", () => {
  assert.equal(
    clientAiUserFacingError(new IntegrationConfigurationError("openai", "OPENAI_API_KEY")),
    AI_NOT_ENABLED_MESSAGE,
  );
  assert.doesNotMatch(
    clientAiUserFacingError(new IntegrationConfigurationError("openai", "OPENAI_API_KEY")),
    /credits/i,
  );
  assert.match(
    clientAiUserFacingError(new IntegrationRequestError("openai", "provider_error")),
    /OpenAI request failed \(provider_error\)/,
  );
  assert.equal(
    clientAiUserFacingError(new IntegrationRequestError("openai", "incomplete_response")),
    ATLAS_INCOMPLETE_RESPONSE_MESSAGE,
  );
});

test("parseClientAiResponse requires a 20-character answer, nextStep, and missingInputs", () => {
  const value = parseClientAiResponse({
    answer: DESK_ANSWER,
    nextStep: "Call the salesman-owned DEMO follow-up.",
    missingInputs: [],
  });
  assert.ok(value.answer.length >= 20);
  assert.throws(() =>
    parseClientAiResponse({ answer: "too short", nextStep: "Next", missingInputs: [] }),
  );
});

test("founder DEMO desk asks: in-scope 0→1, off-topic stays 1, in-scope 1→2", async () => {
  const { submit, stats } = createHarness({ isSuperAdmin: true });

  const first = await submit(initialClientAiActionState, askForm(IN_SCOPE_FOLLOW_UP));
  assert.equal(first.status, "success");
  assert.equal(first.error, null);
  assert.match(String(first.answer), /ABC Plumbing \(DEMO\)/);
  assert.equal(first.dailyUsage?.used, 1);
  assert.equal(first.dailyUsage?.limit, 5);
  assert.equal(stats().generateCalls, 1);
  assert.equal(stats().reserveCalls, 1);
  assert.equal(stats().used, 1);
  assert.deepEqual(stats().tokenCaps, [MAX_OPENAI_OUTPUT_TOKENS]);

  const offTopic = await submit(initialClientAiActionState, askForm(OFF_TOPIC_WEATHER));
  assert.equal(offTopic.status, "blocked");
  assert.equal(offTopic.scopeStatus, "declined");
  assert.equal(offTopic.answer, ATLAS_OFF_TOPIC_REPLY);
  assert.equal(stats().generateCalls, 1);
  assert.equal(stats().reserveCalls, 1);
  assert.equal(stats().used, 1);

  const second = await submit(initialClientAiActionState, askForm(IN_SCOPE_COMPANIES));
  assert.equal(second.status, "success");
  assert.match(String(second.answer), /123 Catering \(DEMO\)/);
  assert.match(String(second.answer), /XYZ Electric \(DEMO\)/);
  assert.equal(second.dailyUsage?.used, 2);
  assert.equal(stats().generateCalls, 2);
  assert.equal(stats().reserveCalls, 2);
  assert.equal(stats().used, 2);
});

test("super-admin preview of afe-crm-demo does not need DEMO membership", async () => {
  const { submit, stats } = createHarness({
    isSuperAdmin: true,
    memberships: async () => ({ data: [], setupRequired: false, error: null }),
  });
  const result = await submit(initialClientAiActionState, askForm(IN_SCOPE_FOLLOW_UP));
  assert.equal(result.status, "success");
  assert.equal(stats().used, 1);
});

test("member-less non-admin cannot ask on DEMO", async () => {
  const { submit, stats } = createHarness({
    isSuperAdmin: false,
    memberships: async () => ({ data: [], setupRequired: false, error: null }),
  });
  const result = await submit(initialClientAiActionState, askForm(IN_SCOPE_FOLLOW_UP));
  assert.equal(result.status, "blocked");
  assert.match(String(result.error), /not assigned/);
  assert.equal(stats().generateCalls, 0);
  assert.equal(stats().used, 0);
});

test("missing usage RPC fail-opens and still lets an in-scope ask succeed", async () => {
  const { submit, stats } = createHarness({ setupRequired: true, isSuperAdmin: true });
  const result = await submit(initialClientAiActionState, askForm(IN_SCOPE_FOLLOW_UP));
  assert.equal(result.status, "success");
  assert.notEqual(result.error, "Workspace question usage could not be verified. Try again shortly.");
  assert.equal(result.dailyUsage?.used, 1);
  assert.equal(result.dailyUsage?.plan, "basic");
  assert.equal(stats().used, 1);
});

test("failed OpenAI calls do not burn a credit and surface the error", async () => {
  const { submit, stats } = createHarness({
    isSuperAdmin: true,
    generateError: new IntegrationRequestError("openai", "provider_error", {
      status: 401,
      retryable: false,
    }),
  });
  const result = await submit(initialClientAiActionState, askForm(IN_SCOPE_FOLLOW_UP));
  assert.equal(result.status, "failed");
  assert.equal(result.error, "OpenAI request failed (provider_error).");
  assert.equal(result.answer, result.error);
  assert.equal(result.dailyUsage?.used, 0);
  assert.equal(stats().reserveCalls, 0);
  assert.equal(stats().used, 0);
});

test("incomplete_response does not burn a credit and asks for a shorter desk question", async () => {
  const { submit, stats } = createHarness({
    isSuperAdmin: true,
    generateError: new IntegrationRequestError("openai", "incomplete_response"),
  });
  const result = await submit(initialClientAiActionState, askForm(IN_SCOPE_FOLLOW_UP));
  assert.equal(result.status, "failed");
  assert.equal(result.error, ATLAS_INCOMPLETE_RESPONSE_MESSAGE);
  assert.equal(result.answer, ATLAS_INCOMPLETE_RESPONSE_MESSAGE);
  assert.doesNotMatch(String(result.error), /incomplete_response/);
  assert.equal(result.dailyUsage?.used, 0);
  assert.equal(stats().reserveCalls, 0);
  assert.equal(stats().used, 0);
  assert.deepEqual(stats().tokenCaps, [MAX_OPENAI_OUTPUT_TOKENS]);
});

test("AI not enabled is a visible error and does not count", async () => {
  const { submit, stats } = createHarness({
    isSuperAdmin: true,
    generateError: new IntegrationConfigurationError("openai", "OPENAI_API_KEY"),
  });
  const result = await submit(initialClientAiActionState, askForm(IN_SCOPE_FOLLOW_UP));
  assert.equal(result.status, "blocked");
  assert.equal(result.error, AI_NOT_ENABLED_MESSAGE);
  assert.equal(result.answer, AI_NOT_ENABLED_MESSAGE);
  assert.equal(stats().used, 0);
});

test("BASIC hard-stops at 5/5 without calling the gateway", async () => {
  const { submit, stats } = createHarness({ used: 5, plan: "basic", isSuperAdmin: true });
  const result = await submit(initialClientAiActionState, askForm(IN_SCOPE_FOLLOW_UP));
  assert.equal(result.status, "blocked");
  assert.match(String(result.error), /5\/5/);
  assert.equal(stats().generateCalls, 0);
  assert.equal(stats().reserveCalls, 0);
});

test("GROW hard-stops at 10/10", async () => {
  const { submit, stats } = createHarness({ used: 10, plan: "grow", isSuperAdmin: true });
  const result = await submit(initialClientAiActionState, askForm(IN_SCOPE_FOLLOW_UP));
  assert.equal(result.status, "blocked");
  assert.match(String(result.error), /10\/10/);
  assert.equal(stats().generateCalls, 0);
});

test("UNLIMITED never blocks a successful ask", async () => {
  const { submit, stats } = createHarness({ used: 40, plan: "unlimited", isSuperAdmin: true });
  const result = await submit(initialClientAiActionState, askForm(IN_SCOPE_FOLLOW_UP));
  assert.equal(result.status, "success");
  assert.equal(result.dailyUsage?.limit, null);
  assert.equal(result.dailyUsage?.used, 41);
  assert.equal(stats().used, 41);
});
