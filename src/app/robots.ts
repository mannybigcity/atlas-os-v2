import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/auth/",
        "/client",
        "/client/",
        "/forgot-password",
        "/homepage-v2",
        "/homepage-v2/",
        "/lions-den",
        "/lions-den/",
        "/login",
        "/reset-password",
        "/set-password",
      ],
    },
    sitemap: "https://atlasforentrepreneurs.com/sitemap.xml",
  };
}
