import Link from "next/link";
import type { Metadata } from "next";
import { PrivateAtlasAuthHeader } from "@/components/private-atlas-auth-header";
import { getSiteLanguage } from "@/lib/site-language-server";
import { requestPasswordReset } from "@/server/auth/actions";

export async function generateMetadata(): Promise<Metadata> {
  const language = await getSiteLanguage();

  return {
    title: language === "es" ? "Restablecer contraseña | Atlas para emprendedores" : "Reset Password | Atlas For Entrepreneurs",
    robots: { index: false, follow: false },
  };
}

type ForgotPasswordPageProps = {
  searchParams?: Promise<{
    error?: string;
    status?: string;
  }>;
};

const errorMessages: Record<string, string> = {
  delivery_failed:
    "Atlas could not send the reset email right now. Please wait a few minutes and try once more, or contact Atlas for help.",
  missing_email: "Enter the email address for the account.",
  session_expired: "The reset session expired. Request a new reset link.",
};

export default async function ForgotPasswordPage({
  searchParams,
}: ForgotPasswordPageProps) {
  const params = await searchParams;
  const language = await getSiteLanguage();
  const copy = language === "es"
    ? {
        eyebrow: "Recuperación de cuenta",
        title: "Restablece tu contraseña de Atlas para emprendedores.",
        description: "Ingresa el correo de acceso a Atlas para emprendedores. Te enviaremos un enlace seguro de un solo uso para elegir una contraseña nueva.",
        sent: "Si existe una cuenta de Atlas para ese correo, se envió un enlace para restablecer la contraseña.",
        email: "Correo electrónico",
        placeholder: "nombre@ejemplo.com",
        submit: "Enviar enlace de restablecimiento",
        back: "Volver al acceso",
        errors: {
          delivery_failed: "Atlas no pudo enviar el correo de restablecimiento en este momento. Espera unos minutos e inténtalo otra vez, o contacta a Atlas para obtener ayuda.",
          missing_email: "Ingresa el correo de la cuenta.",
          session_expired: "La sesión de restablecimiento expiró. Solicita un enlace nuevo.",
        },
      }
    : {
        eyebrow: "Account recovery",
        title: "Reset your Atlas For Entrepreneurs password.",
        description: "Enter your Atlas For Entrepreneurs login email. We will send a secure, one-time link that lets you choose a new password.",
        sent: "If an Atlas account exists for that email, a password reset link has been sent.",
        email: "Email",
        placeholder: "name@example.com",
        submit: "Send reset link",
        back: "Back to login",
        errors: errorMessages,
      };
  const error = params?.error ? copy.errors[params.error as keyof typeof copy.errors] : null;

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

          <div className="mt-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            {params?.status === "sent" ? (
              <div className="mb-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm leading-6 text-emerald-900">
                {copy.sent}
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
                  {copy.email}
                </label>
                <input
                  autoComplete="email"
                  className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-950 outline-none transition focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
                  id="email"
                  name="email"
                  placeholder={copy.placeholder}
                  required
                  type="email"
                />
              </div>

              <button
                className="w-full rounded-xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
                type="submit"
              >
                {copy.submit}
              </button>
            </form>

            <Link
              className="mt-5 inline-flex text-sm font-semibold text-slate-700 hover:text-slate-950"
              href="/login"
            >
              {copy.back}
            </Link>
          </div>
        </section>
      </main>
    </>
  );
}
