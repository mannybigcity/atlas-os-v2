import Link from "next/link";
import type { Metadata } from "next";
import { PrivateAtlasAuthHeader } from "@/components/private-atlas-auth-header";
import { getSiteLanguage } from "@/lib/site-language-server";
import { confirmAuthLink } from "@/server/auth/actions";

type ConfirmRecoveryPageProps = {
  searchParams?: Promise<{
    code?: string;
    token_hash?: string;
    type?: string;
    next?: string;
  }>;
};

export async function generateMetadata(): Promise<Metadata> {
  const language = await getSiteLanguage();

  return {
    title: language === "es" ? "Confirma tu cuenta | Atlas para emprendedores" : "Confirm Your Account | Atlas For Entrepreneurs",
    robots: { index: false, follow: false },
  };
}

export default async function ConfirmRecoveryPage({
  searchParams,
}: ConfirmRecoveryPageProps) {
  const params = await searchParams;
  const isTrial = params?.type === "email";
  const isInvite = params?.type === "invite" || params?.next === "/set-password";
  const isRecovery = params?.type === "recovery" || Boolean(params?.code);
  const isValidRequest =
    Boolean(params?.code || params?.token_hash) && (isInvite || isRecovery || isTrial);
  const nextPath = isTrial ? "/client?status=welcome" : isInvite ? "/set-password" : "/reset-password";
  const language = await getSiteLanguage();
  const copy = language === "es"
    ? {
        invitationEyebrow: "Invitación de cliente",
        recoveryEyebrow: "Recuperación segura",
        trialTitle: "Confirma tu correo para abrir The Lion's Den.",
        inviteTitle: "Te damos la bienvenida a tu espacio de trabajo de Atlas.",
        recoveryTitle: "Continúa con el restablecimiento de tu contraseña.",
        inviteDescription: "Continúa para crear tu propia contraseña y abrir tu espacio de trabajo privado de cliente. Atlas nunca envía contraseñas por correo.",
        recoveryDescription: "Atlas espera a que continúes antes de usar este enlace de recuperación de un solo uso. Esto protege el enlace de las revisiones de seguridad automáticas del correo.",
        trialButton: "Confirmar y abrir mi espacio de trabajo",
        inviteButton: "Aceptar invitación",
        recoveryButton: "Continuar de forma segura",
        invalid: "Este enlace está incompleto o expiró. Pide a Atlas una invitación nueva, o solicita un correo nuevo para restablecer la contraseña si ya tienes una cuenta.",
        login: "Ir al acceso de clientes",
        request: "Solicitar un enlace de restablecimiento nuevo",
      }
    : {
        invitationEyebrow: "Client invitation",
        recoveryEyebrow: "Secure recovery",
        trialTitle: "Confirm your email to open The Lion's Den.",
        inviteTitle: "Welcome to your Atlas workspace.",
        recoveryTitle: "Continue your password reset.",
        inviteDescription: "Continue to create your own password and open your private client workspace. Atlas never sends passwords by email.",
        recoveryDescription: "Atlas waits for you to continue before using this one-time recovery link. This protects the link from automated email security checks.",
        trialButton: "Confirm and open my workspace",
        inviteButton: "Accept invitation",
        recoveryButton: "Continue securely",
        invalid: "This link is incomplete or expired. Ask Atlas for a new invitation, or request a new password reset email if you already have an account.",
        login: "Go to client login",
        request: "Request a new reset link",
      };

  return (
    <>
      <PrivateAtlasAuthHeader />
      <main className="min-h-[calc(100vh-73px)] bg-slate-50 px-6 py-12">
        <section className="mx-auto max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-blue-700">
            {isInvite ? copy.invitationEyebrow : copy.recoveryEyebrow}
          </p>
          <h1 className="mt-4 text-4xl font-bold tracking-tight text-slate-950 sm:text-5xl">
            {isTrial ? copy.trialTitle : isInvite ? copy.inviteTitle : copy.recoveryTitle}
          </h1>
          <p className="mt-5 text-lg leading-8 text-slate-600">
            {isInvite ? copy.inviteDescription : copy.recoveryDescription}
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
                  value={isTrial ? "email" : isInvite ? "invite" : "recovery"}
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
              {isTrial ? copy.trialButton : isInvite ? copy.inviteButton : copy.recoveryButton}
                </button>
              </form>
            ) : (
              <div>
                <p className="text-sm leading-6 text-rose-900">
                  {copy.invalid}
                </p>
                <Link
                  className="mt-5 inline-flex text-sm font-semibold text-slate-700 hover:text-slate-950"
                  href={isInvite ? "/login" : "/forgot-password"}
                >
                  {isInvite ? copy.login : copy.request}
                </Link>
              </div>
            )}
          </div>
        </section>
      </main>
    </>
  );
}
