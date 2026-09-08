import { redirect } from "next/navigation";
import { requireUser } from "@/server/auth/guards";
import { getTrialProfile } from "@/server/trials/profile";

export async function requireTrialUser(nextPath: string) {
  const user = await requireUser(nextPath);
  const profile = await getTrialProfile(user.id);

  if (!profile) {
    redirect("/client?access=denied");
  }

  // A converted trial owns a real client organization now; the starter
  // workspace is no longer their home.
  if (profile.converted_organization_id) {
    redirect("/client?status=welcome");
  }

  if (new Date(profile.trial_ends_at).getTime() <= Date.now()) {
    redirect("/pricing?trial=expired");
  }

  return profile;
}
