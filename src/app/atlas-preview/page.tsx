import type { Metadata } from "next";
import { SiteHeader } from "@/components/site-header";
import { AtlasPreviewJourney } from "@/components/atlas-preview-journey";

export const metadata: Metadata = {
  title: "See How Atlas Helps | Atlas",
  description:
    "See how Atlas helps you turn daily business activity into clear priorities, stronger follow-up, and measurable growth.",
};

export default function AtlasPreviewPage() {
  return (
    <>
      <SiteHeader active="home" />
      <main className="bg-[#f6f9ff] text-[#071b42]">
        <AtlasPreviewJourney />
      </main>
    </>
  );
}
