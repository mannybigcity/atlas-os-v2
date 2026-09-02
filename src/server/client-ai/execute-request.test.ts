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
  runHunterChatSearch?: ClientAiRequestDeps["runHunterChatSearch"];
  createMicahGalleryDraft?: ClientAiRequestDeps["createMicahGalleryDraft"];
  readMicahDemeanor?: ClientAiRequestDeps["readMicahDemeanor"];
  getOrganizationIdentity?: ClientAiRequestDeps["getOrganizationIdentity"];
}) {
  let used = options.used ?? 0;
  let generateCalls = 0;
  let reserveCalls = 0;
  const tokenCaps: number[] = [];
  const schemaNames: string[] = [];
  const markdownRoles: string[] = [];
  const plan = options.plan ?? "basic";

  const generate: ClientAiRequestDeps["generateStructuredText"] =
    options.generate ??
    (async (request) => {
      generateCalls += 1;
      tokenCaps.push(request.maxOutputTokens ?? -1);
      schemaNames.push(request.schemaName);
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
    loadRoleMarkdown: async (role) => {
      markdownRoles.push(role);
      return `# ${role}\n`;
    },
    logClientAiRequest: async () => ({
      id: `req-${generateCalls + reserveCalls + 1}`,
      createdAt: "2026-09-01T00:00:00.000Z",
    }),
    runHunterChatSearch: options.runHunterChatSearch,
    createMicahGalleryDraft: options.createMicahGalleryDraft,
    readMicahDemeanor: options.readMicahDemeanor,
    getOrganizationIdentity: options.getOrganizationIdentity,
  };

  return {
    submit: createSubmitClientAiRequest(deps),
    stats: () => ({ used, generateCalls, reserveCalls, tokenCaps, schemaNames, markdownRoles }),
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
  assert.equal(first.routedTo, "david");
  assert.match(String(first.answer), /Handed to DAVID/);
  assert.match(String(first.answer), /ABC Plumbing \(DEMO\)/);
  assert.doesNotMatch(String(first.answer), /belongs with the coordinator/);
  assert.deepEqual(stats().markdownRoles, ["david"]);
  assert.deepEqual(stats().schemaNames, ["client_david_response"]);
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
  const result = await submit(initialClientAiActionState, askForm(IN_SCOPE_COMPANIES));
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
  const result = await submit(initialClientAiActionState, askForm(IN_SCOPE_COMPANIES));
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

test("DAVID CRM asks invoke the david role from workspace context, not a coordinator bounce", async () => {
  const { submit, stats } = createHarness({ isSuperAdmin: true });
  const result = await submit(
    initialClientAiActionState,
    askForm("How is client satisfaction and the next step to a sale on this pipeline?"),
  );
  assert.equal(result.status, "success");
  assert.equal(result.routedTo, "david");
  assert.deepEqual(stats().markdownRoles, ["david"]);
  assert.deepEqual(stats().schemaNames, ["client_david_response"]);
  assert.match(String(result.answer), /Handed to DAVID/);
  assert.doesNotMatch(String(result.answer), /belongs with the coordinator|Switch to the coordinator/);
});

test("DAVID still answers from workspace context if the model call fails", async () => {
  const { submit, stats } = createHarness({
    isSuperAdmin: true,
    generateError: new IntegrationRequestError("openai", "incomplete_response"),
  });
  const result = await submit(initialClientAiActionState, askForm(IN_SCOPE_FOLLOW_UP));
  assert.equal(result.status, "success");
  assert.equal(result.routedTo, "david");
  assert.match(String(result.answer), /Handed to DAVID/);
  assert.match(String(result.answer), /did not invent contacts|no open pipeline/i);
  assert.equal(stats().used, 1);
});

test("MICAH asks for a week voice once when demeanor is unset", async () => {
  let drafted = 0;
  const { submit, stats } = createHarness({
    isSuperAdmin: true,
    generateError: new IntegrationRequestError("openai", "output_validation_failed"),
    createMicahGalleryDraft: async () => {
      drafted += 1;
      return {
        status: "success",
        draftId: "draft-1",
        draftIds: ["draft-1"],
        title: "Day 1",
        headline: "Labor Day",
        caption: "Draft only.",
        count: 7,
        message: "saved a 7-day week pack",
      };
    },
  });
  const result = await submit(
    initialClientAiActionState,
    askForm("Make a Facebook post and a flyer image for Labor Day"),
  );
  assert.equal(result.status, "blocked");
  assert.equal(result.scopeStatus, "needs_input");
  assert.equal(result.routedTo, "micah");
  assert.equal(drafted, 0);
  assert.equal(stats().generateCalls, 0);
  assert.equal(stats().used, 0);
  assert.match(String(result.answer), /Pick a voice/);
  assert.match(String(result.answer), /Handed to MICAH/);
  assert.doesNotMatch(String(result.answer), /Faith is not used on the DEMO desk/);
});

test("one MICAH action saves a 7-day week pack after Friendly/local is chosen", async () => {
  const drafts: Array<{ demeanor: string; demoDesk?: boolean; prompt: string }> = [];
  const { submit, stats } = createHarness({
    isSuperAdmin: true,
    generateError: new IntegrationRequestError("openai", "output_validation_failed"),
    createMicahGalleryDraft: async (input) => {
      drafts.push({
        demeanor: input.demeanor,
        demoDesk: input.demoDesk,
        prompt: input.prompt,
      });
      return {
        status: "success",
        draftId: "draft-1",
        draftIds: ["d1", "d2", "d3", "d4", "d5", "d6", "d7"],
        title: "Day 1 · Monday · Labor Day",
        headline: "Labor Day",
        caption: "Draft only. Download this file and post it yourself.",
        count: 7,
        message:
          "MICAH saved a 7-day week pack in the gallery (7 downloadable cards). Nothing was posted to Facebook or Instagram. Open MICAH to copy captions and download the files.",
      };
    },
  });
  const result = await submit(
    initialClientAiActionState,
    askForm("Make a week of Facebook posts and flyer images for Labor Day. Friendly/local."),
  );
  assert.equal(result.status, "success");
  assert.equal(result.routedTo, "micah");
  assert.equal(result.error, null);
  assert.equal(drafts.length, 1);
  assert.equal(drafts[0]?.demeanor, "friendly_local");
  assert.equal(stats().generateCalls, 0);
  assert.match(String(result.answer), /7-day week pack|copy captions/i);
  assert.match(String(result.answer), /Handed to MICAH/);
  assert.match(String(result.nextStep), /copy a caption/i);
  assert.doesNotMatch(String(result.answer), /output_validation_failed/);
  assert.equal(stats().used, 1);
});

test("stored MICAH demeanor is reused and Faith is never defaulted on the DEMO desk", async () => {
  const drafts: string[] = [];
  const { submit, stats } = createHarness({
    isSuperAdmin: true,
    getOrganizationIdentity: async () => DEMO_ORG,
    readMicahDemeanor: async () => "straight",
    createMicahGalleryDraft: async (input) => {
      drafts.push(input.demeanor);
      assert.equal(input.demoDesk, true);
      return {
        status: "success",
        draftId: "draft-1",
        draftIds: ["d1", "d2", "d3", "d4", "d5", "d6", "d7"],
        title: "Week pack",
        headline: "This week",
        caption: "DEMO draft. Download this file and post it yourself.",
        count: 7,
        message:
          "MICAH saved a 7-day week pack in the gallery (7 downloadable cards). Nothing was posted to Facebook or Instagram.",
      };
    },
  });
  const result = await submit(
    initialClientAiActionState,
    askForm("Make a Facebook post and a flyer image for Labor Day"),
  );
  assert.equal(result.status, "success");
  assert.deepEqual(drafts, ["straight"]);
  assert.equal(stats().generateCalls, 0);
  assert.doesNotMatch(String(result.answer), /\bFaith\b/);
});

test("DEMO desk never stores Faith even if the prompt asks for it", async () => {
  let drafted = 0;
  const { submit, stats } = createHarness({
    isSuperAdmin: true,
    getOrganizationIdentity: async () => DEMO_ORG,
    createMicahGalleryDraft: async () => {
      drafted += 1;
      return {
        status: "success",
        draftId: "draft-1",
        title: "Week pack",
        headline: "This week",
        caption: "Draft only.",
        message: "saved",
      };
    },
  });
  const result = await submit(
    initialClientAiActionState,
    askForm("Make a week of posts. Faith."),
  );
  assert.equal(result.status, "blocked");
  assert.equal(result.scopeStatus, "needs_input");
  assert.equal(drafted, 0);
  assert.equal(stats().generateCalls, 0);
  assert.match(String(result.answer), /Faith is not used on the DEMO desk/);
});

test("MICAH flyer asks do not fall through to OpenAI when the gallery save fails", async () => {
  const { submit, stats } = createHarness({
    isSuperAdmin: true,
    generateError: new IntegrationRequestError("openai", "output_validation_failed"),
    readMicahDemeanor: async () => "motivational",
    createMicahGalleryDraft: async () => ({
      status: "error",
      draftId: null,
      draftIds: [],
      title: "MICAH draft: Labor Day",
      headline: "Labor Day",
      caption: "Draft only.",
      count: 0,
      message: "MICAH could not save the draft to the gallery. Try again from Talk to Atlas.",
    }),
  });
  const result = await submit(
    initialClientAiActionState,
    askForm("Make a Facebook post and a flyer image for Labor Day"),
  );
  assert.equal(result.status, "failed");
  assert.equal(result.routedTo, "micah");
  assert.equal(stats().generateCalls, 0);
  assert.equal(stats().used, 0);
  assert.match(String(result.answer), /could not save the draft/);
  assert.doesNotMatch(String(result.answer), /output_validation_failed/);
  assert.equal(result.error, null);
});

test("Atlas chat box routes a local-business find to HUNTER review pile, not outreach", async () => {
  let searched = 0;
  const { submit, stats } = createHarness({
    isSuperAdmin: true,
    runHunterChatSearch: async () => {
      searched += 1;
      return {
        status: "success",
        message:
          "2 Google Maps results. 2 listings saved to the REVIEW PILE. They are not Prospects until you accept them. Atlas will not email, call, or text anyone.",
        query: "plumbers in Houston, TX",
        persistedCount: 2,
        places: [
          {
            placeId: "p1",
            name: "Houston Pipe Co",
            formattedAddress: "Houston, TX",
            googleMapsUrl: "https://maps.google.com/?cid=1",
            websiteUrl: null,
            primaryType: "plumber",
            businessStatus: "OPERATIONAL",
          },
          {
            placeId: "p2",
            name: "Bayou Plumbing",
            formattedAddress: "Houston, TX",
            googleMapsUrl: "https://maps.google.com/?cid=2",
            websiteUrl: null,
            primaryType: "plumber",
            businessStatus: "OPERATIONAL",
          },
        ],
      };
    },
  });
  const result = await submit(
    initialClientAiActionState,
    askForm("Find plumbers in Houston, TX"),
  );
  assert.equal(result.status, "success");
  assert.equal(result.routedTo, "hunter");
  assert.equal(searched, 1);
  assert.equal(stats().generateCalls, 0);
  assert.match(String(result.answer), /REVIEW PILE/);
  assert.match(String(result.answer), /Handed to HUNTER/);
  assert.match(String(result.answer), /Houston Pipe Co/);
  assert.doesNotMatch(String(result.answer), /emailed|called these businesses/i);
  assert.equal(stats().used, 1);
});

test("HUNTER chat search without a market asks for ZIP or city and does not count", async () => {
  const { submit, stats } = createHarness({
    isSuperAdmin: true,
    runHunterChatSearch: async () => ({
      status: "needs_input",
      message: "Enter a business type plus a ZIP code or city/state.",
    }),
  });
  const result = await submit(initialClientAiActionState, askForm("Find local businesses for HUNTER"));
  assert.equal(result.status, "blocked");
  assert.equal(result.scopeStatus, "needs_input");
  assert.equal(stats().used, 0);
  assert.equal(stats().generateCalls, 0);
});

