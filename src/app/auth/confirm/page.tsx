import Link from "next/link";
import { PrivateAtlasAuthHeader } from "@/components/private-atlas-auth-header";
import { confirmAuthLink } from "@/server/auth/actions";

type ConfirmRecoveryPageProps = {
  searchParams?: Promise<{
    code?: string;
    token_hash?: string;
    type?: string;
    next?: string;
  }>;
};

export const metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

export default async function ConfirmRecoveryPage({
  searchParams,
}: ConfirmRecoveryPageProps) {
  const params = await searchParams;
  const isInvite = params?.type === "invite" || params?.next === "/set-password";
  const isRecovery = params?.type === "recovery" || Boolean(params?.code);
  const isValidRequest =
    Boolean(params?.code || params?.token_hash) && (isInvite || isRecovery);
  const nextPath = isInvite ? "/set-password" : "/reset-password";

  return (
    <>
      <PrivateAtlasAuthHeader />
      <main className="min-h-[calc(100vh-73px)] bg-slate-50 px-6 py-12">
        <section className="mx-auto max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-blue-700">
            {isInvite ? "Client invitation" : "Secure recovery"}
          </p>
          <h1 className="mt-4 text-4xl font-bold tracking-tight text-slate-950 sm:text-5xl">
            {isInvite
              ? "Welcome to your Atlas workspace."
              : "Continue your password reset."}
          </h1>
          <p className="mt-5 text-lg leading-8 text-slate-600">
            {isInvite
              ? "Continue to create your own password and open your private client workspace. Atlas never sends passwords by email."
              : "Atlas waits for you to continue before using this one-time recovery link. This protects the link from automated email security checks."}
          </p>

          <div className="mt-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            {isValidRequest ? (
              <form action={confirmAuthLink}>
                <input
                  name="code"
                  type="hidden"
                  value={params?.code}
                />
                <input
                  name="tokenHash"
                  type="hidden"
                  value={params?.token_hash}
                />
                <input
                  name="type"
                  type="hidden"
                  value={isInvite ? "invite" : "recovery"}
                />
                <input
                  name="next"
                  type="hidden"
                  value={params?.next ?? nextPath}
                />
                <button
                  className="w-full rounded-xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
                  type="submit"
                >
                  {isInvite ? "Accept invitation" : "Continue securely"}
                </button>
              </form>
            ) : (
              <div>
                <p className="text-sm leading-6 text-rose-900">
                  This link is incomplete or expired. Ask Atlas for a new
                  invitation, or request a new password reset email if you
                  already have an account.
                </p>
                <Link
                  className="mt-5 inline-flex text-sm font-semibold text-slate-700 hover:text-slate-950"
                  href={isInvite ? "/login" : "/forgot-password"}
                >
                  {isInvite ? "Go to client login" : "Request a new reset link"}
                </Link>
              </div>
            )}
          </div>
        </section>
      </main>
    </>
  );
}
