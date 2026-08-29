import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { PrivateAtlasAuthHeader } from "@/components/private-atlas-auth-header";
import { withSiteLanguage } from "@/lib/site-language";
import { getSiteLanguage } from "@/lib/site-language-server";
import { getVerifiedUser } from "@/server/auth/guards";
import { getAtlasStripeClient } from "@/server/stripe/client";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const language = await getSiteLanguage();

  return {
    title: language === "es"
      ? "Tu Lion’s Den está listo | Atlas para emprendedores"
      : "Your Lion’s Den is ready | Atlas For Entrepreneurs",
    robots: { index: false, follow: false },
  };
}

type CheckoutSuccessPageProps = {
  searchParams?: Promise<{
    session_id?: string;
  }>;
};

export default async function CheckoutSuccessPage({
  searchParams,
}: CheckoutSuccessPageProps) {
  const params = await searchParams;
  const language = await getSiteLanguage();
  let signedIn = false;

  try {
    signedIn = Boolean(await getVerifiedUser());
  } catch {
    signedIn = false;
  }

  if (signedIn) {
    redirect("/client?status=welcome");
  }

  await confirmCheckoutSession(params?.session_id);

  const copy = language === "es"
    ? {
        eyebrow: "Pago recibido",
        title: "Tu Lion’s Den está listo.",
        description:
          "Usa el correo con el que pagaste. Si es la primera vez, abre el correo de Atlas para crear tu contraseña. Si ya tienes cuenta, inicia sesión y entra al hub.",
        signIn: "Iniciar sesión y abrir Lion’s Den",
        forgot: "¿No llegó el correo de contraseña? Restablecer contraseña",
      }
    : {
        eyebrow: "Payment received",
        title: "Your Lion’s Den is ready.",
        description:
          "Use the email you paid with. New buyers get one Atlas email to create a password. If you already have a login, sign in and open the hub.",
        signIn: "Sign in and open Lion’s Den",
        forgot: "Didn’t get the password email? Reset your password",
      };

  return (
    <>
      <PrivateAtlasAuthHeader />
      <main className="min-h-[calc(100vh-73px)] bg-[#fffdf8] px-6 py-12">
        <section className="mx-auto max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-[#1246a0]">
            {copy.eyebrow}
          </p>
          <h1 className="mt-4 font-serif text-4xl font-black tracking-[-0.06em] text-[#071b42] sm:text-5xl">
            {copy.title}
          </h1>
          <p className="mt-5 text-lg leading-8 text-slate-600">
            {copy.description}
          </p>

          <div className="mt-8 space-y-3 rounded-3xl border border-[#dfe5ef] bg-white p-6 shadow-sm">
            <Link
              className="inline-flex min-h-12 w-full items-center justify-center rounded-full bg-[#f5b932] px-5 text-sm font-black text-[#071b42] transition hover:bg-[#ffd064]"
              href={withSiteLanguage("/login?status=checkout_ready&next=/client", language)}
            >
              {copy.signIn}
            </Link>
            <Link
              className="inline-flex min-h-11 w-full items-center justify-center rounded-full border border-[#cbd8e8] px-5 text-sm font-black text-[#16325c] transition hover:bg-[#f4f7fb]"
              href="/forgot-password"
            >
              {copy.forgot}
            </Link>
          </div>
        </section>
      </main>
    </>
  );
}

async function confirmCheckoutSession(sessionId?: string) {
  const id = String(sessionId ?? "").trim();
  if (!id.startsWith("cs_")) return;

  const stripe = getAtlasStripeClient();
  if (!stripe) return;

  try {
    await stripe.checkout.sessions.retrieve(id);
  } catch {
    // The door still opens if Stripe is unavailable; the webhook is the source of truth.
  }
}
