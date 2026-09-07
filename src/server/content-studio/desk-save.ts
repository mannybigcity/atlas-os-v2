export type MicahDeskActionState = {
  status: "idle" | "success" | "error";
  error: string | null;
  message: string | null;
};

export const initialMicahDeskActionState: MicahDeskActionState = {
  status: "idle",
  error: null,
  message: null,
};

export type MicahDeskIntent = "save" | "build";

export function readMicahDeskIntent(input: FormData | { intent?: unknown }): MicahDeskIntent {
  const raw =
    typeof FormData !== "undefined" && input instanceof FormData
      ? input.get("intent")
      : (input as { intent?: unknown }).intent;
  return String(raw ?? "").trim() === "save" ? "save" : "build";
}

export function micahDeskActionResult(
  reason:
    | "signed_out"
    | "sis_blocked"
    | "invalid"
    | "no_voice"
    | "failed"
    | "saved"
    | "built",
  detail?: string | null,
): MicahDeskActionState {
  if (reason === "saved") {
    return {
      status: "success",
      error: null,
      message: detail || "Brand setup saved for this workspace. Nothing was posted.",
    };
  }
  if (reason === "built") {
    return {
      status: "success",
      error: null,
      message:
        detail ||
        "MICAH saved cards in the gallery. Copy/Download only. Nothing was posted.",
    };
  }
  const errors = {
    signed_out: "Sign in to save this desk. Nothing was posted.",
    sis_blocked: "This desk cannot be edited on that workspace.",
    invalid: "Select a workspace before saving brand setup.",
    no_voice: "Pick Motivational, Friendly/local, Comical, or Straight.",
    failed: "Desk was not saved. Stay on this page and try again. Nothing was posted.",
  };
  return {
    status: "error",
    error: detail || errors[reason],
    message: null,
  };
}
