import Link from "next/link";
import { AtlasMfaEnrollment } from "@/components/atlas-mfa-enrollment";
import { requireUser } from "@/server/auth/guards";

export const dynamic = "force-dynamic";
export const metadata = { title: "Account Security | RamFam Atlas OS", robots: { index: false, follow: false } };

export default async function SecurityPage() {
  await requireUser("/security");
  return <main className="min-h-screen bg-slate-50 p-5 sm:p-8"><Link className="mx-auto mb-5 block max-w-xl text-sm font-semibold text-[#5672f0] hover:underline" href="/client">← Return to Atlas OS</Link><AtlasMfaEnrollment /></main>;
}
