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
    edit_failed: "MICAH could not save that caption. Try again from this page.",
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
) {
  for (const write of writers) {
    try {
      const result = await write(input);
      if (!result.error && result.caption === input.caption) {
        return true;
      }
    } catch {
      // Session writes are blocked by RLS for trial owners. Try the next writer.
    }
  }
  return false;
}
