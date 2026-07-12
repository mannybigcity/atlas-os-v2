import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { requestPasswordReset } from "@/server/auth/actions";

type ForgotPasswordPageProps = {
  searchParams?: Promise<{
    error?: string;
    status?: string;
  }>;
};

const errorMessages: Record<string, string> = {
  missing_email: "Enter the email address for the account.",
  session_expired: "The reset session expired. Request a new reset link.",
};

export default async function ForgotPasswordPage({
  searchParams,
}: ForgotPasswordPageProps) {
  const params = await searchParams;
  const error = params?.error ? errorMessages[params.error] : null;

  return (
    <>
      <SiteHeader active="login" />
      <main className="min-h-[calc(100vh-73px)] bg-slate-50 px-6 py-12">
        <section className="mx-auto max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-blue-700">
            Account recovery
          </p>
          <h1 className="mt-4 text-4xl font-bold tracking-tight text-slate-950 sm:text-5xl">
            Reset your Atlas password.
          </h1>
          <p className="mt-5 text-lg leading-8 text-slate-600">
            Enter your email address and Atlas will send a Supabase recovery
            link. The link opens a secure page where you can set a new password.
          </p>

          <div className="mt-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            {params?.status === "sent" ? (
              <div className="mb-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm leading-6 text-emerald-900">
                If an Atlas account exists for that email, a password reset link
                has been sent.
              </div>
            ) : null}

            {error ? (
              <div className="mb-5 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900">
                {error}
              </div>
            ) : null}

            <form action={requestPasswordReset} className="space-y-5">
              <div>
                <label className="text-sm font-medium text-slate-700" htmlFor="email">
                  Email
                </label>
                <input
                  autoComplete="email"
                  className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-950 outline-none transition focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
                  id="email"
                  name="email"
                  placeholder="name@example.com"
                  required
                  type="email"
                />
              </div>

              <button
                className="w-full rounded-xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
                type="submit"
              >
                Send reset link
              </button>
            </form>

            <Link
              className="mt-5 inline-flex text-sm font-semibold text-slate-700 hover:text-slate-950"
              href="/login"
            >
              Back to login
            </Link>
          </div>
        </section>
      </main>
    </>
  );
}
