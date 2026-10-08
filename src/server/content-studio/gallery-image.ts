import { CRM_FILE_MAX_BYTES, CRM_FILES_BUCKET } from "../../lib/lions-den/crm-record-files.ts";

/** Private object prefix stored in organization_content_drafts.image_url. Not a public URL. */
export const MICAH_GALLERY_IMAGE_BUCKET = CRM_FILES_BUCKET;
export const MICAH_GALLERY_IMAGE_MAX_BYTES = CRM_FILE_MAX_BYTES;
export const MICAH_GALLERY_IMAGE_URL_TTL_SECONDS = 60 * 60;

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const STORED_PATH_PATTERN =
  /^crm-files\/([0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})\/micah\/([0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})\.(png|jpg|jpeg)$/i;

export type MicahGalleryImageExtension = "png" | "jpg" | "jpeg";

export type MicahGalleryImageActionResult = {
  status: "success" | "error";
  error: string | null;
  message: string | null;
};

export type MicahGalleryImageActor = "allow" | "signed_out" | "forbidden";

export function micahGalleryImageActorDecision(input: {
  signedIn: boolean;
  isSuperAdmin: boolean;
}): MicahGalleryImageActor {
  if (!input.signedIn) return "signed_out";
  if (!input.isSuperAdmin) return "forbidden";
  return "allow";
}

export function micahGalleryImageActionResult(
  reason:
    | "saved"
    | "removed"
    | "signed_out"
    | "forbidden"
    | "invalid"
    | "missing"
    | "invalid_file"
    | "failed",
): MicahGalleryImageActionResult {
  if (reason === "saved") {
    return {
      status: "success",
      error: null,
      message: "Image saved on this card. Copy/Download only. Nothing was posted.",
    };
  }
  if (reason === "removed") {
    return {
      status: "success",
      error: null,
      message: "Image removed from this card. The text card is back. Nothing was posted.",
    };
  }
  const errors = {
    signed_out: "Sign in to change a card image.",
    forbidden: "Only an Atlas admin can change the card image. Nothing was posted.",
    invalid: "That card image could not be changed. Nothing was posted.",
    missing: "MICAH could not find that day-card.",
    invalid_file: "Use a PNG or JPEG up to 10 MB. Nothing was posted.",
    failed: "Image was not saved. Try again from this page. Nothing was posted.",
  };
  return { status: "error", error: errors[reason], message: null };
}

export function micahGalleryImageDownloadName(input: {
  day: number;
  weekday: string;
  extension: string;
}) {
  const day = Number.isInteger(input.day) && input.day > 0 ? input.day : 1;
  const weekday = input.weekday.toLowerCase().replace(/[^a-z]/g, "") || "day";
  const extension = normalizeMicahGalleryImageExtension(input.extension) ?? "png";
  return `micah-day-${day}-${weekday}.${extension}`;
}

export function micahGalleryImageStoredPath(input: {
  organizationId: string;
  draftId: string;
  extension: MicahGalleryImageExtension;
}) {
  return `${MICAH_GALLERY_IMAGE_BUCKET}/${input.organizationId.toLowerCase()}/micah/${input.draftId.toLowerCase()}.${input.extension}`;
}

export type MicahGalleryImageSource =
  | { kind: "none" }
  | { kind: "https"; href: string; downloadName: string }
  | {
      kind: "storage";
      bucket: typeof MICAH_GALLERY_IMAGE_BUCKET;
      objectPath: string;
      downloadName: string;
      expiresIn: number;
    };

/**
 * Turn a stored image_url into either an https URL or a private storage object.
 * Storage paths stay private; callers sign them as the signed-in user.
 */
export function resolveMicahGalleryImageSource(input: {
  imageUrl: string | null | undefined;
  organizationId: string;
  draftId: string | null;
  day: number;
  weekday: string;
}): MicahGalleryImageSource {
  const raw = String(input.imageUrl ?? "").trim();
  if (!raw) return { kind: "none" };

  if (isFullHttpsUrl(raw)) {
    return {
      kind: "https",
      href: raw,
      downloadName: micahGalleryImageDownloadName({
        day: input.day,
        weekday: input.weekday,
        extension: extensionFromHttpsUrl(raw) ?? "png",
      }),
    };
  }

  const match = raw.match(STORED_PATH_PATTERN);
  if (!match) return { kind: "none" };
  const organizationId = match[1].toLowerCase();
  const draftId = match[2].toLowerCase();
  const extension = match[3].toLowerCase() as MicahGalleryImageExtension;
  if (!input.draftId || organizationId !== input.organizationId.toLowerCase()) {
    return { kind: "none" };
  }
  if (draftId !== input.draftId.toLowerCase()) return { kind: "none" };
  if (MICAH_GALLERY_IMAGE_BUCKET !== "crm-files") return { kind: "none" };

  return {
    kind: "storage",
    bucket: MICAH_GALLERY_IMAGE_BUCKET,
    objectPath: `${organizationId}/micah/${draftId}.${extension}`,
    downloadName: micahGalleryImageDownloadName({
      day: input.day,
      weekday: input.weekday,
      extension,
    }),
    expiresIn: MICAH_GALLERY_IMAGE_URL_TTL_SECONDS,
  };
}

export function micahGalleryUploadFile(file: {
  name: string;
  type?: string;
  size: number;
} | null):
  | { ok: true; extension: MicahGalleryImageExtension; contentType: "image/png" | "image/jpeg" }
  | { ok: false } {
  if (!file || !file.name.trim() || file.size <= 0 || file.size > MICAH_GALLERY_IMAGE_MAX_BYTES) {
    return { ok: false };
  }
  const extension = extensionFromFileName(file.name);
  if (!extension) return { ok: false };
  const type = String(file.type ?? "").trim().toLowerCase();
  const allowedTypes =
    extension === "png"
      ? new Set(["", "image/png", "application/octet-stream"])
      : new Set(["", "image/jpeg", "image/jpg", "application/octet-stream"]);
  if (!allowedTypes.has(type)) return { ok: false };
  return {
    ok: true,
    extension,
    contentType: extension === "png" ? "image/png" : "image/jpeg",
  };
}

export function micahGalleryImageBytesMatch(
  bytes: Uint8Array,
  extension: MicahGalleryImageExtension,
) {
  if (extension === "png") {
    return (
      bytes.length >= 8 &&
      bytes[0] === 0x89 &&
      bytes[1] === 0x50 &&
      bytes[2] === 0x4e &&
      bytes[3] === 0x47 &&
      bytes[4] === 0x0d &&
      bytes[5] === 0x0a &&
      bytes[6] === 0x1a &&
      bytes[7] === 0x0a
    );
  }
  return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
}

export type MicahGalleryImagePlan =
  | { ok: false; reason: "signed_out" | "forbidden" | "invalid" | "missing" | "invalid_file" }
  | {
      ok: true;
      intent: "upload";
      objectPath: string;
      storedPath: string;
      contentType: "image/png" | "image/jpeg";
      extension: MicahGalleryImageExtension;
      previousObjectPath: string | null;
    }
  | {
      ok: true;
      intent: "remove";
      previousObjectPath: string | null;
    };

export function planMicahGalleryImageChange(input: {
  signedIn: boolean;
  isSuperAdmin: boolean;
  intent: string;
  organizationId: string;
  draftId: string;
  draftFound: boolean;
  currentImageUrl: string | null;
  file: { name: string; type?: string; size: number } | null;
}): MicahGalleryImagePlan {
  const actor = micahGalleryImageActorDecision({
    signedIn: input.signedIn,
    isSuperAdmin: input.isSuperAdmin,
  });
  if (actor !== "allow") return { ok: false, reason: actor };
  if (!UUID_PATTERN.test(input.organizationId) || !UUID_PATTERN.test(input.draftId)) {
    return { ok: false, reason: "invalid" };
  }
  if (input.intent !== "upload" && input.intent !== "remove") {
    return { ok: false, reason: "invalid" };
  }
  if (!input.draftFound) return { ok: false, reason: "missing" };

  const current = resolveMicahGalleryImageSource({
    imageUrl: input.currentImageUrl,
    organizationId: input.organizationId,
    draftId: input.draftId,
    day: 1,
    weekday: "day",
  });
  const previousObjectPath = current.kind === "storage" ? current.objectPath : null;

  if (input.intent === "remove") {
    return { ok: true, intent: "remove", previousObjectPath };
  }

  const file = micahGalleryUploadFile(input.file);
  if (!file.ok) return { ok: false, reason: "invalid_file" };
  const storedPath = micahGalleryImageStoredPath({
    organizationId: input.organizationId,
    draftId: input.draftId,
    extension: file.extension,
  });
  const objectPath = `${input.organizationId.toLowerCase()}/micah/${input.draftId.toLowerCase()}.${file.extension}`;
  return {
    ok: true,
    intent: "upload",
    objectPath,
    storedPath,
    contentType: file.contentType,
    extension: file.extension,
    previousObjectPath,
  };
}

export async function applyMicahGalleryImageChange(input: {
  signedIn: boolean;
  isSuperAdmin: boolean;
  intent: string;
  organizationId: string;
  draftId: string;
  file: { name: string; type?: string; size: number; bytes?: Uint8Array } | null;
  loadDraft: () => Promise<{ imageUrl: string | null } | null>;
  upload: (
    objectPath: string,
    bytes: Uint8Array,
    contentType: string,
  ) => Promise<{ error: string | null }>;
  remove: (objectPath: string) => Promise<{ error: string | null }>;
  saveImageUrl: (imageUrl: string | null) => Promise<{ error: string | null }>;
}): Promise<MicahGalleryImageActionResult> {
  const actor = micahGalleryImageActorDecision({
    signedIn: input.signedIn,
    isSuperAdmin: input.isSuperAdmin,
  });
  if (actor !== "allow") return micahGalleryImageActionResult(actor);

  const draft = await input.loadDraft();
  const planned = planMicahGalleryImageChange({
    signedIn: true,
    isSuperAdmin: true,
    intent: input.intent,
    organizationId: input.organizationId,
    draftId: input.draftId,
    draftFound: Boolean(draft),
    currentImageUrl: draft?.imageUrl ?? null,
    file: input.file,
  });
  if (!planned.ok) return micahGalleryImageActionResult(planned.reason);

  if (planned.intent === "upload") {
    const bytes = input.file?.bytes;
    if (!bytes || !micahGalleryImageBytesMatch(bytes, planned.extension)) {
      return micahGalleryImageActionResult("invalid_file");
    }
    const uploaded = await input.upload(planned.objectPath, bytes, planned.contentType);
    if (uploaded.error) return micahGalleryImageActionResult("failed");
    const saved = await input.saveImageUrl(planned.storedPath);
    if (saved.error) {
      if (planned.previousObjectPath !== planned.objectPath) {
        await input.remove(planned.objectPath);
      }
      return micahGalleryImageActionResult("failed");
    }
    if (planned.previousObjectPath && planned.previousObjectPath !== planned.objectPath) {
      await input.remove(planned.previousObjectPath);
    }
    return micahGalleryImageActionResult("saved");
  }

  if (planned.previousObjectPath) {
    await input.remove(planned.previousObjectPath);
  }
  const saved = await input.saveImageUrl(null);
  if (saved.error) return micahGalleryImageActionResult("failed");
  return micahGalleryImageActionResult("removed");
}

function normalizeMicahGalleryImageExtension(value: string): MicahGalleryImageExtension | null {
  const extension = value.toLowerCase().replace(/^\./, "");
  if (extension === "png" || extension === "jpg" || extension === "jpeg") return extension;
  return null;
}

function extensionFromFileName(name: string) {
  const match = name.toLowerCase().match(/\.([a-z0-9]+)$/);
  return normalizeMicahGalleryImageExtension(match?.[1] ?? "");
}

function extensionFromHttpsUrl(href: string) {
  try {
    const match = new URL(href).pathname.toLowerCase().match(/\.([a-z0-9]+)$/);
    return normalizeMicahGalleryImageExtension(match?.[1] ?? "");
  } catch {
    return null;
  }
}

function isFullHttpsUrl(value: string) {
  if (!/^https:\/\//i.test(value)) return false;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password && url.hostname.includes(".");
  } catch {
    return false;
  }
}
