import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AtlasHomepage } from "@/components/atlas-homepage";
import { getAtlasSprintPaymentLink } from "@/lib/payment-links";

export const metadata: Metadata = {
  title: "Atlas For Entrepreneurs | Find More Leads, Follow Up Faster, Close More Deals",
  description:
    "Atlas helps contractors and small business owners keep leads, follow-up, and open jobs organized so nothing slips through the cracks.",
  alternates: {
    canonical: "/",
  },
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    title: "Atlas For Entrepreneurs",
    description: "Find more leads, follow up faster, and close more deals.",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Atlas For Entrepreneurs",
    description: "Find more leads, follow up faster, and close more deals.",
  },
};

type HomePageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function Home({ searchParams }: HomePageProps) {
  const params = await searchParams;
  const type = typeof params?.type === "string" ? params.type : undefined;
  const tokenHash = typeof params?.token_hash === "string" ? params.token_hash : undefined;
  const code = typeof params?.code === "string" ? params.code : undefined;

  if (type === "recovery" && tokenHash) {
    redirect(`/auth/confirm?token_hash=${encodeURIComponent(tokenHash)}&type=recovery&next=/reset-password`);
  }

  if (type === "recovery" && code) {
    redirect(`/auth/callback?code=${encodeURIComponent(code)}&next=/reset-password`);
  }

  return (
    <AtlasHomepage sprintUrl={getAtlasSprintPaymentLink()} />
  );
}
