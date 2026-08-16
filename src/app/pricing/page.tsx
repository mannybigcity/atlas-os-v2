import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import {
  atlasFoundingBusinessOffer,
  atlasPhoneAiAddOn,
  atlasPricingComparisonRows,
  atlasPricingFaqs,
  atlasPricingPlans,
} from "@/lib/pricing";
import { normalizeSiteLanguage, withSiteLanguage } from "@/lib/site-language";

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

const pricingSpanish: Record<string, string> = {
  "Sensitive actions stay in human review until the workflow is explicitly approved.": "Las acciones sensibles permanecen bajo revisión humana hasta que se apruebe explícitamente el flujo.", "Atlas coordinates the work but does not pretend to be fully autonomous.": "Atlas coordina el trabajo, pero no pretende ser completamente autónomo.", "The owner keeps the final say on outreach, pricing changes, and public action.": "El dueño conserva la decisión final sobre contactos, cambios de precios y acciones públicas.", "Can I change plans later?": "¿Puedo cambiar de plan después?", "Yes. The plans are designed as a progression, so you can move up when your workflow and usage justify it.": "Sí. Los planes están diseñados como una progresión, así que puedes subir cuando tu flujo de trabajo y uso lo justifiquen.", "Does Atlas automatically contact prospects?": "¿Atlas contacta prospectos automáticamente?", "No. Critical outreach and other external actions stay approval-controlled unless the current product explicitly says otherwise.": "No. Los contactos críticos y otras acciones externas permanecen bajo aprobación salvo que el producto actual indique lo contrario.", "Is Atlas a CRM?": "¿Atlas es un CRM?", "Atlas includes CRM-style prospect tracking, but the product is broader than a traditional CRM. It coordinates lead discovery, follow-up, content, and owner visibility around a business goal.": "Atlas incluye seguimiento de prospectos estilo CRM, pero el producto es más amplio que un CRM tradicional. Coordina descubrimiento, seguimiento, contenido y visibilidad del dueño alrededor de una meta.", "Does Atlas generate social content?": "¿Atlas genera contenido para redes?", "Yes, Atlas includes content drafting support through MICAH. Drafts still need human review before anything goes live.": "Sí, Atlas incluye apoyo para redactar contenido mediante MICAH. Los borradores aún necesitan revisión humana antes de publicarse.", "Does Atlas replace my employees?": "¿Atlas reemplaza a mis empleados?", "No. Atlas is meant to coordinate work, reduce missed steps, and help your team move faster with clearer priorities.": "No. Atlas coordina el trabajo, reduce pasos perdidos y ayuda a tu equipo a avanzar más rápido con prioridades claras.", "What counts toward AI or prospect-search usage?": "¿Qué cuenta para el uso de IA o búsqueda de prospectos?", "Usage is tracked against the AI and discovery work the system performs. The product includes allowances, not unlimited usage.": "El uso se mide según el trabajo de IA y descubrimiento que realiza el sistema. El producto incluye límites, no uso ilimitado.", "Can my team use Atlas?": "¿Puede mi equipo usar Atlas?", "Yes. ATLAS COMMAND is the clearest fit for teams, and the product is designed to expand with organization needs.": "Sí. ATLAS COMMAND es la opción más clara para equipos y el producto está diseñado para crecer con las necesidades de la organización.", "Is Phone AI included?": "¿Phone AI está incluido?", "Not yet. ATLAS FRONT DESK is coming soon as a separate future add-on, and it is not operational in this release.": "Todavía no. ATLAS FRONT DESK llegará como complemento futuro separado y no está operativo en esta versión.", "Is there a long-term contract?": "¿Hay un contrato a largo plazo?", "The pricing page does not introduce a billing contract. Any paid engagement should be confirmed before purchase or onboarding.": "La página de precios no introduce un contrato de facturación. Cualquier servicio pagado debe confirmarse antes de comprar o comenzar.",
};

Object.assign(pricingSpanish, {
  "Solo owners / very small businesses": "Dueños solos / negocios muy pequeños", "Growing local businesses": "Negocios locales en crecimiento", "Established teams": "Equipos establecidos", "Monthly usage allowance": "Uso mensual incluido", "Larger monthly usage allowance": "Mayor uso mensual incluido", "Largest monthly usage allowance": "Mayor nivel de uso mensual", "Choose START": "Elegir START", "Choose GROW": "Elegir GROW", "Choose COMMAND": "Elegir COMMAND", "Future capacity": "Capacidad futura", "Expanded automation as the workflow matures": "Automatización ampliada a medida que madure el flujo", "Higher usage capacity as the business grows": "Mayor capacidad a medida que crece el negocio", "Everything in START": "Todo lo de START", "Everything in GROW": "Todo lo de GROW", "Basic HUNTER prospect discovery": "Descubrimiento básico de prospectos con HUNTER", "Basic MICAH content studio": "Estudio básico de contenido MICAH", "Basic DAVID follow-up desk": "Centro básico de seguimiento DAVID", "Business assessment": "Evaluación del negocio", "Opportunity tracking": "Seguimiento de oportunidades", "Activity / attention center": "Centro de actividad y atención", "Monthly AI allowance": "Uso mensual de IA", "Standard support": "Soporte estándar", "Expanded HUNTER prospect discovery": "Descubrimiento ampliado de prospectos con HUNTER", "Full Sales Command workflow": "Flujo completo de Sales Command", "Stronger follow-up capability": "Seguimiento más sólido", "Full MICAH content studio": "Estudio completo de contenido MICAH", "Growth reporting": "Reportes de crecimiento", "Expanded workflows and integrations": "Flujos e integraciones ampliados", "Priority support": "Soporte prioritario", "Higher usage limits": "Límites de uso mayores", "Multi-user team support": "Soporte para equipos multiusuario", "Executive reporting": "Reportes ejecutivos", "Advanced workflows": "Flujos avanzados", "Priority onboarding": "Incorporación prioritaria", "Future automation privileges": "Acceso a automatización futura", "Preferred pricing and allowance for ATLAS Phone AI": "Precio y uso preferente para ATLAS Phone AI", "Priority onboarding for the next phase": "Incorporación prioritaria para la siguiente etapa", "More specialized automation as usage proves the need": "Automatización más especializada cuando el uso demuestre la necesidad", "Preferred access to future voice and receptionist tooling": "Acceso preferente a futuras herramientas de voz y recepción", "More advanced automation privileges as systems mature": "Privilegios de automatización más avanzados a medida que maduren los sistemas", "Suggested price": "Precio sugerido", "Best for": "Ideal para", Users: "Usuarios", "Customer relationship management (CRM)": "Gestión de relaciones con clientes (CRM)", "Lead generation": "Generación de prospectos", "Social media content": "Contenido para redes sociales", "AI business assistant": "Asistente de negocios con IA", "Activity and follow-up center": "Centro de actividad y seguimiento", "AI usage": "Uso de IA", Reporting: "Reportes", Integrations: "Integraciones", Support: "Soporte", "Future ATLAS Phone AI": "ATLAS Phone AI futuro", Included: "Incluido", Limited: "Limitado", Expanded: "Ampliado", "High-volume": "Alto volumen", Basic: "Básico", Full: "Completo", "Full + advanced workflows": "Completo + flujos avanzados", "Monthly allowance": "Uso mensual", "Larger allowance": "Mayor uso", "Largest allowance": "Mayor uso", Core: "Esenciales", Priority: "Prioritario", Standard: "Estándar", "Priority + onboarding": "Prioritario + incorporación", "Add-on": "Complemento", "Included allowance / discounted": "Uso incluido / con descuento", "FOUNDING BUSINESS": "NEGOCIO FUNDADOR", "$149/month for 12 months for the first 10 qualified pilot businesses.": "$149 al mes durante 12 meses para los primeros 10 negocios piloto calificados.", "Limited pilot": "Piloto limitado", "12 months": "12 meses", "First 10 qualified pilot businesses": "Primeros 10 negocios piloto calificados", "Fewer disconnected tools. More coordinated work.": "Menos herramientas desconectadas. Trabajo más coordinado.", "Lead discovery and sales organization in one flow": "Descubrimiento de prospectos y organización de ventas en un solo flujo", "Follow-up and next-step visibility without scattered notes": "Visibilidad del seguimiento y próximos pasos sin notas dispersas", "Content drafts tied to the business goal instead of random posting": "Borradores de contenido ligados a la meta del negocio", "Owner visibility without a pile of disconnected dashboards": "Visibilidad para el dueño sin una pila de paneles desconectados", "Assist and coordinate. Do not surprise the owner.": "Ayuda y coordina. No sorprendas al dueño.", "Approval gates": "Puertas de aprobación", "Clear scope": "Alcance claro", "Business control": "Control del negocio", "Responsible automation": "Automatización responsable", "ATLAS FRONT DESK is the future phone layer.": "ATLAS FRONT DESK es la futura capa telefónica.", "AI receptionist and inbound call handling for lead capture, callback capture, call summaries, and CRM writeback.": "Recepción con IA y manejo de llamadas entrantes para capturar prospectos, devoluciones, resúmenes y registro en el CRM.", "Not operational": "No operativo", "AI receptionist": "Recepción con IA", "Inbound call handling": "Manejo de llamadas entrantes", "Lead capture": "Captura de prospectos", "Appointment and callback capture": "Captura de citas y devoluciones", "Call summaries": "Resúmenes de llamadas", "CRM writeback": "Registro en CRM", "Owner notifications": "Notificaciones al dueño", "Straight answers before you start.": "Respuestas claras antes de comenzar.", "Choose the plan that matches your growth stage.": "Elige el plan que corresponde a tu etapa de crecimiento.", "If you want help deciding, start with the business assessment. Amanda and the sales workflow can guide the fit conversation without fabricating pricing or promises.": "Si quieres ayuda para decidir, comienza con la evaluación del negocio. Amanda y el flujo de ventas pueden guiar la conversación sin inventar precios ni promesas.", "No automatic subscription. No unsupported feature claims.": "Sin suscripción automática. Sin afirmaciones no comprobadas.",
});

export default async function PricingPage({ searchParams }: { searchParams: Promise<{ lang?: string }> }) {
  const language = normalizeSiteLanguage((await searchParams).lang);
  const spanish = language === "es";
  const t = (english: string, spanishText: string) => (spanish ? spanishText : english);
  const pt = (value: string) => (spanish ? pricingSpanish[value] ?? value : value);
  return (
    <>
      <SiteHeader active="pricing" language={language} />
      <main className="bg-[#061631] text-white">
        <section className="relative isolate overflow-hidden">
          <div className="absolute inset-0 -z-20 bg-[linear-gradient(rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.04)_1px,transparent_1px)] bg-[size:48px_48px]" />
          <div className="absolute -left-44 top-24 -z-10 h-[32rem] w-[32rem] rounded-full bg-[#1246a0]/30 blur-[130px]" />
          <div className="absolute -right-44 bottom-0 -z-10 h-[28rem] w-[28rem] rounded-full bg-[#f5b932]/14 blur-[130px]" />

          <div className="mx-auto grid w-full max-w-[84rem] gap-10 px-6 py-16 sm:px-7 sm:py-20 lg:grid-cols-[1.02fr_0.98fr] lg:items-end lg:py-24">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.24em] text-[#ffd068]">
                {t("Pricing", "Precios")}
              </p>
              <h1 className="mt-5 max-w-4xl text-5xl font-black leading-[0.94] tracking-[-0.055em] sm:text-6xl lg:text-[4.9rem]">
                <span className="block">{t("Find more prospects.", "Encuentra más prospectos.")}</span>
                <span className="mt-2 block text-[#ffd068]">{t("Follow up faster.", "Da seguimiento más rápido.")}</span>
                <span className="mt-2 block">{t("Close more deals.", "Cierra más ventas.")}</span>
              </h1>
              <p className="mt-7 max-w-2xl text-lg leading-8 text-blue-100/80 sm:text-xl sm:leading-9">
                {t("Start with the tools your business needs today. Add more automation as you grow.", "Comienza con las herramientas que tu negocio necesita hoy. Agrega más automatización al crecer.")}
              </p>
              <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                <Link
                  className="inline-flex items-center justify-center rounded-full bg-[#f5b932] px-7 py-4 text-sm font-black !text-[#071b42] shadow-[0_14px_34px_rgba(245,185,50,0.24)] transition hover:-translate-y-0.5 hover:bg-[#ffd064] hover:!text-[#071b42]"
                  href={withSiteLanguage("/atlas-preview", language)}
                >
                  {t("See ATLAS in Action", "Ver ATLAS en acción")}
                  <span aria-hidden="true" className="ml-2 text-lg leading-none">
                    &rarr;
                  </span>
                </Link>
                <Link
                  className="inline-flex items-center justify-center rounded-full border border-white/20 bg-white/[0.05] px-7 py-4 text-sm font-black text-white transition hover:-translate-y-0.5 hover:bg-white/10"
                  href={withSiteLanguage("/assessment", language)}
                >
                  {t("Start Your Business Assessment", "Comenzar evaluación del negocio")}
                </Link>
              </div>
              <div className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-xs font-semibold text-blue-100/70">
                <span>{t("Monthly usage allowance included", "Incluye uso mensual")}</span>
                <span>{t("Human approval before external action", "Aprobación humana antes de acciones externas")}</span>
                <span>{t("Founding business launch offer available by review", "Oferta inicial disponible mediante revisión")}</span>
              </div>
            </div>

            <div className="relative mx-auto flex w-full max-w-md items-end justify-center lg:max-w-none">
              <div className="absolute bottom-6 h-44 w-44 rounded-full bg-[#f5b932]/20 blur-3xl" />
              <Image
                alt="Atlas lion carrying the world"
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
            <div className="grid gap-5 lg:grid-cols-3">
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
                      {t("Most popular", "Más popular")}
                    </span>
                  ) : null}
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-[#1246a0]">
                    {plan.name}
                  </p>
                  <div className="mt-4 flex items-end gap-2">
                    <p className="text-5xl font-black tracking-[-0.06em]">
                      {money.format(plan.monthlyPrice)}
                    </p>
                    <p className="pb-2 text-sm font-semibold text-slate-500">{spanish ? "/mes" : "/month"}</p>
                  </div>
                  <p className="mt-4 text-sm font-semibold text-[#16325c]">
                    {pt(plan.bestFor)}
                  </p>
                  <div className="mt-5 rounded-2xl border border-[#dce5f1] bg-[#f8fbff] px-4 py-3 text-xs font-semibold uppercase tracking-[0.12em] text-[#527096]">
                    {pt(plan.usageAllowance)}
                  </div>
                  <ul className="mt-6 space-y-3 text-sm leading-6 text-slate-700">
                    {plan.features.map((feature) => (
                      <li className="flex gap-3" key={feature}>
                        <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[#f5b932]" />
                        <span>{pt(feature)}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="mt-6 border-t border-[#e7edf6] pt-5">
                    <p className="text-xs font-black uppercase tracking-[0.18em] text-[#527096]">
                      {t("Future capacity", "Capacidad futura")}
                    </p>
                    <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-600">
                      {plan.futureFeatures.map((item) => (
                        <li key={item}>- {pt(item)}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="mt-7 flex items-center justify-between gap-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                      {plan.availability === "available"
                        ? t("Available now", "Disponible ahora")
                        : plan.availability === "launch_offer"
                          ? t("Launch offer", "Oferta inicial")
                          : t("Coming soon", "Próximamente")}
                    </p>
                    <Link
                      className={`rounded-full px-4 py-2.5 text-sm font-black transition ${
                        plan.featured
                          ? "bg-[#071b42] !text-white hover:bg-[#0a2f78] hover:!text-white"
                          : "bg-[#f5b932] !text-[#071b42] hover:bg-[#ffd064] hover:!text-[#071b42]"
                      }`}
                      href={withSiteLanguage("/assessment", language)}
                    >
                      {pt(plan.cta)}
                    </Link>
                  </div>
                </article>
              ))}
            </div>

            <section className="mt-8 rounded-[1.8rem] border border-[#d9e4f4] bg-white p-5 shadow-[0_16px_42px_rgba(15,23,42,0.05)] sm:p-6">
              <div className="border-b border-[#e5edf7] pb-5">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-[#1246a0]">
                    {t("Plan comparison", "Comparación de planes")}
                  </p>
                  <h2 className="mt-3 text-2xl font-black tracking-[-0.04em] text-[#071b42] sm:text-3xl">
                    {t("What each Atlas plan includes", "Qué incluye cada plan de Atlas")}
                  </h2>
                </div>
              </div>

              <div className="mt-5 overflow-x-auto">
                <table className="min-w-[760px] w-full border-separate border-spacing-0 text-left">
                    <caption className="sr-only">
                    {t("Atlas pricing comparison between Start, Grow, and Command.", "Comparación de precios de Atlas entre Start, Grow y Command.")}
                  </caption>
                  <thead>
                    <tr className="text-xs uppercase tracking-[0.16em] text-slate-500">
                      <th className="border-b border-[#e5edf7] px-4 py-3 font-black">
                        {t("Plan", "Plan")}
                      </th>
                      <th className="border-b border-[#e5edf7] px-4 py-3 text-right font-black">
                        ATLAS START
                      </th>
                      <th className="border-b border-[#e5edf7] px-4 py-3 text-right font-black">
                        ATLAS GROW
                      </th>
                      <th className="border-b border-[#e5edf7] px-4 py-3 text-right font-black">
                        ATLAS COMMAND
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
                          {pt(row.label)}
                        </th>
                        <td className="border-b border-[#edf2f8] px-4 py-4 text-right text-sm font-semibold text-slate-700">
                          {pt(row.start)}
                        </td>
                        <td className="border-b border-[#edf2f8] px-4 py-4 text-right text-sm font-semibold text-slate-700">
                          {pt(row.grow)}
                        </td>
                        <td className="border-b border-[#edf2f8] px-4 py-4 text-right text-sm font-semibold text-slate-700">
                          {pt(row.command)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <div className="mt-8 rounded-[1.8rem] border border-[#d9e4f4] bg-white p-6 shadow-[0_16px_42px_rgba(15,23,42,0.05)]">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-[#1246a0]">
                    {t("Launch offer", "Oferta inicial")}
                  </p>
                  <h2 className="mt-3 text-3xl font-black tracking-[-0.05em]">
                    {pt(atlasFoundingBusinessOffer.name)}
                  </h2>
                  <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-600">
                    {pt(atlasFoundingBusinessOffer.summary)}
                  </p>
                </div>
                <div className="rounded-2xl border border-[#f0c24a] bg-[#fff8df] px-5 py-4 text-sm text-[#4b3800]">
                  <p className="font-black uppercase tracking-[0.16em]">
                    {t("Limited pilot", "Piloto limitado")}
                  </p>
                  <p className="mt-2 font-semibold">
                    {pt(atlasFoundingBusinessOffer.term)} {t("term", "de plazo")}, {pt(atlasFoundingBusinessOffer.limit)}.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="bg-[#f4f7fb] text-[#071b42]">
          <div className="mx-auto grid w-full max-w-[84rem] gap-10 px-6 py-20 sm:px-7 sm:py-24 lg:grid-cols-[0.9fr_1.1fr]">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.18em] text-[#1246a0]">
                {t("What Atlas replaces or simplifies", "Lo que Atlas reemplaza o simplifica")}
              </p>
              <h2 className="mt-4 text-4xl font-black tracking-[-0.05em] sm:text-5xl">
                {pt("Fewer disconnected tools. More coordinated work.")}
              </h2>
              <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-600">
                {t("Atlas reduces the need to bounce between disconnected prospecting, CRM, content, follow-up, and AI tools. It does not claim to fully replace HubSpot, GoHighLevel, ChatGPT, Canva, staff, or any other platform.", "Atlas reduce la necesidad de saltar entre herramientas desconectadas de prospección, CRM, contenido, seguimiento e IA. No afirma reemplazar por completo HubSpot, GoHighLevel, ChatGPT, Canva, al personal ni ninguna otra plataforma.")}
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
                  <p className="mt-5 text-sm leading-7 text-slate-600">{pt(item)}</p>
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
                  {pt("Responsible automation")}
                </p>
                <h2 className="mt-4 text-4xl font-black tracking-[-0.05em] sm:text-5xl">
                  {pt("Assist and coordinate. Do not surprise the owner.")}
                </h2>
                <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-600">
                  {t("Atlas is built to stay supervised. Critical outreach, public actions, and other sensitive steps remain approval-controlled where the current product requires it.", "Atlas está diseñado para mantenerse supervisado. El contacto crítico, las acciones públicas y otros pasos sensibles permanecen bajo aprobación humana cuando el producto lo requiere.")}
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
                      {pt(title)}
                    </p>
                    <p className="mt-4 text-sm leading-7 text-slate-600">{pt(text)}</p>
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
                {t("Coming soon", "Próximamente")}
              </p>
              <h2 className="mt-4 text-4xl font-black tracking-[-0.05em] sm:text-5xl">
                {pt("ATLAS FRONT DESK is the future phone layer.")}
              </h2>
              <p className="mt-5 max-w-2xl text-lg leading-8 text-blue-100/80">
                {t(`Target future price: ${atlasPhoneAiAddOn.targetPrice}. This is not live in the current product.`, `Precio futuro objetivo: ${atlasPhoneAiAddOn.targetPrice}. Esto no está activo en el producto actual.`)}
              </p>
            </div>
            <div className="rounded-[1.8rem] border border-white/10 bg-white/[0.05] p-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-[#ffd068]">
                  {pt(atlasPhoneAiAddOn.label)}
                </p>
                <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.1em] text-blue-100">
                  {pt("Not operational")}
                </span>
              </div>
              <h3 className="mt-4 text-2xl font-black tracking-[-0.04em]">
                {pt(atlasPhoneAiAddOn.name)}
              </h3>
              <p className="mt-4 text-sm leading-7 text-blue-100/80">
                {pt(atlasPhoneAiAddOn.summary)}
              </p>
              <ul className="mt-5 grid gap-2 text-sm leading-6 text-blue-100/80 sm:grid-cols-2">
                {atlasPhoneAiAddOn.futureFeatures.map((item) => (
                  <li key={item}>- {pt(item)}</li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        <section className="bg-[#f4f7fb] text-[#071b42]">
          <div className="mx-auto w-full max-w-[84rem] px-6 py-20 sm:px-7 sm:py-24">
            <div className="text-center">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-[#1246a0]">
                {t("FAQ", "Preguntas frecuentes")}
              </p>
              <h2 className="mt-4 text-4xl font-black tracking-[-0.05em] sm:text-5xl">
                {pt("Straight answers before you start.")}
              </h2>
            </div>

            <div className="mt-12 divide-y divide-[#dce5f1] rounded-[1.8rem] border border-[#dce5f1] bg-white">
              {atlasPricingFaqs.map((faq) => (
                <details className="group px-6 py-5" key={faq.question}>
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-6 text-left text-lg font-black text-[#071b42]">
                    {pt(faq.question)}
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[#c8d6e8] text-lg font-medium text-[#1246a0] transition group-open:rotate-45">
                      +
                    </span>
                  </summary>
                  <p className="max-w-3xl pt-4 text-sm leading-7 text-slate-600">
                    {pt(faq.answer)}
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
                {t("Next move", "Siguiente paso")}
              </p>
              <h2 className="mt-4 max-w-4xl text-4xl font-black leading-[1.02] tracking-[-0.045em] sm:text-6xl">
                {pt("Choose the plan that matches your growth stage.")}
              </h2>
              <p className="mt-6 max-w-2xl text-lg leading-8 text-blue-100/80">
                {pt("If you want help deciding, start with the business assessment. Amanda and the sales workflow can guide the fit conversation without fabricating pricing or promises.")}
              </p>
            </div>
            <div className="text-center lg:text-right">
              <Link
                className="inline-flex items-center justify-center rounded-full bg-[#f5b932] px-7 py-4 text-sm font-black !text-[#071b42] shadow-[0_14px_34px_rgba(245,185,50,0.24)] transition hover:-translate-y-0.5 hover:bg-[#ffd064] hover:!text-[#071b42]"
                href={withSiteLanguage("/assessment", language)}
              >
                {t("Start Your Business Assessment", "Comenzar evaluación del negocio")}
              </Link>
              <p className="mt-4 text-xs font-semibold text-blue-100/70">
                {pt("No automatic subscription. No unsupported feature claims.")}
              </p>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
