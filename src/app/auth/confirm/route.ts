import { type NextRequest, NextResponse } from "next/server";
import { safeRedirectPath } from "@/lib/paths";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const tokenHash = request.nextUrl.searchParams.get("token_hash");
  const type = request.nextUrl.searchParams.get("type");
  const nextPath = safeRedirectPath(request.nextUrl.searchParams.get("next"));

  if (tokenHash && type === "recovery") {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: "recovery",
    });

    if (!error) {
      return NextResponse.redirect(new URL(nextPath, request.url));
    }
  }

  return NextResponse.redirect(
    new URL("/login?error=auth_callback_failed", request.url),
  );
}
