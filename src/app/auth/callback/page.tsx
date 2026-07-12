import { SiteHeader } from "@/components/site-header";
import { RecoverySessionHandler } from "./recovery-session-handler";

type AuthCallbackPageProps = {
  searchParams?: Promise<{
    code?: string;
    next?: string;
  }>;
};

export default async function AuthCallbackPage({
  searchParams,
}: AuthCallbackPageProps) {
  const params = await searchParams;

  return (
    <>
      <SiteHeader active="login" />
      <main className="min-h-[calc(100vh-73px)] bg-slate-50 px-6 py-12">
        <section className="mx-auto max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-blue-700">
            Secure recovery
          </p>
          <h1 className="mt-4 text-4xl font-bold tracking-tight text-slate-950 sm:text-5xl">
            Verifying your reset link.
          </h1>
          <p className="mt-5 text-lg leading-8 text-slate-600">
            Atlas is checking the Supabase recovery session before sending you
            to the password reset page.
          </p>

          <div className="mt-8 rounded-3xl border border-slate-200 bg-white p-6 text-sm leading-6 text-slate-600 shadow-sm">
            <RecoverySessionHandler code={params?.code} nextPath={params?.next} />
          </div>
        </section>
      </main>
    </>
  );
}
