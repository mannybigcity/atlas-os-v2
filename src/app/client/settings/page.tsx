import type { Metadata } from "next";
import Link from "next/link";
import { LionsDenBoardScreen } from "@/components/lions-den/lions-den-board-screen";
import { getClientPortalOrgLabel } from "@/lib/client-portal/identity";
import { getAtlasPlanPaymentLinks } from "@/lib/payment-links";
import { atlasPricingPlans } from "@/lib/pricing";
import { TRIAL_UPGRADE_HREF } from "@/lib/lions-den/trial-status";
import { getSiteLanguage } from "@/lib/site-language-server";
import { getClientWorkspaceContext } from "@/server/client-workspace/context";
import { getDeskBillingSummary } from "@/server/stripe/billing-summary";
import { openBillingPortal } from "@/server/stripe/portal-actions";
import { getTrialProfile } from "@/server/trials/profile";

export const dynamic = "force-dynamic";

const SUPPORT_EMAIL = "atlasforentrepreneurs@gmail.com";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Settings & plan | The Lion’s Den",
    robots: { index: false, follow: false },
  };
}

type SettingsPageProps = {
  searchParams?: Promise<{
    lang?: string;
    previewOrg?: string;
    workspace?: string;
    billing?: string;
  }>;
};

const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

function formatDate(value: string | null | undefined, spanish: boolean) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString(spanish ? "es-US" : "en-US", { month: "long", day: "numeric", year: "numeric" });
}

export default async function SettingsPage({ searchParams }: SettingsPageProps) {
  const params = await searchParams;
  const language = await getSiteLanguage(params?.lang);
  const spanish = language === "es";
  const workspace = await getClientWorkspaceContext("/client/settings", params);
  const { user, primaryOrganization, trial } = workspace;
  const [profile, billing] = await Promise.all([getTrialProfile(user.id), getDeskBillingSummary(user.id)]);
  const paymentLinks = getAtlasPlanPaymentLinks();
  const metadata = (user.user_metadata ?? {}) as Record<string, unknown>;
  const phone = String(metadata.phone ?? "").trim();
  const city = String(metadata.city ?? "").trim();
  const postalCode = String(metadata.postal_code ?? metadata.postalCode ?? "").trim();
  const businessName = getClientPortalOrgLabel(primaryOrganization) || primaryOrganization?.name || profile?.business_name || "";
  const trialEnds = formatDate(trial?.endsAt, spanish);
  const renews = formatDate(billing?.currentPeriodEnd, spanish);
  const billingNotice =
    params?.billing === "unavailable"
      ? spanish
        ? "Aún no hay una suscripción de Stripe vinculada a esta cuenta. Elige un plan abajo."
        : "No Stripe subscription is linked to this account yet. Pick a plan below."
      : params?.billing === "failed"
        ? spanish
          ? "No pudimos abrir el portal de facturación. Escríbenos y lo resolvemos."
          : "We could not open the billing portal. Email us and we will sort it out."
        : null;

  const rows: Array<[string, string]> = [
    [spanish ? "Negocio" : "Business", businessName || "—"],
    [spanish ? "Tipo de negocio" : "Business type", profile?.business_type || "—"],
    [spanish ? "Nombre" : "Your name", profile?.full_name || String(metadata.full_name ?? "") || "—"],
    [spanish ? "Correo de acceso" : "Login email", user.email ?? "—"],
    [spanish ? "Teléfono" : "Phone", phone || "—"],
    [spanish ? "Zona de servicio" : "Service area", [city, postalCode].filter(Boolean).join(" ") || "—"],
  ];

  return (
    <LionsDenBoardScreen board="settings" workspace={workspace}>
      <div className="space-y-4">
        <section className="ld-panel">
          <div className="ld-panel-head">
            <p>{spanish ? "Ajustes" : "Settings"}</p>
          </div>
          <div className="ld-panel-body">
            <h2 className="text-xl font-semibold text-[#071b42]">{spanish ? "Tu negocio" : "Your business"}</h2>
            <p className="mt-1 text-sm text-[#5c6578]">
              {spanish
                ? "Estos datos vienen de tu registro. Para cambiarlos, escríbenos y los actualizamos el mismo día."
                : "These details come from your signup. To change any of them, email us and we will update them the same day."}
            </p>
            <dl className="mt-4 grid gap-3 sm:grid-cols-2">
              {rows.map(([label, value]) => (
                <div className="rounded-md border border-[#ece7d8] bg-[#fbfaf4] px-3 py-2" key={label}>
                  <dt className="text-[10px] font-black uppercase tracking-[0.14em] text-[#8a93a3]">{label}</dt>
                  <dd className="mt-0.5 break-words text-sm font-semibold text-[#071b42]">{value}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        <section className="ld-panel" id="plan">
          <div className="ld-panel-head">
            <p>{spanish ? "Plan y facturación" : "Plan & billing"}</p>
          </div>
          <div className="ld-panel-body">
            {billingNotice ? (
              <p className="mb-3 rounded-md border border-[#e9d9a6] bg-[#fff8e6] px-3 py-2 text-sm text-[#5c4a12]" role="status">
                {billingNotice}
              </p>
            ) : null}

            {billing?.active ? (
              <div>
                <h2 className="text-xl font-semibold text-[#071b42]">
                  {spanish ? "Plan activo" : "Active plan"}: {String(billing.planSlug ?? "atlas").toUpperCase()}
                </h2>
                <p className="mt-1 text-sm text-[#5c6578]">
                  {billing.cancelAtPeriodEnd
                    ? spanish
                      ? `Se cancela el ${renews ?? "final del periodo"}.`
                      : `Cancels on ${renews ?? "the end of this period"}.`
                    : renews
                      ? spanish
                        ? `Se renueva el ${renews}.`
                        : `Renews on ${renews}.`
                      : null}
                </p>
                <form action={openBillingPortal} className="mt-4">
                  <button
                    className="rounded-full bg-[#071b42] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#0a2a5c]"
                    type="submit"
                  >
                    {spanish ? "Administrar facturación" : "Manage billing"}
                  </button>
                  <p className="mt-2 text-xs text-[#5c6578]">
                    {spanish
                      ? "Cambia la tarjeta, descarga facturas o cancela. Se abre en Stripe."
                      : "Update your card, download invoices, or cancel. Opens in Stripe."}
                  </p>
                </form>
              </div>
            ) : (
              <div>
                <h2 className="text-xl font-semibold text-[#071b42]">
                  {trial
                    ? trial.expired
                      ? spanish
                        ? "Tu prueba terminó"
                        : "Your trial has ended"
                      : spanish
                        ? `Prueba gratuita · ${trial.daysRemaining} ${trial.daysRemaining === 1 ? "día" : "días"} restantes`
                        : `Free trial · ${trial.daysRemaining} ${trial.daysRemaining === 1 ? "day" : "days"} left`
                    : spanish
                      ? "Sin plan activo"
                      : "No active plan"}
                </h2>
                <p className="mt-1 text-sm text-[#5c6578]">
                  {trialEnds
                    ? spanish
                      ? `La prueba termina el ${trialEnds}. Todo lo que ya tienes en el escritorio se conserva cuando eliges un plan.`
                      : `Trial ends ${trialEnds}. Everything on your desk carries over when you pick a plan.`
                    : spanish
                      ? "Elige un plan para mantener el escritorio abierto."
                      : "Pick a plan to keep the desk open."}
                </p>
                <div className="mt-4 grid gap-3 lg:grid-cols-3">
                  {atlasPricingPlans.map((plan) => {
                    const link = paymentLinks[plan.slug];
                    return (
                      <article
                        className={`rounded-lg border p-4 ${plan.featured ? "border-[#f0c24a] bg-[#fffdf5]" : "border-[#ece7d8] bg-white"}`}
                        key={plan.slug}
                      >
                        <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#1246a0]">{plan.name}</p>
                        <p className="mt-1 text-2xl font-black text-[#071b42]">
                          {money.format(plan.monthlyPrice)}
                          <span className="text-sm font-semibold text-[#5c6578]">{spanish ? "/mes" : "/month"}</span>
                        </p>
                        <p className="mt-1 text-xs leading-5 text-[#5c6578]">{plan.bestFor}</p>
                        {link ? (
                          <a
                            className={`mt-3 inline-flex w-full items-center justify-center rounded-full px-3 py-2 text-sm font-semibold transition ${
                              plan.featured
                                ? "bg-[#f5b932] text-[#071b42] hover:bg-[#ffd266]"
                                : "border border-[#071b42] text-[#071b42] hover:bg-[#071b42] hover:text-white"
                            }`}
                            href={link}
                            rel="noopener"
                          >
                            {spanish ? `Elegir ${plan.name.replace("ATLAS ", "")}` : `Choose ${plan.name.replace("ATLAS ", "")}`}
                          </a>
                        ) : (
                          <Link
                            className="mt-3 inline-flex w-full items-center justify-center rounded-full border border-[#071b42] px-3 py-2 text-sm font-semibold text-[#071b42]"
                            href={TRIAL_UPGRADE_HREF}
                          >
                            {spanish ? "Ver planes" : "See plans"}
                          </Link>
                        )}
                      </article>
                    );
                  })}
                </div>
                <p className="mt-3 text-xs text-[#5c6578]">
                  {spanish
                    ? "Pago seguro con Stripe. Cancela cuando quieras desde esta página."
                    : "Secure checkout by Stripe. Cancel any time from this page."}
                </p>
              </div>
            )}
          </div>
        </section>

        <section className="ld-panel" id="help">
          <div className="ld-panel-head">
            <p>{spanish ? "Ayuda" : "Help"}</p>
          </div>
          <div className="ld-panel-body">
            <h2 className="text-xl font-semibold text-[#071b42]">
              {spanish ? "Una persona real responde." : "A real person answers."}
            </h2>
            <p className="mt-1 text-sm text-[#5c6578]">
              {spanish
                ? "Escríbenos con lo que quieras lograr y te respondemos en horario de oficina de Texas."
                : "Tell us what you are trying to get done and we reply during Texas business hours."}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <a
                className="rounded-full bg-[#071b42] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#0a2a5c]"
                href={`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(`Atlas desk help: ${businessName || user.email || ""}`)}`}
              >
                {SUPPORT_EMAIL}
              </a>
              <Link
                className="rounded-full border border-[#071b42] px-4 py-2 text-sm font-semibold text-[#071b42] transition hover:bg-[#071b42] hover:text-white"
                href="/assessment"
              >
                {spanish ? "Pedir una llamada de arranque" : "Book a kickoff call"}
              </Link>
            </div>
          </div>
        </section>
      </div>
    </LionsDenBoardScreen>
  );
}
