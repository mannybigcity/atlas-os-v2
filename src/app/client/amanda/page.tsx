import type { Metadata } from "next";
import { FollowUpDeskScreen } from "@/components/lions-den/follow-up-desk-screen";
import { getSiteLanguage } from "@/lib/site-language-server";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const language = await getSiteLanguage();
  return {
    title: language === "es" ? "AMANDA | The Lion’s Den" : "AMANDA | The Lion’s Den",
    robots: { index: false, follow: false },
  };
}

type AmandaPageProps = {
  searchParams?: Promise<{
    lang?: string;
    previewOrg?: string;
    workspace?: string;
    followup?: string;
  }>;
};

export default async function AmandaPage({ searchParams }: AmandaPageProps) {
  const params = await searchParams;
  return (
    <FollowUpDeskScreen
      board="amanda"
      searchParams={params}
      workspacePath="/client/amanda"
    />
  );
}
