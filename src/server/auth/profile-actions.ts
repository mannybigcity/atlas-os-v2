"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/server/auth/guards";

export async function saveDisplayName(formData: FormData) {
  await requireUser("/client");
  const displayName = String(formData.get("displayName") ?? "").trim();

  if (displayName.length < 2 || displayName.length > 80) {
    redirect("/client?identity=invalid");
  }

  if (displayName.toLowerCase() === "atlas admin") {
    redirect("/client?identity=reserved");
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({
    data: { display_name: displayName },
  });

  if (error) {
    redirect("/client?identity=error");
  }

  redirect("/client?identity=saved");
}

