import type { MetadataRoute } from "next";

const siteUrl = "https://www.siscustomcreations.com";

const sisPages = [
  "/sis-ai-design-studio",
  "/custom-apparel",
  "/fresh-apparel-design",
  "/diy-kits",
  "/diy-subscriptions",
  "/paint-parties",
  "/splatter-paint-parties",
  "/group-events",
  "/business-and-bulk-orders",
  "/pricing",
  "/gallery",
  "/our-story",
  "/contact",
  "/faq",
  "/cart",
  "/checkout",
  "/customer-account",
  "/order-tracking",
] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: siteUrl, changeFrequency: "weekly", priority: 1 },
    ...sisPages.map((page) => ({
      url: `${siteUrl}${page}`,
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),
    {
      url: `${siteUrl}/privacy`,
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${siteUrl}/terms`,
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${siteUrl}/accessibility`,
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${siteUrl}/responsible-ai`,
      changeFrequency: "monthly",
      priority: 0.4,
    },
  ];
}
