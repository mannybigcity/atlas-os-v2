import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/client/", "/lions-den/", "/homepage-v2/"],
    },
    sitemap: "https://atlasforentrepreneurs.com/sitemap.xml",
  };
}
