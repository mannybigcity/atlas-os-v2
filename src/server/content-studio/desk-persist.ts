import { isAfeCrmDemoOrganization, isSisOrganization } from "@/lib/client-portal/identity";
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
import { readMicahBrandKit, writeMicahBrandKit } from "./brand.ts";
import { isMicahDemeanor, resolveMicahDemeanor } from "./gallery-art.ts";
import { createMicahGalleryDraft } from "./gallery-draft.ts";
import {
  micahDeskActionResult,
  readMicahDeskIntent,
  type MicahDeskActionState,
  type MicahDeskIntent,
} from "./desk-save.ts";

const MAX_LOGO_BYTES = 400_000;
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function requiredText(formData: FormData, name: string) {
  return String(formData.get(name) ?? "").trim();
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

async function loadMicahDeskContext(organizationId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { user: null, organization: null as { id: string; name: string; slug: string } | null };
  }
  if (!uuidPattern.test(organizationId)) {
    return { user, organization: null };
  }
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

async function saveDeskBrand(formData: FormData) {
  const organizationId = requiredText(formData, "organizationId");
  const { user, organization } = await loadMicahDeskContext(organizationId);
  if (!user) {
    return {
      status: "error" as const,
      error: micahDeskActionResult("signed_out").error,
      message: null,
      kit: defaultMicahBrandKit(),
      userId: "",
      demoDesk: false,
    };
  }
  if (!organizationId || !organization) {
    return {
      status: "error" as const,
      error: micahDeskActionResult("invalid").error,
      message: null,
      kit: defaultMicahBrandKit(),
      userId: user.id,
      demoDesk: false,
    };
  }
  if (isSisOrganization(organization)) {
    return {
      status: "error" as const,
      error: micahDeskActionResult("sis_blocked").error,
      message: null,
      kit: defaultMicahBrandKit(),
      userId: user.id,
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
    businessName: parsed.businessName || existing.businessName || organization.name || "",
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

function logDeskPersist(result: MicahDeskActionState, intent: MicahDeskIntent) {
  console.info(
    "[micah-week-desk]",
    JSON.stringify({
      status: result.status,
      intent,
    }),
  );
  return result;
}

export async function persistMicahDesk(formData: FormData): Promise<MicahDeskActionState> {
  const intent = readMicahDeskIntent(formData);
  try {
    const saved = await saveDeskBrand(formData);
    if (saved.status === "error") {
      return logDeskPersist(
        { status: "error", error: saved.error, message: null },
        intent,
      );
    }
    if (intent === "save") {
      return logDeskPersist(micahDeskActionResult("saved", saved.message), intent);
    }

    const organizationId = requiredText(formData, "organizationId");
    const picked = saved.kit.demeanor;
    if (!isMicahDemeanor(picked) || picked === "faith") {
      return logDeskPersist(micahDeskActionResult("no_voice"), intent);
    }
    const demeanor = saved.kit.faithLanguage && !saved.demoDesk ? "faith" : picked;
    const focusDay = Number(formData.get("focusDay") ?? "");
    const resolvedFocus =
      Number.isInteger(focusDay) && focusDay >= 1 && focusDay <= 7 ? focusDay : null;
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
      return logDeskPersist(
        { status: "error", error: draft.message, message: null },
        intent,
      );
    }

    return logDeskPersist(micahDeskActionResult("built", draft.message), intent);
  } catch (error) {
    const digest =
      error && typeof error === "object" && "digest" in error
        ? String((error as { digest?: unknown }).digest ?? "")
        : "";
    console.info(
      "[micah-week-desk]",
      JSON.stringify({
        status: "error",
        intent,
        writer: "caught",
        digest: digest.slice(0, 48),
      }),
    );
    return micahDeskActionResult("failed");
  }
}
