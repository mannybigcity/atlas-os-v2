import { redirect } from "next/navigation";
import { isSisOrganization } from "@/lib/client-portal/identity";
import { requireUser } from "@/server/auth/guards";
import { getUserMemberships } from "@/server/organizations/queries";
import { shouldBlockExpiredTrial } from "@/server/stripe/billing-entitlement";
import { userHasActivePaidEntitlement } from "@/server/stripe/paid-entitlement-access";
import { getTrialProfile } from "@/server/trials/profile";

export async function requireTrialUser(nextPath: string) {
  const user = await requireUser(nextPath);
  const profile = await getTrialProfile(user.id);

  if (!profile) {
    redirect("/client?access=denied");
  }

  const memberships = await getUserMemberships(user.id);
  const sisOrganization =
    memberships.data.find((membership) => isSisOrganization(membership.organization))
      ?.organization ?? null;

  if (
    shouldBlockExpiredTrial({
      trialEndsAt: profile.trial_ends_at,
      hasActivePaidEntitlement: await userHasActivePaidEntitlement(user.id),
      organization: sisOrganization,
    })
  ) {
    redirect("/pricing?trial=expired");
  }

  return profile;
}
