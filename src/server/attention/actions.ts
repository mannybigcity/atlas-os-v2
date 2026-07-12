"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireSuperAdmin } from "@/server/auth/guards";

function requestIdFrom(formData: FormData) {
  return String(formData.get("requestId") ?? "").trim();
}

export async function acknowledgeAttentionRequest(formData: FormData) {
  const user = await requireSuperAdmin();
  const requestId = requestIdFrom(formData);

  if (!requestId) {
    redirect("/lions-den?attention=error");
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("attention_requests")
    .update({
      status: "acknowledged",
      acknowledged_at: new Date().toISOString(),
      acknowledged_by: user.id,
    })
    .eq("id", requestId)
    .eq("status", "open");

  if (error) {
    redirect("/lions-den?attention=error");
  }

  redirect("/lions-den?attention=acknowledged");
}

export async function resolveAttentionRequest(formData: FormData) {
  await requireSuperAdmin();
  const requestId = requestIdFrom(formData);

  if (!requestId) {
    redirect("/lions-den?attention=error");
  }

  const supabase = await createClient();
  const { data: request, error: requestError } = await supabase
    .from("attention_requests")
    .select("note_id")
    .eq("id", requestId)
    .in("status", ["open", "acknowledged"])
    .maybeSingle();

  if (requestError || !request) {
    redirect("/lions-den?attention=error");
  }

  const { error } = await supabase
    .from("organization_notes")
    .update({ attention_requested: false })
    .eq("id", request.note_id);

  if (error) {
    redirect("/lions-den?attention=error");
  }

  redirect("/lions-den?attention=resolved");
}

