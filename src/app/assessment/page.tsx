import type { Metadata } from "next";
import { AssessmentRecommendationResult } from "@/components/assessment-recommendation-result";
import { SiteHeader } from "@/components/site-header";
import { BusinessAssessmentForm } from "@/components/business-assessment-form";
import {
  recommendAssessment,
  resolveAssessmentSignals,
} from "@/lib/assessment-recommendation";
import { getSiteLanguage } from "@/lib/site-language-server";

export const metadata: Metadata = {
  title: "Business Health Assessment | Atlas",
  description:
    "Learn about the prospect's company, customers, systems, and growth goals before Atlas recommends a starting point.",
};

type PageProps = {
  searchParams: Promise<{
    error?: string;
    status?: string;
    lang?: string;
    c?: string;
    v?: string;
    f?: string;
    s?: string;
    b?: string;
    t?: string;
    a?: string;
  }>;
};

export default async function AssessmentPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const received = params.status === "received";
  const language = await getSiteLanguage(params.lang);
  const spanish = language === "es";
  const t = (english: string, spanishText: string) => (spanish ? spanishText : english);
  const recommendation = received
    ? recommendAssessment(
        resolveAssessmentSignals({
          c: params.c,
          v: params.v,
          f: params.f,
          s: params.s,
          b: params.b,
          t: params.t,
          a: params.a,
        }),
      )
    : null;

  return (
    <>
      <SiteHeader active="snapshot" />
      <main className="min-h-screen bg-[#f6f9ff] text-[#071b42]">
        <section className="border-b border-[#dce6f5] bg-white">
          <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:px-6 lg:grid-cols-[1.08fr_.92fr] lg:px-8 lg:py-16">
            <div className="max-w-2xl">
              <p className="text-xs font-bold uppercase tracking-[0.25em] text-[#c48713]">
                {received
                  ? t("Your Atlas snapshot", "Tu panorama de Atlas")
                  : t("Business Health Assessment", "Evaluación de salud del negocio")}
              </p>
              <h1 className="mt-4 text-4xl font-black tracking-[-0.07em] text-[#06266d] sm:text-6xl">
                {received
                  ? t("Atlas already has a recommendation.", "Atlas ya tiene una recomendación.")
                  : t("Tell Atlas about the business.", "Cuéntale a Atlas sobre tu negocio.")}
              </h1>
              <p className="mt-6 text-lg leading-8 text-slate-600">
                {received
                  ? t(
                      "See the score, the prioritized next step, and the plan that fits this business. Then start the 7-day free trial.",
                      "Ve el puntaje, el siguiente paso priorizado y el plan que encaja con este negocio. Luego comienza la prueba gratis de 7 días.",
                    )
                  : t(
                      "Share the company story, customer flow, and growth goals so Atlas can recommend the right next step.",
                      "Comparte la historia de la empresa, el flujo de clientes y las metas de crecimiento para que Atlas recomiende el siguiente paso correcto.",
                    )}
              </p>
              <p className="mt-4 max-w-xl text-sm leading-6 text-slate-500">
                {received
                  ? t(
                      "This snapshot comes from the answers just submitted. Atlas still does not call, email, or text anyone until a person approves outreach.",
                      "Este panorama sale de las respuestas que acabas de enviar. Atlas sigue sin llamar, enviar correo ni escribir a nadie hasta que una persona apruebe el contacto.",
                    )
                  : t(
                      "Complete the assessment to see whether Atlas is the right fit for the next stage of growth.",
                      "Completa la evaluación para saber si Atlas es la opción adecuada para la siguiente etapa de crecimiento.",
                    )}
              </p>
            </div>

            <div className="rounded-[1.75rem] border border-[#dbe6f3] bg-[#071b42] p-5 text-white shadow-[0_1.25rem_2.5rem_rgba(6,27,82,.16)] sm:p-6">
              <p className="text-xs font-black uppercase tracking-[0.28em] text-[#f7cc62]">
                {received ? t("What you get now", "Lo que obtienes ahora") : t("Your growth path", "Tu ruta de crecimiento")}
              </p>
              <p className="mt-3 text-xl font-black tracking-[-0.04em] text-white sm:text-2xl">
                {received
                  ? t(
                      "A concrete next step, not a waiting room.",
                      "Un siguiente paso concreto, no una sala de espera.",
                    )
                  : t(
                      "Get more leads. Follow up faster. Close more deals.",
                      "Consigue más prospectos. Da seguimiento más rápido. Cierra más ventas.",
                    )}
              </p>
              <ol className="mt-6 grid gap-3 sm:grid-cols-3" aria-label={t("Atlas assessment outcomes", "Resultados de la evaluación de Atlas")}>
                {(received
                  ? spanish
                    ? [
                        ["01", "Puntaje", "Una lectura clara de qué tan listo está el negocio para crecer."],
                        ["02", "Siguiente paso", "La primera acción de mayor impacto, basada en tus respuestas."],
                        ["03", "Plan", "GROW $249 o ILIMITADO $499, justificado para este negocio."],
                      ]
                    : [
                        ["01", "Score", "A clear read on how ready the business is to grow."],
                        ["02", "Next step", "The highest-impact first move, based on your answers."],
                        ["03", "Plan", "GROW $249 or UNLIMITED $499, justified for this business."],
                      ]
                  : spanish
                    ? [
                        ["01", "Consigue más prospectos", "Descubre dónde se están perdiendo oportunidades calificadas."],
                        ["02", "Da seguimiento más rápido", "Detecta dónde pierde impulso tu proceso de ventas."],
                        ["03", "Cierra más ventas", "Identifica el siguiente paso de mayor impacto para crecer."],
                      ]
                    : [
                        ["01", "Get more leads", "Find where qualified opportunities are being missed."],
                        ["02", "Follow up faster", "See where your sales process loses momentum."],
                        ["03", "Close more deals", "Identify the highest-impact next step for growth."],
                      ]
                ).map(([number, title, detail]) => (
                  <li className="rounded-2xl border border-white/15 bg-white/10 p-4" key={number}>
                    <span className="text-xs font-black tracking-[0.2em] text-[#f7cc62]">{number}</span>
                    <h2 className="mt-3 text-base font-black leading-5 text-white">{title}</h2>
                    <p className="mt-2 text-sm leading-5 text-white/72">{detail}</p>
                  </li>
                ))}
              </ol>
              <p className="mt-5 text-sm leading-6 text-white/78">
                {received
                  ? t(
                      "Start the 7-day free trial to put this recommendation to work in a private workspace.",
                      "Comienza la prueba gratis de 7 días para poner esta recomendación a trabajar en un espacio privado.",
                    )
                  : t(
                      "Answer a few focused questions, then Atlas will recommend the clearest place to start.",
                      "Responde unas preguntas enfocadas y Atlas te recomendará el punto más claro para comenzar.",
                    )}
              </p>
            </div>
          </div>
        </section>

        <div className="mx-auto w-full px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
          {recommendation ? (
            <AssessmentRecommendationResult language={language} recommendation={recommendation} />
          ) : (
            <BusinessAssessmentForm error={params.error} />
          )}
        </div>
      </main>
    </>
  );
}
