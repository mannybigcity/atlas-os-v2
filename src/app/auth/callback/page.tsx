import type { Metadata } from "next";
import { PrivateAtlasAuthHeader } from "@/components/private-atlas-auth-header";
import { getSiteLanguage } from "@/lib/site-language-server";
import { RecoverySessionHandler } from "./recovery-session-handler";

export async function generateMetadata(): Promise<Metadata> {
  const language = await getSiteLanguage();

  return {
    title: language === "es" ? "Verificación segura de cuenta | Atlas para emprendedores" : "Secure Account Verification | Atlas For Entrepreneurs",
    robots: { index: false, follow: false },
  };
}

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
  const language = await getSiteLanguage();
  const copy = language === "es"
    ? {
        eyebrow: "Recuperación segura",
        title: "Verificando tu enlace de restablecimiento.",
        description: "Atlas está comprobando tu sesión segura de recuperación antes de enviarte a la página para restablecer la contraseña.",
      }
    : {
        eyebrow: "Secure recovery",
        title: "Verifying your reset link.",
        description: "Atlas is checking your secure recovery session before sending you to the password reset page.",
      };

  return (
    <>
      <PrivateAtlasAuthHeader />
      <main className="min-h-[calc(100vh-73px)] bg-slate-50 px-6 py-12">
        <section className="mx-auto max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-blue-700">
            {copy.eyebrow}
          </p>
          <h1 className="mt-4 text-4xl font-bold tracking-tight text-slate-950 sm:text-5xl">
            {copy.title}
          </h1>
          <p className="mt-5 text-lg leading-8 text-slate-600">
            {copy.description}
          </p>

          <div className="mt-8 rounded-3xl border border-slate-200 bg-white p-6 text-sm leading-6 text-slate-600 shadow-sm">
            <RecoverySessionHandler code={params?.code} language={language} nextPath={params?.next} />
          </div>
        </section>
      </main>
    </>
  );
}
