export type AtlasAskPlan = "basic" | "grow" | "unlimited";

export const ATLAS_ASK_LIMITS: Record<AtlasAskPlan, number | null> = {
  basic: 5,
  grow: 10,
  unlimited: null,
};

export const ATLAS_ASK_PLAN_LABEL: Record<AtlasAskPlan, string> = {
  basic: "BASIC",
  grow: "GROW",
  unlimited: "UNLIMITED",
};

export function normalizeAtlasAskPlan(value: string | null | undefined): AtlasAskPlan {
  const plan = String(value ?? "").trim().toLowerCase();
  if (plan === "grow" || plan === "growth") return "grow";
  if (plan === "unlimited") return "unlimited";
  return "basic";
}

export function atlasAskLimit(plan: AtlasAskPlan) {
  return ATLAS_ASK_LIMITS[plan];
}

export function isAtlasAskCapped(used: number, plan: AtlasAskPlan) {
  const limit = atlasAskLimit(plan);
  return limit !== null && used >= limit;
}

export function atlasAskUsageLabel(used: number, plan: AtlasAskPlan) {
  const limit = atlasAskLimit(plan);
  const safeUsed = Math.max(0, used);
  if (limit === null) return String(safeUsed);
  return `${Math.min(safeUsed, limit)}/${limit}`;
}

export type AtlasAskCountReason = "success" | "off_topic" | "failed" | "blocked_action" | "capped";

export function shouldCountAtlasAsk(input: {
  status: "success" | "blocked" | "failed";
  scopeStatus?: "in_scope" | "needs_input" | "rerouted" | "declined" | null;
}): { counts: boolean; reason: AtlasAskCountReason } {
  if (input.status === "failed") {
    return { counts: false, reason: "failed" };
  }
  if (input.status === "blocked" && input.scopeStatus === "declined") {
    return { counts: false, reason: "off_topic" };
  }
  if (input.status === "blocked") {
    return { counts: false, reason: "blocked_action" };
  }
  return { counts: true, reason: "success" };
}

export function nextAtlasAskUsage(input: {
  used: number;
  plan: AtlasAskPlan | string | null | undefined;
  status: "success" | "blocked" | "failed";
  scopeStatus?: "in_scope" | "needs_input" | "rerouted" | "declined" | null;
}) {
  const plan = normalizeAtlasAskPlan(input.plan);
  const decision = shouldCountAtlasAsk(input);
  const used = decision.counts ? input.used + 1 : input.used;
  return {
    plan,
    used,
    limit: atlasAskLimit(plan),
    counted: decision.counts,
    reason: decision.reason,
    capped: isAtlasAskCapped(used, plan),
  };
}

export function atlasAskUsageFromCounts(used: number, plan: AtlasAskPlan | string | null | undefined) {
  const resolved = normalizeAtlasAskPlan(plan);
  const limit = atlasAskLimit(resolved);
  return {
    plan: resolved,
    planLabel: ATLAS_ASK_PLAN_LABEL[resolved],
    used: Math.max(0, used),
    limit,
    remaining: limit === null ? null : Math.max(0, limit - Math.max(0, used)),
  };
}
