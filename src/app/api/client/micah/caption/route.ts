import { persistMicahGalleryCaption } from "@/server/content-studio/gallery-caption-persist";
import { micahGalleryCaptionActionResult } from "@/server/content-studio/gallery-caption-save";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const result = await persistMicahGalleryCaption(formData);
    return Response.json(result, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    return Response.json(micahGalleryCaptionActionResult("edit_failed"), {
      headers: { "Cache-Control": "no-store" },
    });
  }
}
