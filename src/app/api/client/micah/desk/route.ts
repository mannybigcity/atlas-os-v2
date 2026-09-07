import { persistMicahDesk } from "@/server/content-studio/desk-persist";
import { micahDeskActionResult } from "@/server/content-studio/desk-save";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function readDeskRequest(request: Request) {
  const contentType = request.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
    const formData = new FormData();
    if (body && typeof body === "object") {
      for (const [key, value] of Object.entries(body)) {
        if (value == null) continue;
        if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
          formData.set(key, String(value));
        }
      }
    }
    return formData;
  }
  return request.formData();
}

export async function POST(request: Request) {
  try {
    const result = await persistMicahDesk(await readDeskRequest(request));
    return Response.json(result, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    return Response.json(micahDeskActionResult("failed"), {
      headers: { "Cache-Control": "no-store" },
    });
  }
}
