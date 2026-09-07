import { persistMicahGalleryCaption } from "@/server/content-studio/gallery-caption-persist";
import { micahGalleryCaptionActionResult } from "@/server/content-studio/gallery-caption-save";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function readCaptionRequest(request: Request) {
  const contentType = request.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
    return {
      organizationId: body?.organizationId,
      draftId: body?.draftId,
      caption: body?.caption,
    };
  }
  const formData = await request.formData();
  return {
    organizationId: formData.get("organizationId"),
    draftId: formData.get("draftId"),
    caption: formData.get("caption"),
  };
}

export async function POST(request: Request) {
  try {
    const result = await persistMicahGalleryCaption(await readCaptionRequest(request));
    return Response.json(result, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    return Response.json(micahGalleryCaptionActionResult("edit_failed"), {
      headers: { "Cache-Control": "no-store" },
    });
  }
}
