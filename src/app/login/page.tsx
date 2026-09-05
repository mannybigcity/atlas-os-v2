import Link from "next/link";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { PrivateAtlasAuthHeader } from "@/components/private-atlas-auth-header";
import { withSiteLanguage } from "@/lib/site-language";
import { getSiteLanguage } from "@/lib/site-language-server";
import { signInToSampleDesk, signInWithPassword } from "@/server/auth/actions";

export const runtime = "nodejs";

export async function generateMetadata(): Promise<Metadata> {
  const language = await getSiteLanguage();

  return {
    title: language === "es" ? "Acceso de clientes | Atlas para emprendedores" : "Client Login | Atlas For Entrepreneurs",
    description:
      language === "es"
        ? "Acceso seguro de clientes para Atlas para emprendedores."
        : "Secure client sign-in for Atlas For Entrepreneurs.",
    robots: { index: false, follow: false },
  };
}

type LoginPageProps = {
  searchParams?: Promise<{
    error?: string;
    next?: string;
    status?: string;
  }>;
};

function Alert({
  tone = "slate",
  children,
}: {
  tone?: "slate" | "amber" | "rose" | "emerald";
  children: ReactNode;
}) {
  const classes = {
    slate: "border-slate-200 bg-slate-50 text-slate-700",
    amber: "border-amber-200 bg-amber-50 text-amber-900",
    rose: "border-rose-200 bg-rose-50 text-rose-900",
    emerald: "border-emerald-200 bg-emerald-50 text-emerald-900",
  };

  return <div className={`rounded-2xl border p-4 text-sm leading-6 ${classes[tone]}`}>{children}</div>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const nextPath = params?.next ?? "/client";
  const language = await getSiteLanguage();
  const copy = language === "es"
    ? {
        title: "Accede a Atlas para emprendedores",
        description: "Usa tu correo y contraseña para acceder a tu espacio de trabajo seguro.",
        missingCredentials: "Ingresa tu correo y contraseña.",
        invalidCredentials: "No aceptamos esas credenciales.",
        callbackFailed: "No se pudo completar el enlace seguro de acceso.",
        passwordUpdated: "Contraseña actualizada. Vuelve a iniciar sesión para continuar.",
        checkoutReady: "Tu pago se recibió. Inicia sesión con el correo de la compra para abrir Lion’s Den.",
        email: "Correo electrónico",
        password: "Contraseña",
        signIn: "Iniciar sesión",
        showDesk: "Mostrar el escritorio",
        sampleDeskUnavailable: "El escritorio de muestra no está configurado todavía.",
        sampleDeskSignInFailed: "No se pudo abrir el escritorio de muestra. Inténtalo de nuevo o inicia sesión con el correo de muestra.",
        resetPassword: "Restablecer contraseña",
        createAccount: "Crea una cuenta / Comienza tu prueba gratis de 7 días",
        noCard: "No necesitas tarjeta.",
      }
    : {
        title: "Sign in to Atlas For Entrepreneurs",
        description: "Use your email and password to access your secure client workspace.",
        missingCredentials: "Enter both email and password.",
        invalidCredentials: "The credentials were not accepted.",
        callbackFailed: "The secure login link could not be completed.",
        passwordUpdated: "Password updated. Sign in again to continue.",
        checkoutReady: "Your payment was received. Sign in with the email you used at checkout to open Lion’s Den.",
        email: "Email",
        password: "Password",
        signIn: "Sign in",
        showDesk: "Show the desk",
        sampleDeskUnavailable: "The sample desk is not configured yet.",
        sampleDeskSignInFailed: "The sample desk could not be opened. Try again, or sign in with the sample email.",
        resetPassword: "Reset password",
        createAccount: "Create an account / Start 7-day free trial",
        noCard: "No card required.",
      };

  return (
    <main className="min-h-screen bg-[#fffdf8]">
      <PrivateAtlasAuthHeader />
      <section className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[1.02fr_.88fr] lg:px-8">
        <div className="rounded-[2rem] border border-[#dde5f0] bg-white p-6 shadow-[0_1.5rem_3.5rem_rgba(6,27,82,.08)] sm:p-8 lg:p-10">
          <h1 className="max-w-xl font-serif text-4xl font-black tracking-[-0.07em] text-[#06266d] sm:text-5xl">
            {copy.title}
          </h1>
          <p className="mt-4 max-w-xl text-base leading-7 text-slate-600">
            {copy.description}
          </p>
        </div>

        <div className="rounded-[2rem] border border-[#dfe5ef] bg-white p-6 shadow-[0_1.5rem_3.5rem_rgba(6,27,82,.08)] sm:p-8">
          {params?.error === "missing_credentials" ? (
            <Alert tone="rose">{copy.missingCredentials}</Alert>
          ) : null}
          {params?.error === "invalid_credentials" ? (
            <Alert tone="rose">{copy.invalidCredentials}</Alert>
          ) : null}
          {params?.error === "auth_callback_failed" ? (
            <Alert tone="rose">{copy.callbackFailed}</Alert>
          ) : null}
          {params?.status === "password_updated" ? (
            <Alert tone="emerald">{copy.passwordUpdated}</Alert>
          ) : null}
          {params?.status === "checkout_ready" ? (
            <Alert tone="emerald">{copy.checkoutReady}</Alert>
          ) : null}

          {params?.error === "sample_desk_unavailable" ? (
            <Alert tone="amber">{copy.sampleDeskUnavailable}</Alert>
          ) : null}
          {params?.error === "sample_desk_signin_failed" ? (
            <Alert tone="amber">{copy.sampleDeskSignInFailed}</Alert>
          ) : null}

          <form action={signInWithPassword} className="mt-4 space-y-4">
            <input name="next" type="hidden" value={nextPath} />
            <label className="block space-y-2">
              <span className="text-sm font-semibold text-slate-700">{copy.email}</span>
              <input
                autoComplete="email"
                className="w-full rounded-2xl border border-[#d9e2ef] bg-[#fbfcff] px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[#2a5abd] focus:bg-white"
                name="email"
                type="email"
              />
            </label>
            <label className="block space-y-2">
              <span className="text-sm font-semibold text-slate-700">{copy.password}</span>
              <input
                autoComplete="current-password"
                className="w-full rounded-2xl border border-[#d9e2ef] bg-[#fbfcff] px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[#2a5abd] focus:bg-white"
                name="password"
                type="password"
              />
            </label>
            <button
              className="inline-flex min-h-11 w-full items-center justify-center rounded-full bg-[#06266d] px-5 text-sm font-black text-white transition hover:bg-[#0a328c]"
              type="submit"
            >
              {copy.signIn}
            </button>
          </form>

          <form action={signInToSampleDesk} className="mt-3">
            <button
              className="inline-flex min-h-11 w-full items-center justify-center rounded-full border border-[#d9e2ef] bg-white px-5 text-sm font-semibold text-[#06266d] transition hover:bg-[#eef4ff]"
              type="submit"
            >
              {copy.showDesk}
            </button>
          </form>

          <div className="mt-6 space-y-3">
            <Link
              className="inline-flex min-h-11 w-full items-center justify-center rounded-full bg-[#f5b932] px-5 text-sm font-black text-[#071b42] transition hover:bg-[#ffd064]"
              href={withSiteLanguage("/start-trial", language)}
            >
              {copy.createAccount}
            </Link>
            <p className="text-center text-xs leading-5 text-slate-500">{copy.noCard}</p>
            <div className="flex flex-wrap gap-3">
              <Link
                className="inline-flex min-h-11 items-center justify-center rounded-full border border-[#2a5abd] px-5 text-sm font-black text-[#06266d] transition hover:bg-[#eef4ff]"
                href="/forgot-password"
              >
                {copy.resetPassword}
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
