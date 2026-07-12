import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { confirmPasswordRecovery } from "@/server/auth/actions";

type ConfirmRecoveryPageProps = {
  searchParams?: Promise<{
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
  const isValidRequest =
    Boolean(params?.token_hash) && params?.type === "recovery";

  return (
    <>
      <SiteHeader active="login" />
      <main className="min-h-[calc(100vh-73px)] bg-slate-50 px-6 py-12">
        <section className="mx-auto max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-blue-700">
            Secure recovery
          </p>
          <h1 className="mt-4 text-4xl font-bold tracking-tight text-slate-950 sm:text-5xl">
            Continue your password reset.
          </h1>
          <p className="mt-5 text-lg leading-8 text-slate-600">
            Atlas waits for you to continue before using this one-time recovery
            link. This protects the link from automated email security checks.
          </p>

          <div className="mt-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            {isValidRequest ? (
              <form action={confirmPasswordRecovery}>
                <input
                  name="tokenHash"
                  type="hidden"
                  value={params?.token_hash}
                />
                <input name="type" type="hidden" value="recovery" />
                <input
                  name="next"
                  type="hidden"
                  value={params?.next ?? "/reset-password"}
                />
                <button
                  className="w-full rounded-xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
                  type="submit"
                >
                  Continue securely
                </button>
              </form>
            ) : (
              <div>
                <p className="text-sm leading-6 text-rose-900">
                  This recovery link is incomplete. Request a new password reset
                  email and use the newest link.
                </p>
                <Link
                  className="mt-5 inline-flex text-sm font-semibold text-slate-700 hover:text-slate-950"
                  href="/forgot-password"
                >
                  Request a new reset link
                </Link>
              </div>
            )}
          </div>
        </section>
      </main>
    </>
  );
}
