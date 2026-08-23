import Link from "next/link";
import type { Metadata } from "next";
import { PrivateAtlasAuthHeader } from "@/components/private-atlas-auth-header";
import { getSiteLanguage } from "@/lib/site-language-server";
import { updatePassword } from "@/server/auth/actions";

export async function generateMetadata(): Promise<Metadata> {
  const language = await getSiteLanguage();

  return {
    title: language === "es" ? "Elige una contraseña nueva | Atlas para emprendedores" : "Choose a New Password | Atlas For Entrepreneurs",
    robots: { index: false, follow: false },
  };
}

type ResetPasswordPageProps = {
  searchParams?: Promise<{
    error?: string;
  }>;
};

const errorMessages: Record<string, string> = {
  missing_password: "Enter and confirm the new password.",
  password_mismatch: "The password fields do not match.",
  update_failed: "The password could not be updated. Request a new reset link.",
  weak_password:
    "Use at least 12 characters with a lowercase letter, uppercase letter, number, and symbol.",
};

export default async function ResetPasswordPage({
  searchParams,
}: ResetPasswordPageProps) {
  const params = await searchParams;
  const language = await getSiteLanguage();
  const copy = language === "es"
    ? {
        eyebrow: "Recuperación segura",
        title: "Elige una contraseña nueva.",
        description: "Usa una contraseña única que no compartas con Gmail ni con ningún otro servicio. Después de guardarla, Atlas cerrará tu sesión y te devolverá al acceso.",
        newPassword: "Contraseña nueva",
        newPasswordPlaceholder: "Contraseña nueva",
        confirmPassword: "Confirma la contraseña nueva",
        confirmPlaceholder: "Confirma la contraseña nueva",
        requirements: "Al menos 12 caracteres, incluyendo una letra minúscula, una mayúscula, un número y un símbolo.",
        submit: "Actualizar contraseña",
        request: "Solicitar un enlace de restablecimiento nuevo",
        errors: {
          missing_password: "Ingresa y confirma la contraseña nueva.",
          password_mismatch: "Los campos de contraseña no coinciden.",
          update_failed: "No se pudo actualizar la contraseña. Solicita un enlace de restablecimiento nuevo.",
          weak_password: "Usa al menos 12 caracteres con una letra minúscula, una mayúscula, un número y un símbolo.",
        },
      }
    : {
        eyebrow: "Secure recovery",
        title: "Choose a new password.",
        description: "Use a unique password that is not shared with Gmail or any other service. After saving, Atlas signs you out and sends you back to login.",
        newPassword: "New password",
        newPasswordPlaceholder: "New password",
        confirmPassword: "Confirm new password",
        confirmPlaceholder: "Confirm new password",
        requirements: "At least 12 characters, including lowercase, uppercase, a number, and a symbol.",
        submit: "Update password",
        request: "Request a new reset link",
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
            {error ? (
              <div className="mb-5 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900">
                {error}
              </div>
            ) : null}

            <form action={updatePassword} className="space-y-5">
              <div>
                <label
                  className="text-sm font-medium text-slate-700"
                  htmlFor="password"
                >
                  {copy.newPassword}
                </label>
                <input
                  autoComplete="new-password"
                  className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-950 outline-none transition focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
                  aria-describedby="password-requirements"
                  id="password"
                  minLength={12}
                  name="password"
                  placeholder={copy.newPasswordPlaceholder}
                  required
                  type="password"
                />
                <p
                  className="mt-2 text-sm leading-6 text-slate-600"
                  id="password-requirements"
                >
                  {copy.requirements}
                </p>
              </div>

              <div>
                <label
                  className="text-sm font-medium text-slate-700"
                  htmlFor="confirmPassword"
                >
                  {copy.confirmPassword}
                </label>
                <input
                  autoComplete="new-password"
                  className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-950 outline-none transition focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
                  id="confirmPassword"
                  minLength={12}
                  name="confirmPassword"
                  placeholder={copy.confirmPlaceholder}
                  required
                  type="password"
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
              href="/forgot-password"
            >
              {copy.request}
            </Link>
          </div>
        </section>
      </main>
    </>
  );
}
