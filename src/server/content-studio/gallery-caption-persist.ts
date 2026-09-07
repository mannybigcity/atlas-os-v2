import { isSisOrganization } from "@/lib/client-portal/identity";
import { isSuperAdminEmail } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import {
  micahGalleryCaptionActionResult,
  planMicahGalleryCaptionSave,
  writeMicahGalleryCaptionRow,
  type MicahGalleryCaptionWriter,
} from "./gallery-caption-save.ts";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type MicahGalleryCaptionInput = {
  organizationId?: unknown;
  draftId?: unknown;
  caption?: unknown;
};

function readCaptionInput(input: FormData | MicahGalleryCaptionInput): MicahGalleryCaptionInput {
  if (typeof FormData !== "undefined" && input instanceof FormData) {
    return {
      organizationId: input.get("organizationId"),
      draftId: input.get("draftId"),
      caption: input.get("caption"),
    };
  }
  const fields = input as MicahGalleryCaptionInput;
  return {
    organizationId: fields.organizationId,
    draftId: fields.draftId,
    caption: fields.caption,
  };
}

function captionRpcWriter(
  client: Awaited<ReturnType<typeof createClient>> | ReturnType<typeof createAdminClient>,
): MicahGalleryCaptionWriter {
  return async (input) => {
    const { data, error } = await client.rpc("update_micah_gallery_caption", {
      p_draft_id: input.draftId,
      p_organization_id: input.organizationId,
      p_caption: input.caption,
    });
    return {
      caption: data == null ? null : String(data),
      error: error?.message ?? null,
    };
  };
}

function captionTableWriter(
  client: Awaited<ReturnType<typeof createClient>> | ReturnType<typeof createAdminClient>,
): MicahGalleryCaptionWriter {
  return async (input) => {
    const { data, error } = await client
      .from("organization_content_drafts")
      .update({
        caption: input.caption,
        status: input.status,
        metadata: input.metadata,
      })
      .eq("id", input.draftId)
      .eq("organization_id", input.organizationId)
      .select("caption")
      .maybeSingle();
    return {
      caption: data ? String((data as { caption?: string }).caption ?? "") : null,
      error: error?.message ?? (data ? null : "not_updated"),
    };
  };
}

export async function persistMicahGalleryCaption(input: FormData | MicahGalleryCaptionInput) {
  try {
    const fields = readCaptionInput(input);
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return logCaptionSave(micahGalleryCaptionActionResult("signed_out"), "none", false);
    }

    const organizationId = String(fields.organizationId ?? "").trim();
    const draftId = String(fields.draftId ?? "").trim();
    if (!uuidPattern.test(organizationId) || !uuidPattern.test(draftId)) {
      return logCaptionSave(micahGalleryCaptionActionResult("edit_invalid"), "none", false);
    }

    const { data: organizationRow } = await supabase
      .from("organizations")
      .select("id, name, slug")
      .eq("id", organizationId)
      .maybeSingle();
    const organization = organizationRow
      ? {
          id: String(organizationRow.id),
          name: String(organizationRow.name ?? ""),
          slug: String(organizationRow.slug ?? ""),
        }
      : null;
    if (!organization) {
      return logCaptionSave(micahGalleryCaptionActionResult("edit_invalid"), "none", false);
    }
    if (isSisOrganization(organization)) {
      return logCaptionSave(micahGalleryCaptionActionResult("sis_blocked"), "none", false);
    }

    const superAdmin = isSuperAdminEmail(user.email);
    let memberOk = superAdmin;
    if (!memberOk) {
      const { data: membership } = await supabase
        .from("organization_memberships")
        .select("id")
        .eq("organization_id", organizationId)
        .eq("user_id", user.id)
        .in("role", ["owner", "admin", "member"])
        .maybeSingle();
      memberOk = Boolean(membership);
    }

    const { data: draft, error: loadError } = await supabase
      .from("organization_content_drafts")
      .select("id, metadata, status")
      .eq("id", draftId)
      .eq("organization_id", organizationId)
      .maybeSingle();

    const planned = planMicahGalleryCaptionSave({
      organization,
      draft: draft as { metadata?: Record<string, unknown>; status?: string } | null,
      loadError: Boolean(loadError),
      caption: fields.caption,
    });
    if (!planned.ok) {
      return logCaptionSave(micahGalleryCaptionActionResult(planned.reason), "none", false);
    }

    const writers: MicahGalleryCaptionWriter[] = [
      captionRpcWriter(supabase),
      captionTableWriter(supabase),
    ];
    let adminWriterReady = false;
    if (memberOk) {
      try {
        const admin = createAdminClient();
        writers.push(captionRpcWriter(admin));
        writers.push(captionTableWriter(admin));
        adminWriterReady = true;
      } catch {
        // Service-role is optional when the membership RPC can write.
      }
    }

    const saved = await writeMicahGalleryCaptionRow(
      writers,
      {
        organizationId,
        draftId,
        caption: planned.patch.caption,
        status: planned.patch.status,
        metadata: planned.patch.metadata,
      },
      { rethrowControlFlow: false },
    );
    if (!saved) {
      return logCaptionSave(
        micahGalleryCaptionActionResult(adminWriterReady ? "edit_failed" : "edit_unavailable"),
        "none",
        adminWriterReady,
      );
    }

    return logCaptionSave(micahGalleryCaptionActionResult("edited"), "wrote", adminWriterReady);
  } catch (error) {
    const digest =
      error && typeof error === "object" && "digest" in error
        ? String((error as { digest?: unknown }).digest ?? "")
        : "";
    console.info(
      "[micah-gallery-caption]",
      JSON.stringify({
        status: "error",
        writer: "caught",
        digest: digest.slice(0, 48),
        admin: false,
      }),
    );
    return micahGalleryCaptionActionResult("edit_failed");
  }
}

function logCaptionSave(
  result: ReturnType<typeof micahGalleryCaptionActionResult>,
  writer: string,
  admin: boolean,
) {
  console.info(
    "[micah-gallery-caption]",
    JSON.stringify({
      status: result.status,
      writer,
      admin,
    }),
  );
  return result;
}
