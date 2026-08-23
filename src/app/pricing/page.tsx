import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { AtlasSprintOffer } from "@/components/atlas-sprint-offer";
import { SiteHeader } from "@/components/site-header";
import {
  atlasPhoneAiAddOn,
  atlasPricingComparisonRows,
  atlasPricingFaqs,
  atlasPricingPlans,
  atlasSprintOffer,
} from "@/lib/pricing";
import { getAtlasPlanPaymentLinks, getAtlasSprintPaymentLink } from "@/lib/payment-links";
import { withSiteLanguage, type SiteLanguage } from "@/lib/site-language";
import { getSiteLanguage } from "@/lib/site-language-server";

export const metadata: Metadata = {
  title: "Pricing | Atlas For Entrepreneurs",
  description: "Atlas pricing for solo operators, growing businesses, and established teams.",
  alternates: {
    canonical: "/pricing",
  },
  openGraph: {
    title: "Atlas Pricing",
    description:
      "One system to help you find more prospects, follow up faster, and close more deals.",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Atlas Pricing",
    description:
      "One system to help you find more prospects, follow up faster, and close more deals.",
  },
};

const money = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

const spanishByEnglish: Readonly<Record<string, string>> = {
  "Pricing": "Precios",
  "Find more prospects.": "Encuentra más prospectos.",
  "Follow up faster.": "Da seguimiento más rápido.",
  "Close more deals.": "Cierra más ventas.",
  "Start with the tools your business needs today. Add more automation as you grow.":
    "Comienza con las herramientas que tu negocio necesita hoy. Agrega más automatización a medida que creces.",
  "Choose My Atlas Plan": "Elegir mi plan de Atlas",
  "Start Your Business Assessment": "Iniciar mi evaluación empresarial",
  "Start 7-day free trial": "Iniciar prueba gratuita de 7 días",
  "No card required. Your seven-day trial starts after the enrollment step is completed.":
    "No se requiere tarjeta. Tu prueba de siete días comienza después de completar la inscripción.",
  "Monthly usage allowance included": "Asignación mensual de uso incluida",
  "Human approval before external action": "Aprobación humana antes de cualquier acción externa",
  "Three monthly plans for different stages of growth": "Tres planes mensuales para distintas etapas de crecimiento",
  "Atlas lion carrying the world": "León de Atlas cargando el mundo",
  "Most popular": "Más popular",
  "/month": "/mes",
  "Future capacity": "Capacidad futura",
  "Available now": "Disponible ahora",
  "Launch offer": "Oferta de lanzamiento",
  "Coming soon": "Próximamente",
  "Review": "Revisar",
  "Plan comparison": "Comparación de planes",
  "What each Atlas plan includes": "Lo que incluye cada plan de Atlas",
  "Atlas pricing comparison between Basic, Grow, and Unlimited.":
    "Comparación de precios de Atlas entre Básico, Crecimiento e Ilimitado.",
  "Plan": "Plan",
  "The sprint is the focused one-time starting offer. Monthly Atlas plans are optional continuation plans after the sprint.":
    "El sprint es la oferta inicial enfocada de una sola vez. Los planes mensuales de Atlas son opciones de continuidad después del sprint.",
  "What Atlas replaces or simplifies": "Lo que Atlas reemplaza o simplifica",
  "Fewer disconnected tools. More coordinated work.": "Menos herramientas desconectadas. Más trabajo coordinado.",
  "Atlas reduces the need to bounce between disconnected prospecting, CRM, content, follow-up, and AI tools. It does not claim to fully replace HubSpot, GoHighLevel, ChatGPT, Canva, staff, or any other platform.":
    "Atlas reduce la necesidad de alternar entre herramientas desconectadas de prospección, CRM, contenido, seguimiento e IA. No afirma reemplazar por completo a HubSpot, GoHighLevel, ChatGPT, Canva, al personal ni a ninguna otra plataforma.",
  "Lead discovery and sales organization in one flow": "Descubrimiento de prospectos y organización de ventas en un solo flujo",
  "Follow-up and next-step visibility without scattered notes": "Visibilidad del seguimiento y del próximo paso sin notas dispersas",
  "Content drafts tied to the business goal instead of random posting": "Borradores de contenido vinculados a la meta del negocio en lugar de publicaciones al azar",
  "Owner visibility without a pile of disconnected dashboards": "Visibilidad para el propietario sin una pila de paneles desconectados",
  "Responsible automation": "Automatización responsable",
  "Assist and coordinate. Do not surprise the owner.": "Ayudar y coordinar. Sin sorprender al propietario.",
  "Atlas is built to stay supervised. Critical outreach, public actions, and other sensitive steps remain approval-controlled where the current product requires it.":
    "Atlas está diseñado para mantenerse bajo supervisión. Los contactos críticos, las acciones públicas y otros pasos sensibles permanecen sujetos a aprobación cuando el producto actual así lo requiere.",
  "Approval gates": "Controles de aprobación",
  "Sensitive actions stay in human review until the workflow is explicitly approved.":
    "Las acciones sensibles permanecen en revisión humana hasta que el flujo de trabajo se aprueba explícitamente.",
  "Clear scope": "Alcance claro",
  "Atlas coordinates the work but does not pretend to be fully autonomous.":
    "Atlas coordina el trabajo, pero no pretende ser completamente autónomo.",
  "Business control": "Control del negocio",
  "The owner keeps the final say on outreach, pricing changes, and public action.":
    "El propietario conserva la decisión final sobre contactos, cambios de precios y acciones públicas.",
  "ATLAS FRONT DESK is the future phone layer.": "ATLAS FRONT DESK será la futura capa telefónica.",
  "Target future price:": "Precio futuro previsto:",
  "This is not live in the current product.": "No está activo en el producto actual.",
  "Not operational": "No operativo",
  "FAQ": "Preguntas frecuentes",
  "Straight answers before you start.": "Respuestas claras antes de comenzar.",
  "Next move": "Próximo paso",
  "Choose the plan that matches your growth stage.": "Elige el plan que corresponda a tu etapa de crecimiento.",
  "If you want help deciding, start with the business assessment. Atlas can guide the fit conversation without fabricating pricing or promises.":
    "Si quieres ayuda para decidir, comienza con la evaluación empresarial. Atlas puede orientar la conversación sobre la opción adecuada sin inventar precios ni promesas.",
  "No automatic subscription. No unsupported feature claims.": "Sin suscripción automática. Sin afirmaciones de funciones no disponibles.",
  "Founding offer": "Oferta para fundadores",
  "Atlas 30-Day Revenue Rescue Sprint": "Sprint Atlas de rescate de ingresos de 30 días",
  "A focused, human-led 30-day engagement to identify one revenue leak, install a practical follow-up system, and review what changed.":
    "Un trabajo enfocado de 30 días, dirigido por personas, para identificar una fuga de ingresos, instalar un sistema práctico de seguimiento y revisar qué cambió.",
  "Focused business and revenue-leak assessment": "Evaluación enfocada del negocio y de fugas de ingresos",
  "One agreed measurable 30-day goal": "Una meta medible acordada para 30 días",
  "One private Atlas workspace": "Un espacio de trabajo privado de Atlas",
  "Simple opportunity and follow-up pipeline": "Proceso sencillo de oportunidades y seguimiento",
  "One approved follow-up sequence or focused marketing asset set": "Una secuencia de seguimiento aprobada o un conjunto enfocado de materiales de marketing",
  "Weekly owner check-ins and a day-30 review": "Revisiones semanales con el propietario y una evaluación al día 30",
  "Phone AI or autonomous customer contact": "IA telefónica o contacto autónomo con clientes",
  "Autonomous publishing, ad spend, or paid third-party software": "Publicación autónoma, gasto publicitario o software externo de pago",
  "Unlimited consulting or multiple unrelated business problems": "Consultoría ilimitada o múltiples problemas de negocio no relacionados",
  "Guaranteed leads, sales, revenue, or business results": "Prospectos, ventas, ingresos o resultados empresariales garantizados",
  "one time · no automatic renewal": "pago único · sin renovación automática",
  "What you get": "Lo que recibes",
  "Not included": "No incluido",
  "Start My 30-Day Sprint": "Iniciar mi sprint de 30 días",
  "Review the sprint with Atlas": "Revisar el sprint con Atlas",
  "Secure Stripe-hosted checkout. No card details are collected on this site.":
    "Pago seguro alojado por Stripe. Este sitio no recopila los datos de tu tarjeta.",
  "Checkout is not configured in this local environment yet.": "El pago aún no está configurado en este entorno local.",
  "ATLAS BASIC": "ATLAS BÁSICO",
  "Solo owners / very small businesses": "Propietarios independientes / negocios muy pequeños",
  "Choose BASIC": "Elegir BÁSICO",
  "Monthly usage allowance": "Asignación mensual de uso",
  "CRM / Sales Command": "CRM / Comando de ventas",
  "Lead generation tools": "Herramientas de generación de prospectos",
  "Social media content tools": "Herramientas de contenido para redes sociales",
  "Customer relationship management": "Gestión de relaciones con clientes",
  "Business assessment": "Evaluación empresarial",
  "Opportunity tracking": "Seguimiento de oportunidades",
  "Activity / attention center": "Centro de actividad y atención",
  "Monthly AI allowance": "Asignación mensual de IA",
  "Standard support": "Soporte estándar",
  "Expanded automation as the workflow matures": "Automatización ampliada a medida que madura el flujo de trabajo",
  "Higher usage capacity as the business grows": "Mayor capacidad de uso a medida que crece el negocio",
  "ATLAS GROW": "ATLAS CRECIMIENTO",
  "Growing local businesses": "Negocios locales en crecimiento",
  "Choose GROW": "Elegir CRECIMIENTO",
  "Larger monthly usage allowance": "Mayor asignación mensual de uso",
  "Everything in BASIC": "Todo lo incluido en BÁSICO",
  "Expanded lead generation": "Generación ampliada de prospectos",
  "Full Sales Command workflow": "Flujo completo de Comando de ventas",
  "Stronger follow-up capability": "Mayor capacidad de seguimiento",
  "Full social media content tools": "Herramientas completas de contenido para redes sociales",
  "Growth reporting": "Informes de crecimiento",
  "Expanded workflows and integrations": "Flujos de trabajo e integraciones ampliados",
  "Priority support": "Soporte prioritario",
  "Priority onboarding for the next phase": "Incorporación prioritaria para la siguiente fase",
  "More specialized automation as usage proves the need": "Automatización más especializada cuando el uso demuestre la necesidad",
  "ATLAS UNLIMITED": "ATLAS ILIMITADO",
  "Established teams": "Equipos establecidos",
  "Choose UNLIMITED": "Elegir ILIMITADO",
  "Largest monthly usage allowance": "La mayor asignación mensual de uso",
  "Everything in GROW": "Todo lo incluido en CRECIMIENTO",
  "Higher usage limits": "Límites de uso más altos",
  "Multi-user team support": "Soporte para equipos con varios usuarios",
  "Executive reporting": "Informes ejecutivos",
  "Advanced workflows": "Flujos de trabajo avanzados",
  "Priority onboarding": "Incorporación prioritaria",
  "Future automation privileges": "Privilegios de automatización futura",
  "Preferred pricing and allowance for ATLAS Phone AI": "Precio y asignación preferentes para ATLAS Phone AI",
  "Preferred access to future voice and receptionist tooling": "Acceso preferente a futuras herramientas de voz y recepción",
  "More advanced automation privileges as systems mature": "Privilegios de automatización más avanzados a medida que maduran los sistemas",
  "Suggested price": "Precio sugerido",
  "$99/mo": "$99/mes",
  "$249/mo": "$249/mes",
  "$499/mo": "$499/mes",
  "Best for": "Ideal para",
  "Users": "Usuarios",
  "1-2": "1-2",
  "Up to 5": "Hasta 5",
  "Up to 15": "Hasta 15",
  "Customer relationship management (CRM)": "Gestión de relaciones con clientes (CRM)",
  "Included": "Incluido",
  "Lead generation": "Generación de prospectos",
  "Limited": "Limitada",
  "Expanded": "Ampliada",
  "High-volume": "Gran volumen",
  "Social media content": "Contenido para redes sociales",
  "Basic": "Básico",
  "Full": "Completo",
  "Full + advanced workflows": "Completo + flujos de trabajo avanzados",
  "AI business assistant": "Asistente empresarial con IA",
  "Activity and follow-up center": "Centro de actividad y seguimiento",
  "AI usage": "Uso de IA",
  "Monthly allowance": "Asignación mensual",
  "Larger allowance": "Mayor asignación",
  "Largest allowance": "La mayor asignación",
  "Reporting": "Informes",
  "Growth dashboard": "Panel de crecimiento",
  "Executive dashboard": "Panel ejecutivo",
  "Integrations": "Integraciones",
  "Core": "Principales",
  "Priority": "Prioritarias",
  "Support": "Soporte",
  "Standard": "Estándar",
  "Priority + onboarding": "Prioridad + incorporación",
  "Future ATLAS Phone AI": "Futuro ATLAS Phone AI",
  "Add-on": "Complemento",
  "Included allowance / discounted": "Asignación incluida / con descuento",
  "Can I change plans later?": "¿Puedo cambiar de plan más adelante?",
  "Yes. The plans are designed as a progression, so you can move up when your workflow and usage justify it.":
    "Sí. Los planes están diseñados como una progresión, por lo que puedes subir de nivel cuando tu flujo de trabajo y uso lo justifiquen.",
  "Does Atlas automatically contact prospects?": "¿Atlas contacta automáticamente a los prospectos?",
  "No. Critical outreach and other external actions stay approval-controlled unless the current product explicitly says otherwise.":
    "No. Los contactos críticos y otras acciones externas permanecen sujetos a aprobación, salvo que el producto actual indique explícitamente lo contrario.",
  "Is Atlas a CRM?": "¿Atlas es un CRM?",
  "Atlas includes CRM-style prospect tracking, but the product is broader than a traditional CRM. It coordinates lead discovery, follow-up, content, and owner visibility around a business goal.":
    "Atlas incluye seguimiento de prospectos al estilo de un CRM, pero el producto es más amplio que un CRM tradicional. Coordina el descubrimiento de prospectos, el seguimiento, el contenido y la visibilidad del propietario alrededor de una meta empresarial.",
  "Does Atlas generate social content?": "¿Atlas genera contenido para redes sociales?",
  "Yes, Atlas includes content drafting support. Drafts still need human review before anything goes live.":
    "Sí, Atlas incluye apoyo para redactar contenido. Los borradores aún requieren revisión humana antes de publicarse.",
  "Does Atlas replace my employees?": "¿Atlas reemplaza a mis empleados?",
  "No. Atlas is meant to coordinate work, reduce missed steps, and help your team move faster with clearer priorities.":
    "No. Atlas está diseñado para coordinar el trabajo, reducir pasos omitidos y ayudar a tu equipo a avanzar más rápido con prioridades más claras.",
  "What counts toward AI or prospect-search usage?": "¿Qué cuenta para el uso de IA o búsqueda de prospectos?",
  "Usage is tracked against the AI and discovery work the system performs. The product includes allowances, not unlimited usage.":
    "El uso se contabiliza según el trabajo de IA y descubrimiento que realiza el sistema. El producto incluye asignaciones, no uso ilimitado.",
  "Can my team use Atlas?": "¿Mi equipo puede usar Atlas?",
  "Yes. ATLAS UNLIMITED is the clearest fit for teams, and the product is designed to expand with organization needs.":
    "Sí. ATLAS ILIMITADO es la opción más clara para equipos, y el producto está diseñado para crecer con las necesidades de la organización.",
  "Is Phone AI included?": "¿Está incluida la IA telefónica?",
  "Not yet. ATLAS FRONT DESK is coming soon as a separate future add-on, and it is not operational in this release.":
    "Todavía no. ATLAS FRONT DESK llegará próximamente como un complemento futuro independiente y no está operativo en esta versión.",
  "Is there a long-term contract?": "¿Hay un contrato a largo plazo?",
  "The pricing page does not introduce a billing contract. Any paid engagement should be confirmed before purchase or onboarding.":
    "La página de precios no establece un contrato de facturación. Cualquier servicio pagado debe confirmarse antes de la compra o la incorporación.",
  "ATLAS FRONT DESK": "ATLAS FRONT DESK",
  "$149-$249/month plus usage": "$149-$249/mes más uso",
  "AI receptionist and inbound call handling for lead capture, callback capture, call summaries, and CRM writeback.":
    "Recepcionista con IA y gestión de llamadas entrantes para captar prospectos, solicitudes de devolución de llamada, resúmenes de llamadas y registro en el CRM.",
  "AI receptionist": "Recepcionista con IA",
  "Inbound call handling": "Gestión de llamadas entrantes",
  "Lead capture": "Captura de prospectos",
  "Appointment and callback capture": "Captura de citas y solicitudes de devolución de llamada",
  "Call summaries": "Resúmenes de llamadas",
  "CRM writeback": "Registro en el CRM",
  "Owner notifications": "Notificaciones al propietario",
};

function translate(text: string, language: SiteLanguage) {
  if (language === "en") return text;

  const translated = spanishByEnglish[text];
  if (translated === undefined) {
    throw new Error(`Missing Spanish pricing translation: ${text}`);
  }

  return translated;
}

type PricingPageProps = {
  searchParams: Promise<{ lang?: string }>;
};

export default async function PricingPage({ searchParams }: PricingPageProps) {
  const params = await searchParams;
  const language = await getSiteLanguage(params.lang);
  const t = (text: string) => translate(text, language);
  const planPaymentLinks = getAtlasPlanPaymentLinks();
  const sprintCheckoutUrl = getAtlasSprintPaymentLink();

  return (
    <>
      <SiteHeader active="pricing" />
      <main className="bg-[#061631] text-white">
        <div className="bg-[#f4f7fb] px-6 pt-8 text-[#071b42] sm:px-7 sm:pt-10">
          <div className="mx-auto w-full max-w-[84rem]">
            {language === "es" ? (
              <SpanishSprintOffer checkoutUrl={sprintCheckoutUrl} language={language} />
            ) : (
              <AtlasSprintOffer checkoutUrl={sprintCheckoutUrl} />
            )}
          </div>
        </div>
        <section className="relative isolate overflow-hidden">
          <div className="absolute inset-0 -z-20 bg-[linear-gradient(rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.04)_1px,transparent_1px)] bg-[size:48px_48px]" />
          <div className="absolute -left-44 top-24 -z-10 h-[32rem] w-[32rem] rounded-full bg-[#1246a0]/30 blur-[130px]" />
          <div className="absolute -right-44 bottom-0 -z-10 h-[28rem] w-[28rem] rounded-full bg-[#f5b932]/14 blur-[130px]" />

          <div className="mx-auto grid w-full max-w-[84rem] gap-10 px-6 py-16 sm:px-7 sm:py-20 lg:grid-cols-[1.02fr_0.98fr] lg:items-end lg:py-24">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.24em] text-[#ffd068]">
                {t("Pricing")}
              </p>
              <h1 className="mt-5 max-w-4xl text-5xl font-black leading-[0.94] tracking-[-0.055em] sm:text-6xl lg:text-[4.9rem]">
                <span className="block">{t("Find more prospects.")}</span>
                <span className="mt-2 block text-[#ffd068]">{t("Follow up faster.")}</span>
                <span className="mt-2 block">{t("Close more deals.")}</span>
              </h1>
              <p className="mt-7 max-w-2xl text-lg leading-8 text-blue-100/80 sm:text-xl sm:leading-9">
                {t("Start with the tools your business needs today. Add more automation as you grow.")}
              </p>
              <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                <Link
                  className="inline-flex items-center justify-center rounded-full bg-[#f5b932] px-7 py-4 text-sm font-black !text-[#071b42] shadow-[0_14px_34px_rgba(245,185,50,0.24)] transition hover:-translate-y-0.5 hover:bg-[#ffd064] hover:!text-[#071b42]"
                  href={withSiteLanguage("/pricing#plans", language)}
                >
                  {t("Choose My Atlas Plan")}
                  <span aria-hidden="true" className="ml-2 text-lg leading-none">
                    &rarr;
                  </span>
                </Link>
                <Link
                  className="inline-flex items-center justify-center rounded-full border border-white/20 bg-white/[0.05] px-7 py-4 text-sm font-black text-white transition hover:-translate-y-0.5 hover:bg-white/10"
                  href={withSiteLanguage("/assessment", language)}
                >
                  {t("Start Your Business Assessment")}
                </Link>
                <Link
                  className="inline-flex items-center justify-center rounded-full border border-[#f5b932] bg-transparent px-7 py-4 text-sm font-black text-[#ffd068] transition hover:-translate-y-0.5 hover:bg-[#f5b932]/10"
                  href={withSiteLanguage("/start-trial", language)}
                >
                  {t("Start 7-day free trial")}
                </Link>
              </div>
              <p className="mt-4 text-sm font-semibold text-blue-100/75">
                {t("No card required. Your seven-day trial starts after the enrollment step is completed.")}
              </p>
              <div className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-xs font-semibold text-blue-100/70">
                <span>{t("Monthly usage allowance included")}</span>
                <span>{t("Human approval before external action")}</span>
                <span>{t("Three monthly plans for different stages of growth")}</span>
              </div>
            </div>

            <div className="relative mx-auto flex w-full max-w-md items-end justify-center lg:max-w-none">
              <div className="absolute bottom-6 h-44 w-44 rounded-full bg-[#f5b932]/20 blur-3xl" />
              <Image
                alt={t("Atlas lion carrying the world")}
                className="relative h-auto w-full max-w-[28rem] object-contain drop-shadow-[0_28px_40px_rgba(0,0,0,0.35)]"
                height={1008}
                priority
                src="/atlas-holding-globe-tight.png"
                width={799}
              />
            </div>
          </div>
        </section>

        <section className="border-t border-white/10 bg-[#f4f7fb] text-[#071b42]">
          <div className="mx-auto w-full max-w-[84rem] px-6 py-20 sm:px-7 sm:py-24">
            <div className="grid gap-5 lg:grid-cols-3" id="plans">
              {atlasPricingPlans.map((plan) => (
                <article
                  className={`relative overflow-hidden rounded-[1.9rem] border p-7 shadow-[0_18px_48px_rgba(15,23,42,0.06)] transition hover:-translate-y-1 ${
                    plan.featured
                      ? "border-[#f0c24a] bg-[#fffdf5] lg:scale-[1.02]"
                      : "border-[#dce5f1] bg-white"
                  }`}
                  key={plan.slug}
                >
                  {plan.featured ? (
                    <span className="absolute right-5 top-5 rounded-full bg-[#f5b932] px-3 py-1 text-xs font-black uppercase tracking-[0.18em] text-[#071b42]">
                      {t("Most popular")}
                    </span>
                  ) : null}
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-[#1246a0]">
                    {t(plan.name)}
                  </p>
                  <div className="mt-4 flex items-end gap-2">
                    <p className="text-5xl font-black tracking-[-0.06em]">
                      {money.format(plan.monthlyPrice)}
                    </p>
                    <p className="pb-2 text-sm font-semibold text-slate-500">{t("/month")}</p>
                  </div>
                  <p className="mt-4 text-sm font-semibold text-[#16325c]">
                    {t(plan.bestFor)}
                  </p>
                  <div className="mt-5 rounded-2xl border border-[#dce5f1] bg-[#f8fbff] px-4 py-3 text-xs font-semibold uppercase tracking-[0.12em] text-[#527096]">
                    {t(plan.usageAllowance)}
                  </div>
                  <ul className="mt-6 space-y-3 text-sm leading-6 text-slate-700">
                    {plan.features.map((feature) => (
                      <li className="flex gap-3" key={feature}>
                        <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[#f5b932]" />
                        <span>{t(feature)}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="mt-6 border-t border-[#e7edf6] pt-5">
                    <p className="text-xs font-black uppercase tracking-[0.18em] text-[#527096]">
                      {t("Future capacity")}
                    </p>
                    <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-600">
                      {plan.futureFeatures.map((item) => (
                        <li key={item}>- {t(item)}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="mt-7 flex items-center justify-between gap-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                      {plan.availability === "available"
                        ? t("Available now")
                        : plan.availability === "launch_offer"
                          ? t("Launch offer")
                          : t("Coming soon")}
                    </p>
                    <Link
                      className={`rounded-full px-4 py-2.5 text-sm font-black transition ${
                        plan.featured
                          ? "bg-[#071b42] !text-white hover:bg-[#0a2f78] hover:!text-white"
                          : "bg-[#f5b932] !text-[#071b42] hover:bg-[#ffd064] hover:!text-[#071b42]"
                      }`}
                      href={
                        planPaymentLinks[plan.slug] ??
                        withSiteLanguage(`/assessment?plan=${plan.slug}`, language)
                      }
                      rel={planPaymentLinks[plan.slug] ? "noreferrer" : undefined}
                      target={planPaymentLinks[plan.slug] ? "_blank" : undefined}
                    >
                      {planPaymentLinks[plan.slug]
                        ? t(plan.cta)
                        : `${t("Review")} ${t(plan.name)}`}
                    </Link>
                  </div>
                </article>
              ))}
            </div>

            <section className="mt-8 rounded-[1.8rem] border border-[#d9e4f4] bg-white p-5 shadow-[0_16px_42px_rgba(15,23,42,0.05)] sm:p-6">
              <div className="border-b border-[#e5edf7] pb-5">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-[#1246a0]">
                    {t("Plan comparison")}
                  </p>
                  <h2 className="mt-3 text-2xl font-black tracking-[-0.04em] text-[#071b42] sm:text-3xl">
                    {t("What each Atlas plan includes")}
                  </h2>
                </div>
              </div>

              <div className="mt-5 overflow-x-auto">
                <table className="min-w-[760px] w-full border-separate border-spacing-0 text-left">
                  <caption className="sr-only">
                    {t("Atlas pricing comparison between Basic, Grow, and Unlimited.")}
                  </caption>
                  <thead>
                    <tr className="text-xs uppercase tracking-[0.16em] text-slate-500">
                      <th className="border-b border-[#e5edf7] px-4 py-3 font-black">
                        {t("Plan")}
                      </th>
                      <th className="border-b border-[#e5edf7] px-4 py-3 text-right font-black">
                        {t("ATLAS BASIC")}
                      </th>
                      <th className="border-b border-[#e5edf7] px-4 py-3 text-right font-black">
                        {t("ATLAS GROW")}
                      </th>
                      <th className="border-b border-[#e5edf7] px-4 py-3 text-right font-black">
                        {t("ATLAS UNLIMITED")}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {atlasPricingComparisonRows.map((row, index) => (
                      <tr
                        className={index % 2 === 0 ? "bg-[#f8fbff]" : "bg-white"}
                        key={row.label}
                      >
                        <th className="border-b border-[#edf2f8] px-4 py-4 text-sm font-semibold text-[#16325c]">
                          {t(row.label)}
                        </th>
                        <td className="border-b border-[#edf2f8] px-4 py-4 text-right text-sm font-semibold text-slate-700">
                          {t(row.basic)}
                        </td>
                        <td className="border-b border-[#edf2f8] px-4 py-4 text-right text-sm font-semibold text-slate-700">
                          {t(row.grow)}
                        </td>
                        <td className="border-b border-[#edf2f8] px-4 py-4 text-right text-sm font-semibold text-slate-700">
                          {t(row.unlimited)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <p className="mt-8 text-center text-sm font-semibold text-slate-500">
              {t("The sprint is the focused one-time starting offer. Monthly Atlas plans are optional continuation plans after the sprint.")}
            </p>
          </div>
        </section>

        <section className="bg-[#f4f7fb] text-[#071b42]">
          <div className="mx-auto grid w-full max-w-[84rem] gap-10 px-6 py-20 sm:px-7 sm:py-24 lg:grid-cols-[0.9fr_1.1fr]">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-[#1246a0]">
                {t("What Atlas replaces or simplifies")}
              </p>
              <h2 className="mt-4 text-4xl font-black tracking-[-0.05em] sm:text-5xl">
                {t("Fewer disconnected tools. More coordinated work.")}
              </h2>
              <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-600">
                {t("Atlas reduces the need to bounce between disconnected prospecting, CRM, content, follow-up, and AI tools. It does not claim to fully replace HubSpot, GoHighLevel, ChatGPT, Canva, staff, or any other platform.")}
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {[
                "Lead discovery and sales organization in one flow",
                "Follow-up and next-step visibility without scattered notes",
                "Content drafts tied to the business goal instead of random posting",
                "Owner visibility without a pile of disconnected dashboards",
              ].map((item) => (
                <article
                  className="rounded-[1.6rem] border border-[#dce5f1] bg-white p-5"
                  key={item}
                >
                  <span className="block h-2 w-10 rounded-full bg-[#f5b932]" />
                  <p className="mt-5 text-sm leading-7 text-slate-600">{t(item)}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-white text-[#071b42]">
          <div className="mx-auto w-full max-w-[84rem] px-6 py-20 sm:px-7 sm:py-24">
            <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-[#1246a0]">
                  {t("Responsible automation")}
                </p>
                <h2 className="mt-4 text-4xl font-black tracking-[-0.05em] sm:text-5xl">
                  {t("Assist and coordinate. Do not surprise the owner.")}
                </h2>
                <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-600">
                  {t("Atlas is built to stay supervised. Critical outreach, public actions, and other sensitive steps remain approval-controlled where the current product requires it.")}
                </p>
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                {[
                  [
                    "Approval gates",
                    "Sensitive actions stay in human review until the workflow is explicitly approved.",
                  ],
                  [
                    "Clear scope",
                    "Atlas coordinates the work but does not pretend to be fully autonomous.",
                  ],
                  [
                    "Business control",
                    "The owner keeps the final say on outreach, pricing changes, and public action.",
                  ],
                ].map(([title, text]) => (
                  <article
                    className="rounded-[1.6rem] border border-[#dce5f1] bg-[#f7f9fc] p-5"
                    key={title}
                  >
                    <p className="text-xs font-black uppercase tracking-[0.18em] text-[#1246a0]">
                      {t(title)}
                    </p>
                    <p className="mt-4 text-sm leading-7 text-slate-600">{t(text)}</p>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="bg-[#0b2553] text-white">
          <div className="mx-auto grid w-full max-w-[84rem] gap-8 px-6 py-20 sm:px-7 sm:py-24 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-[#ffd068]">
                {t("Coming soon")}
              </p>
              <h2 className="mt-4 text-4xl font-black tracking-[-0.05em] sm:text-5xl">
                {t("ATLAS FRONT DESK is the future phone layer.")}
              </h2>
              <p className="mt-5 max-w-2xl text-lg leading-8 text-blue-100/80">
                {t("Target future price:")} {t(atlasPhoneAiAddOn.targetPrice)}. {t("This is not live in the current product.")}
              </p>
            </div>
            <div className="rounded-[1.8rem] border border-white/10 bg-white/[0.05] p-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-[#ffd068]">
                  {t(atlasPhoneAiAddOn.label)}
                </p>
                <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.1em] text-blue-100">
                  {t("Not operational")}
                </span>
              </div>
              <h3 className="mt-4 text-2xl font-black tracking-[-0.04em]">
                {t(atlasPhoneAiAddOn.name)}
              </h3>
              <p className="mt-4 text-sm leading-7 text-blue-100/80">
                {t(atlasPhoneAiAddOn.summary)}
              </p>
              <ul className="mt-5 grid gap-2 text-sm leading-6 text-blue-100/80 sm:grid-cols-2">
                {atlasPhoneAiAddOn.futureFeatures.map((item) => (
                  <li key={item}>- {t(item)}</li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        <section className="bg-[#f4f7fb] text-[#071b42]">
          <div className="mx-auto w-full max-w-[84rem] px-6 py-20 sm:px-7 sm:py-24">
            <div className="text-center">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-[#1246a0]">
                {t("FAQ")}
              </p>
              <h2 className="mt-4 text-4xl font-black tracking-[-0.05em] sm:text-5xl">
                {t("Straight answers before you start.")}
              </h2>
            </div>

            <div className="mt-12 divide-y divide-[#dce5f1] rounded-[1.8rem] border border-[#dce5f1] bg-white">
              {atlasPricingFaqs.map((faq) => (
                <details className="group px-6 py-5" key={faq.question}>
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-6 text-left text-lg font-black text-[#071b42]">
                    {t(faq.question)}
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[#c8d6e8] text-lg font-medium text-[#1246a0] transition group-open:rotate-45">
                      +
                    </span>
                  </summary>
                  <p className="max-w-3xl pt-4 text-sm leading-7 text-slate-600">
                    {t(faq.answer)}
                  </p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section className="relative overflow-hidden bg-[#061631] text-white">
          <div className="absolute inset-0 bg-[linear-gradient(120deg,transparent_45%,rgba(255,255,255,0.06)_45%,rgba(255,255,255,0.06)_55%,transparent_55%)]" />
          <div className="relative mx-auto grid w-full max-w-[84rem] gap-10 px-6 py-20 sm:px-7 sm:py-24 lg:grid-cols-[1fr_auto] lg:items-center">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-[#ffd068]">
                {t("Next move")}
              </p>
              <h2 className="mt-4 max-w-4xl text-4xl font-black leading-[1.02] tracking-[-0.045em] sm:text-6xl">
                {t("Choose the plan that matches your growth stage.")}
              </h2>
              <p className="mt-6 max-w-2xl text-lg leading-8 text-blue-100/80">
                {t("If you want help deciding, start with the business assessment. Atlas can guide the fit conversation without fabricating pricing or promises.")}
              </p>
            </div>
            <div className="text-center lg:text-right">
              <Link
                className="inline-flex items-center justify-center rounded-full bg-[#f5b932] px-7 py-4 text-sm font-black !text-[#071b42] shadow-[0_14px_34px_rgba(245,185,50,0.24)] transition hover:-translate-y-0.5 hover:bg-[#ffd064] hover:!text-[#071b42]"
                href={withSiteLanguage("/assessment", language)}
              >
                {t("Start Your Business Assessment")}
              </Link>
              <p className="mt-4 text-xs font-semibold text-blue-100/70">
                {t("No automatic subscription. No unsupported feature claims.")}
              </p>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}

function SpanishSprintOffer({
  checkoutUrl,
  language,
}: {
  checkoutUrl: string | null;
  language: SiteLanguage;
}) {
  const t = (text: string) => translate(text, language);

  return (
    <section
      aria-labelledby="atlas-sprint-title"
      className="rounded-[1.8rem] border border-[#f0c24a] bg-[#fffdf5] p-6 text-[#071b42] shadow-[0_16px_42px_rgba(15,23,42,0.05)] sm:p-8"
      id="sprint"
    >
      <div className="grid gap-8 lg:grid-cols-[1.1fr_.9fr] lg:items-start">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-[#1246a0]">
            {t("Founding offer")}
          </p>
          <h2
            className="mt-3 max-w-3xl text-3xl font-black tracking-[-0.05em] sm:text-4xl"
            id="atlas-sprint-title"
          >
            {t(atlasSprintOffer.name)}
          </h2>
          <p className="mt-4 max-w-2xl text-lg leading-8 text-slate-700">
            {t(atlasSprintOffer.summary)}
          </p>
          <p className="mt-5 text-3xl font-black tracking-[-0.04em]">
            ${atlasSprintOffer.price.toLocaleString("en-US")} {" "}
            <span className="text-base font-semibold text-slate-600">
              {t("one time · no automatic renewal")}
            </span>
          </p>
        </div>

        <div className="rounded-2xl border border-[#eadb9d] bg-white/80 p-5">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-[#527096]">
            {t("What you get")}
          </p>
          <ul className="mt-4 space-y-2 text-sm leading-6 text-slate-700">
            {atlasSprintOffer.includes.map((item) => (
              <li className="flex gap-3" key={item}>
                <span
                  aria-hidden="true"
                  className="mt-2 h-2 w-2 shrink-0 rounded-full bg-[#f5b932]"
                />
                <span>{t(item)}</span>
              </li>
            ))}
          </ul>
          <p className="mt-6 text-xs font-black uppercase tracking-[0.16em] text-[#527096]">
            {t("Not included")}
          </p>
          <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-600">
            {atlasSprintOffer.notIncluded.map((item) => (
              <li key={item}>- {t(item)}</li>
            ))}
          </ul>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
            {checkoutUrl ? (
              <a
                className="inline-flex items-center justify-center rounded-full bg-[#f5b932] px-6 py-3 text-sm font-black text-[#071b42] transition hover:bg-[#ffd064]"
                href={checkoutUrl}
                rel="noreferrer"
                target="_blank"
              >
                {t("Start My 30-Day Sprint")}
              </a>
            ) : (
              <Link
                className="inline-flex items-center justify-center rounded-full bg-[#1246a0] px-6 py-3 text-sm font-black text-white transition hover:bg-[#0a2f78]"
                href={withSiteLanguage("/assessment", language)}
              >
                {t("Review the sprint with Atlas")}
              </Link>
            )}
            <p className="text-xs leading-5 text-slate-600">
              {checkoutUrl
                ? t("Secure Stripe-hosted checkout. No card details are collected on this site.")
                : t("Checkout is not configured in this local environment yet.")}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
