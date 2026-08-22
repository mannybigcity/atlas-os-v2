import { redirect } from "next/navigation";
import { requireUser } from "@/server/auth/guards";
import { getTrialProfile } from "@/server/trials/profile";

export async function requireTrialUser(nextPath: string) {
  const user = await requireUser(nextPath);
  const profile = await getTrialProfile(user.id);

  if (!profile) {
    redirect("/client?access=denied");
  }

  if (new Date(profile.trial_ends_at).getTime() <= Date.now()) {
    redirect("/pricing?trial=expired");
  }

  return profile;
}
