import { type NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { getSupabaseEnv, isSuperAdminEmail } from "@/lib/env";
import {
  SITE_LANGUAGE_COOKIE,
  SITE_LANGUAGE_MAX_AGE,
} from "@/lib/site-language";

const protectedRoutes = ["/client", "/clients", "/lions-den", "/security"];
const privateAtlasHosts = new Set(["app.ramfamatlas.com"]);

function isProtectedPath(pathname: string) {
  return protectedRoutes.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );
}

function redirectToLogin(request: NextRequest) {
  const url = request.nextUrl.clone();
  url.pathname = "/login";
  url.searchParams.set("next", request.nextUrl.pathname);
  return NextResponse.redirect(url);
}

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({
    request,
  });

  const lang = request.nextUrl.searchParams.get("lang");
  if (lang === "en" || lang === "es") {
    request.cookies.set(SITE_LANGUAGE_COOKIE, lang);
    response = NextResponse.next({ request });
    response.cookies.set(SITE_LANGUAGE_COOKIE, lang, {
      maxAge: SITE_LANGUAGE_MAX_AGE,
      path: "/",
      sameSite: "lax",
    });
  }

  const pathname = request.nextUrl.pathname;

  if (privateAtlasHosts.has(request.nextUrl.hostname) && pathname === "/") {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (!isProtectedPath(pathname)) {
    return response;
  }

  let supabase;

  try {
    const { supabaseUrl, supabaseAnonKey } = getSupabaseEnv();

    supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet, headers) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));

          response = NextResponse.next({
            request,
          });

          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });

          Object.entries(headers).forEach(([key, value]) => {
            response.headers.set(key, value);
          });
        },
      },
    });
  } catch {
    return redirectToLogin(request);
  }

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return redirectToLogin(request);
  }

  if (pathname.startsWith("/lions-den") && !isSuperAdminEmail(user.email)) {
    const url = request.nextUrl.clone();
    url.pathname = "/clients";
    url.searchParams.set("access", "denied");
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: ["/", "/client/:path*", "/clients/:path*", "/lions-den/:path*", "/security/:path*"],
};
