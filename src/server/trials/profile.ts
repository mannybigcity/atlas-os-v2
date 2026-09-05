import { createServiceClient } from "@/lib/supabase/service";
import { extractTrialMetadata } from "@/server/trials/metadata";
import { ensureTrialWorkspace } from "@/server/trials/workspace";

export type TrialProfileInput = {
  fullName: string;
  businessName: string;
  email: string;
  phone: string;
  businessType: string;
  primaryGrowthGoal: string;
};

function clean(value: unknown, max: number) {
  return String(value ?? "").trim().slice(0, max);
}

export async function ensureTrialProfile(userId: string, metadata: Record<string, unknown>) {
  const extracted = extractTrialMetadata(metadata);
  const fullName = extracted.fullName;
  const businessName = extracted.businessName;
  const email = extracted.email;
  const phone = extracted.phone;
  const businessType = extracted.businessType;
  const primaryGrowthGoal = extracted.primaryGrowthGoal;

  if (!fullName || !businessName || !email || !phone || !businessType || !primaryGrowthGoal) {
    return { ok: false as const, error: "missing_profile" };
  }

  const service = createServiceClient();
  const { data: existing, error: lookupError } = await service
    .from("atlas_trial_profiles")
    .select("user_id")
    .eq("user_id", userId)
    .maybeSingle();

  if (lookupError) {
    console.error("Atlas trial profile lookup failed", { code: lookupError.code });
    return { ok: false as const, error: "lookup_failed" };
  }

  if (existing) {
    const workspace = await ensureTrialWorkspace({
      userId,
      businessName,
      email,
    });
    if (!workspace.ok) {
      return { ok: false as const, error: workspace.error };
    }
    return { ok: true as const, created: false as const };
  }

  const { error } = await service.from("atlas_trial_profiles").insert({
    user_id: userId,
    full_name: fullName,
    business_name: businessName,
    email,
    phone,
    business_type: businessType,
    primary_growth_goal: primaryGrowthGoal,
    terms_accepted_at: clean(metadata.terms_accepted_at, 80) || new Date().toISOString(),
    privacy_accepted_at: clean(metadata.privacy_accepted_at, 80) || new Date().toISOString(),
  });

  if (error) {
    console.error("Atlas trial profile creation failed", { code: error.code });
    return { ok: false as const, error: "create_failed" };
  }

  const workspace = await ensureTrialWorkspace({
    userId,
    businessName,
    email,
  });
  if (!workspace.ok) {
    return { ok: false as const, error: workspace.error };
  }

  return { ok: true as const, created: true as const };
}

export async function getTrialProfile(userId: string) {
  const service = createServiceClient();
  const { data, error } = await service
    .from("atlas_trial_profiles")
    .select("full_name,business_name,trial_started_at,trial_ends_at")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    console.error("Atlas trial profile read failed", { code: error.code });
    return null;
  }

  return data;
}
