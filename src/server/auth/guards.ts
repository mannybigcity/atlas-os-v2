import type { User } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { isSuperAdminEmail } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

export async function getVerifiedUser() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return null;
  }

  return user;
}

export async function requireUser(nextPath: string): Promise<User> {
  const user = await getVerifiedUser();

  if (!user) {
    redirect(`/login?next=${encodeURIComponent(nextPath)}`);
  }

  return user;
}

export async function requireSuperAdmin(nextPath = "/lions-den") {
  const user = await requireUser(nextPath);

  if (!isSuperAdminEmail(user.email)) {
    redirect("/client?access=denied");
  }

  return user;
}
