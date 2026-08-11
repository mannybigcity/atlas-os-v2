import type { Metadata } from "next";
import { SiteHeader } from "@/components/site-header";
import { AtlasPreviewJourney } from "@/components/atlas-preview-journey";

export const metadata: Metadata = {
  title: "Atlas Preview | Atlas",
  description:
    "A guided preview of the Atlas operating experience before the client workspace.",
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
