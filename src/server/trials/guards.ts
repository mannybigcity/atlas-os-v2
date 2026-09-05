import { redirect } from "next/navigation";
import { requireUser } from "@/server/auth/guards";
import { shouldBlockExpiredTrial } from "@/server/stripe/billing-entitlement";
import { userHasActivePaidEntitlement } from "@/server/stripe/paid-entitlement-access";
import { getTrialProfile } from "@/server/trials/profile";

export async function requireTrialUser(nextPath: string) {
  const user = await requireUser(nextPath);
  const profile = await getTrialProfile(user.id);

  if (!profile) {
    redirect("/client?access=denied");
  }

  if (
    shouldBlockExpiredTrial({
      trialEndsAt: profile.trial_ends_at,
      hasActivePaidEntitlement: await userHasActivePaidEntitlement(user.id),
    })
  ) {
    redirect("/pricing?trial=expired");
  }

  return profile;
}
