import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

type SuccessAliasPageProps = {
  searchParams?: Promise<{
    session_id?: string;
  }>;
};

export default async function SuccessAliasPage({
  searchParams,
}: SuccessAliasPageProps) {
  const params = await searchParams;
  const sessionId = String(params?.session_id ?? "").trim();
  redirect(
    sessionId
      ? `/checkout/success?session_id=${encodeURIComponent(sessionId)}`
      : "/checkout/success",
  );
}
