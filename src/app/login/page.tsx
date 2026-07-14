import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { signInWithPassword } from "@/server/auth/actions";

type LoginPageProps = {
  searchParams?: Promise<{
    error?: string;
    next?: string;
    status?: string;
  }>;
};

const errorMessages: Record<string, string> = {
  auth_callback_failed:
    "That secure email link could not be verified. Request a new invitation or password-reset email.",
  invitation_expired:
    "That invitation is no longer valid. Ask Atlas to send a new invitation.",
  invalid_credentials: "The email or password was not accepted.",
  missing_auth_code:
    "That secure email link was incomplete. Request a new invitation or password-reset email.",
  missing_credentials: "Enter both an email and password.",
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const nextPath = params?.next ?? "";
  const error = params?.error ? errorMessages[params.error] : null;

  return (
    <>
      <SiteHeader active="login" />
      <main className="min-h-[calc(100vh-73px)] bg-slate-50 px-6 py-12">
        <section className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[1fr_420px] lg:items-center">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-blue-700">
              Secure access
            </p>
            <h1 className="mt-4 max-w-3xl text-4xl font-bold tracking-tight text-slate-950 sm:text-5xl">
              Secure login for Atlas clients and Super Admin users.
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-600">
              Atlas now uses Supabase Email and Password authentication. Access
              to protected routes is enforced server-side.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                className="rounded-full border border-slate-300 px-5 py-3 text-center text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-white"
                href="/"
              >
                Back to public site
              </Link>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <form action={signInWithPassword} className="space-y-5">
              <input name="next" type="hidden" value={nextPath} />

              {error ? (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900">
                  {error}
                </div>
              ) : null}

              {params?.status === "password_updated" ? (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm leading-6 text-emerald-900">
                  Password updated. Sign in with your new password.
                </div>
              ) : null}

              {params?.status === "invitation_complete" ? (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm leading-6 text-emerald-900">
                  Your Atlas account is ready. Sign in with your email and the
                  password you created.
                </div>
              ) : null}

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

              <div>
                <label className="text-sm font-medium text-slate-700" htmlFor="password">
                  Password
                </label>
                <input
                  autoComplete="current-password"
                  className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-950 outline-none transition focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
                  id="password"
                  name="password"
                  placeholder="Password"
                  required
                  type="password"
                />
              </div>

              <button
                className="w-full rounded-xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
                type="submit"
              >
                Sign in
              </button>

              <div className="flex flex-col gap-2 text-sm leading-6 text-slate-500">
                <Link
                  className="font-semibold text-slate-700 hover:text-slate-950"
                  href="/forgot-password"
                >
                  Forgot your password?
                </Link>
                <p>
                  Magic links and public signup flows are intentionally not
                  enabled.
                </p>
              </div>
            </form>
          </div>
        </section>
      </main>
    </>
  );
}
