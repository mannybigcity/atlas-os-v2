import { buildMicahBusinessCardsFromForm } from "@/server/content-studio/business-cards";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const result = await buildMicahBusinessCardsFromForm(formData);
    return Response.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json(
      {
        status: "intake",
        count: 0,
        message: "MICAH couldn't build cards just now. List your services and try again. Nothing was posted.",
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  }
}
