import { persistMicahGalleryImage } from "@/server/content-studio/gallery-image-persist";
import { micahGalleryImageActionResult } from "@/server/content-studio/gallery-image";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const result = await persistMicahGalleryImage(formData);
    return Response.json(result, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    return Response.json(micahGalleryImageActionResult("failed"), {
      headers: { "Cache-Control": "no-store" },
    });
  }
}
