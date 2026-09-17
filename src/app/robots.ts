import type { MetadataRoute } from "next";
import {
  PUBLIC_ROBOTS_DISALLOW,
  publicSitemapIndexUrl,
} from "@/lib/public-marketing-site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [...PUBLIC_ROBOTS_DISALLOW],
    },
    sitemap: publicSitemapIndexUrl(),
  };
}
