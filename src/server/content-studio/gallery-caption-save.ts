import { isSisOrganization } from "../../lib/client-portal/identity.ts";
import { safeRedirectPath } from "../../lib/paths.ts";
import { isMicahBrandDraft } from "../../lib/lions-den/micah-starter-week.ts";
import { buildMicahGalleryCaptionUpdate } from "./gallery-art.ts";

const WORKSPACE_SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/i;

export type MicahGalleryCaptionSavePlan =
  | {
      ok: true;
      patch: NonNullable<ReturnType<typeof buildMicahGalleryCaptionUpdate>>;
    }
  | {
      ok: false;
      reason: "sis_blocked" | "edit_invalid" | "edit_missing";
    };

export function rethrowNextControlFlow(error: unknown) {
  if (!error || typeof error !== "object") return;
  const digest = "digest" in error ? String((error as { digest?: unknown }).digest ?? "") : "";
  if (digest.startsWith("NEXT_")) {
    throw error;
  }
}

export type MicahGalleryCaptionWriter = (input: {
  organizationId: string;
  draftId: string;
  caption: string;
  status: string;
  metadata: Record<string, unknown>;
}) => Promise<{ caption?: string | null; error?: string | null }>;

export function micahGalleryCaptionReturnTo(input: {
  previewOrg?: string | null;
  workspace?: string | null;
}) {
  const next = new URLSearchParams();
  const previewOrg = String(input.previewOrg ?? "").trim();
  const workspace = String(input.workspace ?? "").trim();
  if (
    previewOrg &&
    WORKSPACE_SLUG.test(previewOrg) &&
    !/^afe-crm-demo$/i.test(previewOrg)
  ) {
    next.set("previewOrg", previewOrg);
  }
  if (workspace && WORKSPACE_SLUG.test(workspace)) {
    next.set("workspace", workspace);
  }
  const query = next.toString();
  return query ? `/client/micah?${query}` : "/client/micah";
}

export function micahGalleryCaptionReturnPath(
  formData: Pick<FormData, "get">,
  status: string,
) {
  const requested = String(formData.get("returnTo") ?? "").trim();
  const [pathname, query = ""] = requested.split("?");
  const safePath = pathname ? safeRedirectPath(pathname) : "/client/micah";
  const destination =
    safePath === "/client/micah" || safePath.startsWith("/client/micah")
      ? safePath.split("?")[0]
      : "/client/micah";
  const params = new URLSearchParams(query);
  const next = new URLSearchParams();
  const previewOrg = params.get("previewOrg");
  const workspace = params.get("workspace");
  if (
    previewOrg &&
    WORKSPACE_SLUG.test(previewOrg) &&
    !/^afe-crm-demo$/i.test(previewOrg)
  ) {
    next.set("previewOrg", previewOrg);
  }
  if (workspace && WORKSPACE_SLUG.test(workspace)) {
    next.set("workspace", workspace);
  }
  next.set("content", status);
  return `${destination}?${next.toString()}`;
}

export function planMicahGalleryCaptionSave(input: {
  organization?: { name?: string | null; slug?: string | null } | null;
  draft?: { metadata?: Record<string, unknown> | null; status?: string | null } | null;
  loadError?: boolean;
  caption: unknown;
  editedAt?: string;
}): MicahGalleryCaptionSavePlan {
  if (!input.organization) return { ok: false, reason: "edit_invalid" };
  if (isSisOrganization(input.organization)) return { ok: false, reason: "sis_blocked" };
  const metadata = (input.draft?.metadata ?? {}) as Record<string, unknown>;
  if (input.loadError || !input.draft || isMicahBrandDraft(metadata)) {
    return { ok: false, reason: "edit_missing" };
  }
  const patch = buildMicahGalleryCaptionUpdate({
    metadata,
    caption: input.caption,
    status: input.draft.status,
    editedAt: input.editedAt,
  });
  if (!patch) return { ok: false, reason: "edit_invalid" };
  return { ok: true, patch };
}

export function micahGalleryCaptionActionResult(
  reason:
    | "edited"
    | "sis_blocked"
    | "edit_invalid"
    | "edit_missing"
    | "edit_failed"
    | "edit_unavailable"
    | "signed_out",
) {
  if (reason === "edited") {
    return {
      status: "success" as const,
      error: null,
      message: "Caption saved in this gallery. Copy/Download only. Nothing was posted.",
    };
  }
  const errors = {
    sis_blocked: "This gallery cannot be edited on that workspace.",
    edit_invalid: "That caption could not be saved. Keep hook, payoff, and one CTA.",
    edit_missing: "MICAH could not find that day-card.",
    edit_failed: "Caption was not saved. Try again from this page. Nothing was posted.",
    edit_unavailable:
      "Caption was not saved. The server write key is missing, so this gallery cannot store edits yet. Nothing was posted.",
    signed_out: "Sign in to save a caption in this gallery.",
  };
  return {
    status: "error" as const,
    error: errors[reason],
    message: null,
  };
}

export async function writeMicahGalleryCaptionRow(
  writers: MicahGalleryCaptionWriter[],
  input: {
    organizationId: string;
    draftId: string;
    caption: string;
    status: string;
    metadata: Record<string, unknown>;
  },
  options?: { rethrowControlFlow?: boolean },
) {
  for (const write of writers) {
    try {
      const result = await write(input);
      const written = String(result.caption ?? "").trim();
      if (!result.error && written === input.caption) {
        return true;
      }
      if (!result.error && written.length >= 10) {
        return true;
      }
    } catch (error) {
      if (options?.rethrowControlFlow !== false) {
        rethrowNextControlFlow(error);
      }
    }
  }
  return false;
}
