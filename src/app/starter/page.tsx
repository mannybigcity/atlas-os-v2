import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSiteLanguage } from "@/lib/site-language-server";
import { requireTrialUser } from "@/server/trials/guards";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const language = await getSiteLanguage();

  return {
    title: language === "es" ? "Espacio de trabajo inicial de Atlas | Atlas para emprendedores" : "Atlas Starter Workspace | Atlas For Entrepreneurs",
    robots: { index: false, follow: false },
  };
}

export default async function StarterWorkspacePage() {
  await requireTrialUser("/starter");
  redirect("/client");
}
