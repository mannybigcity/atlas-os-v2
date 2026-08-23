import type { Metadata } from "next";
import Link from "next/link";
import { AtlasSprintOffer } from "@/components/atlas-sprint-offer";
import { SiteHeader } from "@/components/site-header";
import { BusinessAssessmentForm } from "@/components/business-assessment-form";
import { getAtlasSprintPaymentLink } from "@/lib/payment-links";
import { withSiteLanguage } from "@/lib/site-language";
import { getSiteLanguage } from "@/lib/site-language-server";

export const metadata: Metadata = {
  title: "Business Health Assessment | Atlas",
  description:
    "Learn about the prospect's company, customers, systems, and growth goals before Atlas recommends a starting point.",
};

type PageProps = {
  searchParams: Promise<{ error?: string; status?: string; lang?: string }>;
};

export default async function AssessmentPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const received = params.status === "received";
  const language = await getSiteLanguage(params.lang);
  const spanish = language === "es";
  const t = (english: string, spanishText: string) => (spanish ? spanishText : english);

  return (
    <>
      <SiteHeader active="snapshot" />
      <main className="min-h-screen bg-[#f6f9ff] text-[#071b42]">
        <section className="border-b border-[#dce6f5] bg-white">
          <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:px-6 lg:grid-cols-[1.08fr_.92fr] lg:px-8 lg:py-16">
            <div className="max-w-2xl">
              <p className="text-xs font-bold uppercase tracking-[0.25em] text-[#c48713]">
                {t("Business Health Assessment", "Evaluación de salud del negocio")}
              </p>
              <h1 className="mt-4 text-4xl font-black tracking-[-0.07em] text-[#06266d] sm:text-6xl">
                {t("Tell Atlas about the business.", "Cuéntale a Atlas sobre tu negocio.")}
              </h1>
              <p className="mt-6 text-lg leading-8 text-slate-600">
                {t(
                  "Share the company story, customer flow, and growth goals so Atlas can recommend the right next step.",
                  "Comparte la historia de la empresa, el flujo de clientes y las metas de crecimiento para que Atlas recomiende el siguiente paso correcto.",
                )}
              </p>
              <p className="mt-4 max-w-xl text-sm leading-6 text-slate-500">
                {t(
                  "Complete the assessment to see whether Atlas is the right fit for the next stage of growth.",
                  "Completa la evaluación para saber si Atlas es la opción adecuada para la siguiente etapa de crecimiento.",
                )}
              </p>
            </div>

            <div className="rounded-[1.75rem] border border-[#dbe6f3] bg-[#071b42] p-5 text-white shadow-[0_1.25rem_2.5rem_rgba(6,27,82,.16)] sm:p-6">
              <p className="text-xs font-black uppercase tracking-[0.28em] text-[#f7cc62]">
                {t("Your growth path", "Tu ruta de crecimiento")}
              </p>
              <p className="mt-3 text-xl font-black tracking-[-0.04em] text-white sm:text-2xl">
                {t(
                  "Get more leads. Follow up faster. Close more deals.",
                  "Consigue más prospectos. Da seguimiento más rápido. Cierra más ventas.",
                )}
              </p>
              <ol className="mt-6 grid gap-3 sm:grid-cols-3" aria-label={t("Atlas assessment outcomes", "Resultados de la evaluación de Atlas")}>
                {(spanish
                  ? [
                      ["01", "Consigue más prospectos", "Descubre dónde se están perdiendo oportunidades calificadas."],
                      ["02", "Da seguimiento más rápido", "Detecta dónde pierde impulso tu proceso de ventas."],
                      ["03", "Cierra más ventas", "Identifica el siguiente paso de mayor impacto para crecer."],
                    ]
                  : [
                      ["01", "Get more leads", "Find where qualified opportunities are being missed."],
                      ["02", "Follow up faster", "See where your sales process loses momentum."],
                      ["03", "Close more deals", "Identify the highest-impact next step for growth."],
                    ]).map(([number, title, detail]) => (
                  <li className="rounded-2xl border border-white/15 bg-white/10 p-4" key={number}>
                    <span className="text-xs font-black tracking-[0.2em] text-[#f7cc62]">{number}</span>
                    <h2 className="mt-3 text-base font-black leading-5 text-white">{title}</h2>
                    <p className="mt-2 text-sm leading-5 text-white/72">{detail}</p>
                  </li>
                ))}
              </ol>
              <p className="mt-5 text-sm leading-6 text-white/78">
                {t(
                  "Answer a few focused questions, then Atlas will recommend the clearest place to start.",
                  "Responde unas preguntas enfocadas y Atlas te recomendará el punto más claro para comenzar.",
                )}
              </p>
            </div>
          </div>
        </section>

        <div className="mx-auto w-full px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
          {received ? (
            <section className="rounded-[1.75rem] border border-[#b8e2cf] bg-white p-8 shadow-[0_1.25rem_2.5rem_rgba(6,27,82,.08)] sm:p-12">
              <p className="text-sm font-black uppercase tracking-[0.2em] text-[#167151]">
                {t("Assessment received", "Evaluación recibida")}
              </p>
              <h2 className="mt-3 text-3xl font-black tracking-[-0.06em] text-[#06266d] sm:text-4xl">
                {t("Thank you. Atlas has the company details.", "Gracias. Atlas ya tiene los datos del negocio.")}
              </h2>
              <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-600">
                {t(
                  "Your answers are saved in Atlas and queued for private CRM review. Atlas will review the company details and recommend the best starting point. Choose the Atlas plan that fits the business, or use the seven-day trial as a secondary way to explore the workspace.",
                  "Tus respuestas están guardadas en Atlas y en la cola de revisión privada del CRM. Revisaremos los datos del negocio y recomendaremos el mejor punto de partida. Elige el plan de Atlas que mejor se adapte al negocio o usa la prueba de siete días como una forma secundaria de explorar el espacio de trabajo.",
                )}
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  className="inline-flex rounded-full bg-[#f5b932] px-6 py-3 font-black text-[#071b42] hover:bg-[#ffd064]"
                  href={withSiteLanguage("/pricing#plans", language)}
                >
                  {t("View Atlas plans", "Ver planes de Atlas")}
                </Link>
                <Link
                  className="inline-flex rounded-full bg-[#1246a0] px-6 py-3 font-black text-white hover:bg-[#0a2f78]"
                  href={withSiteLanguage("/start-trial", language)}
                >
                  {t("Explore the 7-day trial", "Explorar la prueba de 7 días")}
                </Link>
              </div>
              <div className="mt-8">
                <AtlasSprintOffer checkoutUrl={getAtlasSprintPaymentLink()} compact />
              </div>
            </section>
          ) : (
            <BusinessAssessmentForm error={params.error} />
          )}
        </div>
      </main>
    </>
  );
}
