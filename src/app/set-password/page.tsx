import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { completeInvitation } from "@/server/auth/actions";

type SetPasswordPageProps = {
  searchParams?: Promise<{
    error?: string;
  }>;
};

const errorMessages: Record<string, string> = {
  missing_password: "Enter and confirm your password.",
  password_mismatch: "The password fields do not match.",
  update_failed: "Your password could not be saved. Ask Atlas for a new invitation.",
  weak_password:
    "Use at least 12 characters with a lowercase letter, uppercase letter, number, and symbol.",
};

export const metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

export default async function SetPasswordPage({
  searchParams,
}: SetPasswordPageProps) {
  const params = await searchParams;
  const error = params?.error ? errorMessages[params.error] : null;

  return (
    <>
      <SiteHeader active="login" />
      <main className="min-h-[calc(100vh-73px)] bg-slate-50 px-6 py-12">
        <section className="mx-auto max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-blue-700">
            Client setup
          </p>
          <h1 className="mt-4 text-4xl font-bold tracking-tight text-slate-950 sm:text-5xl">
            Create your Atlas password.
          </h1>
          <p className="mt-5 text-lg leading-8 text-slate-600">
            Your email address is your Atlas login. Create a password below,
            then Atlas will take you directly to your private workspace.
          </p>

          <div className="mt-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            {error ? (
              <div className="mb-5 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900">
                {error}
              </div>
            ) : null}

            <form action={completeInvitation} className="space-y-5">
              <div>
                <label
                  className="text-sm font-medium text-slate-700"
                  htmlFor="password"
                >
                  Create password
                </label>
                <input
                  aria-describedby="password-requirements"
                  autoComplete="new-password"
                  className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-950 outline-none transition focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
                  id="password"
                  minLength={12}
                  name="password"
                  placeholder="Create password"
                  required
                  type="password"
                />
                <p
                  className="mt-2 text-sm leading-6 text-slate-600"
                  id="password-requirements"
                >
                  At least 12 characters, including lowercase, uppercase, a
                  number, and a symbol.
                </p>
              </div>

              <div>
                <label
                  className="text-sm font-medium text-slate-700"
                  htmlFor="confirmPassword"
                >
                  Confirm password
                </label>
                <input
                  autoComplete="new-password"
                  className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-950 outline-none transition focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
                  id="confirmPassword"
                  minLength={12}
                  name="confirmPassword"
                  placeholder="Confirm password"
                  required
                  type="password"
                />
              </div>

              <button
                className="w-full rounded-xl bg-blue-700 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-800"
                type="submit"
              >
                Save password and open my workspace
              </button>
            </form>

            <Link
              className="mt-5 inline-flex text-sm font-semibold text-slate-700 hover:text-slate-950"
              href="/login"
            >
              Already created your password? Go to login
            </Link>
          </div>
        </section>
      </main>
    </>
  );
}
