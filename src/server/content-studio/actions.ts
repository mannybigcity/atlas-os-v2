"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { isAfeCrmDemoOrganization } from "@/lib/client-portal/identity";
import {
  composeMicahWeekBuildPrompt,
  defaultMicahBrandKit,
  normalizeBrandColor,
  parseMicahDayBriefs,
  parsePlainBrandText,
  parseSocialHandle,
  MICAH_GOLD,
  MICAH_NAVY,
  type MicahBrandKit,
} from "@/lib/lions-den/micah-starter-week";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/server/auth/guards";
import { readMicahBrandKit, writeMicahBrandKit } from "./brand.ts";
import { isMicahDemeanor, resolveMicahDemeanor } from "./gallery-art.ts";
import { createMicahGalleryDraft } from "./gallery-draft.ts";

function requiredText(formData: FormData, name: string) {
  return String(formData.get(name) ?? "").trim();
}

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

const MAX_LOGO_BYTES = 400_000;

async function requireMicahOperator(organizationId: string) {
  const user = await requireUser("/client/micah");
  if (!organizationId) {
    return { user, organization: null as { id: string; name: string; slug: string } | null };
  }
  const supabase = await createClient();
  const { data: organization } = await supabase
    .from("organizations")
    .select("id, name, slug")
    .eq("id", organizationId)
    .maybeSingle();
  return {
    user,
    organization: organization
      ? {
          id: String(organization.id),
          name: String(organization.name ?? ""),
          slug: String(organization.slug ?? ""),
        }
      : null,
  };
}

async function imageFromForm(
  formData: FormData,
  name: string,
  existing: string | null,
  label: string,
) {
  const file = formData.get(name);
  if (!(file instanceof File) || file.size === 0) return { image: existing, error: null };
  if (file.size > MAX_LOGO_BYTES) {
    return { image: existing, error: `${label} must be under 400 KB.` };
  }
  if (!/^image\/(png|jpeg|jpg|webp|svg\+xml)$/i.test(file.type)) {
    return {
      image: existing,
      error: `Upload a PNG, JPG, WEBP, or SVG for ${label.toLowerCase()}. MICAH will not redraw it.`,
    };
  }
  const bytes = Buffer.from(await file.arrayBuffer());
  return {
    image: `data:${file.type};base64,${bytes.toString("base64")}`,
    error: null,
  };
}

function kitFromForm(formData: FormData, existing: MicahBrandKit, demoDesk: boolean): MicahBrandKit {
  const parsed = resolveMicahDemeanor({
    prompt: requiredText(formData, "demeanor"),
    stored: existing.demeanor,
    demoDesk,
  });
  const navyGoldOk = formData.get("navyGoldOk") === "yes";
  const faithLanguage = !demoDesk && formData.get("faithLanguage") === "yes";
  return {
    demeanor: parsed.demeanor === "faith" && demoDesk ? null : parsed.demeanor,
    faithLanguage,
    businessName: parsePlainBrandText(formData.get("businessName"), 120),
    city: parsePlainBrandText(formData.get("city"), 80),
    audience: parsePlainBrandText(formData.get("audience"), 400),
    weeklyOffer: parsePlainBrandText(formData.get("weeklyOffer"), 240),
    navyGoldOk,
    primaryColor: navyGoldOk
      ? MICAH_NAVY
      : normalizeBrandColor(formData.get("primaryColor"), existing.primaryColor || MICAH_NAVY),
    secondaryColor: navyGoldOk
      ? MICAH_GOLD
      : normalizeBrandColor(formData.get("secondaryColor"), existing.secondaryColor || MICAH_GOLD),
    logoDataUri: existing.logoDataUri,
    brandPhotoDataUri: existing.brandPhotoDataUri,
    facebook: parseSocialHandle(formData.get("facebook")),
    instagram: parseSocialHandle(formData.get("instagram")),
    linkedin: parseSocialHandle(formData.get("linkedin")),
    tiktok: parseSocialHandle(formData.get("tiktok")),
    setupSaved: existing.setupSaved,
  };
}

async function saveDeskBrand(formData: FormData) {
  const organizationId = requiredText(formData, "organizationId");
  const { user, organization } = await requireMicahOperator(organizationId);
  if (!organizationId || !user) {
    return {
      status: "error" as const,
      error: "Select a workspace before saving brand setup.",
      message: null,
      kit: defaultMicahBrandKit(),
      userId: user?.id ?? "",
      demoDesk: false,
    };
  }
  const demoDesk = isAfeCrmDemoOrganization(organization);
  const existing = await readMicahBrandKit(organizationId);
  const uploaded = await imageFromForm(formData, "logo", existing.logoDataUri, "Logo");
  const brandPhoto = await imageFromForm(
    formData,
    "brandPhoto",
    existing.brandPhotoDataUri,
    "Brand photo",
  );
  if (uploaded.error || brandPhoto.error) {
    return {
      status: "error" as const,
      error: uploaded.error || brandPhoto.error,
      message: null,
      kit: existing,
      userId: user.id,
      demoDesk,
    };
  }
  const parsed = kitFromForm(formData, existing, demoDesk);
  const kit = {
    ...parsed,
    businessName: parsed.businessName || existing.businessName || organization?.name || "",
    city: parsed.city || existing.city,
    logoDataUri: uploaded.image,
    brandPhotoDataUri: brandPhoto.image,
  };
  const saved = await writeMicahBrandKit({
    organizationId,
    userId: user.id,
    kit,
  });
  return {
    status: saved.status,
    error: saved.status === "error" ? saved.message : null,
    message: saved.status === "success" ? saved.message : null,
    kit: saved.kit,
    userId: user.id,
    demoDesk,
  };
}

export async function reviewContentDraft(formData: FormData) {
  await requireUser("/client");
  const organizationId = requiredText(formData, "organizationId");
  const draftId = requiredText(formData, "draftId");
  const decision = requiredText(formData, "decision");
  const note = requiredText(formData, "note");

  if (
    !organizationId ||
    !draftId ||
    !["approved", "changes_requested"].includes(decision)
  ) {
    redirect("/client?content=review_error#content-studio");
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("submit_content_draft_review", {
    p_draft_id: draftId,
    p_organization_id: organizationId,
    p_decision: decision,
    p_note: note || null,
  });

  redirect(
    `/client/micah?content=${error ? "review_error" : "review_saved"}#content-studio`,
  );
}

export async function saveMicahBrandSetup(
  _previousState: MicahDeskActionState,
  formData: FormData,
): Promise<MicahDeskActionState> {
  const saved = await saveDeskBrand(formData);
  if (saved.status === "success") {
    revalidatePath("/client/micah");
  }
  return {
    status: saved.status,
    error: saved.error,
    message: saved.message,
  };
}

export async function buildMicahWeekFromDesk(
  _previousState: MicahDeskActionState,
  formData: FormData,
): Promise<MicahDeskActionState> {
  const saved = await saveDeskBrand(formData);
  if (saved.status === "error") {
    return { status: "error", error: saved.error, message: null };
  }

  const organizationId = requiredText(formData, "organizationId");
  const picked = saved.kit.demeanor;
  if (!isMicahDemeanor(picked) || picked === "faith") {
    return {
      status: "error",
      error: "Pick Motivational, Friendly/local, Comical, or Straight.",
      message: null,
    };
  }
  const demeanor =
    saved.kit.faithLanguage && !saved.demoDesk ? "faith" : picked;

  const focusDay = Number(formData.get("focusDay") ?? "");
  const resolvedFocus = Number.isInteger(focusDay) && focusDay >= 1 && focusDay <= 7 ? focusDay : null;
  const prompt = composeMicahWeekBuildPrompt({
    demeanor,
    briefs: parseMicahDayBriefs(formData),
    focusDay: resolvedFocus,
    kit: saved.kit,
    socials: saved.kit,
  });
  const draft = await createMicahGalleryDraft({
    organizationId,
    userId: saved.userId,
    prompt,
    demeanor,
    demoDesk: saved.demoDesk,
    primaryColor: saved.kit.primaryColor,
    secondaryColor: saved.kit.secondaryColor,
    logoDataUri: saved.kit.logoDataUri,
    focusDay: resolvedFocus,
  });

  if (draft.status !== "success") {
    return { status: "error", error: draft.message, message: null };
  }

  revalidatePath("/client/micah");
  revalidatePath("/client");
  return {
    status: "success",
    error: null,
    message: draft.message,
  };
}
