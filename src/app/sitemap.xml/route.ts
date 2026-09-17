import { buildPublicSitemapXml } from "@/lib/public-marketing-site";

/** Metadata `app/sitemap.ts` 500s on Netlify when the root layout reads cookies(). */
export const dynamic = "force-static";

export function GET() {
  return new Response(buildPublicSitemapXml(), {
    status: 200,
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=0, must-revalidate",
    },
  });
}
