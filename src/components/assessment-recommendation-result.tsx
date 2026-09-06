import Link from "next/link";
import type { AssessmentRecommendation } from "@/lib/assessment-recommendation";
import { withSiteLanguage, type SiteLanguage } from "@/lib/site-language";

type Props = {
  language: SiteLanguage;
  recommendation: AssessmentRecommendation;
};

export function AssessmentRecommendationResult({ language, recommendation }: Props) {
  const spanish = language === "es";
  const copy = (value: { en: string; es: string }) => (spanish ? value.es : value.en);
  const planAnchor = recommendation.plan === "unlimited" ? "unlimited" : "grow";
  const planLabel =
    recommendation.plan === "unlimited"
      ? spanish
        ? "ATLAS ILIMITADO"
        : "ATLAS UNLIMITED"
      : spanish
        ? "ATLAS CRECIMIENTO"
        : "ATLAS GROW";

  return (
    <section
      aria-labelledby="assessment-recommendation-title"
      className="grid gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(18rem,22rem)]"
    >
      <div className="rounded-[1.75rem] border border-[#dbe6f3] bg-white p-6 shadow-[0_1.25rem_2.5rem_rgba(6,27,82,.08)] sm:p-8">
        <p className="text-xs font-black uppercase tracking-[0.22em] text-[#c48713]">
          {spanish ? "Recomendación de Atlas" : "Atlas recommendation"}
        </p>
        <h2
          className="mt-3 text-3xl font-black tracking-[-0.06em] text-[#06266d] sm:text-4xl"
          id="assessment-recommendation-title"
        >
          {spanish ? "Tu siguiente paso ya está claro." : "Your next step is ready."}
        </h2>
        <p className="mt-4 max-w-2xl text-lg leading-8 text-slate-600">
          {spanish
            ? "Atlas usó tus respuestas para priorizar el primer movimiento, no solo para guardar la evaluación."
            : "Atlas used your answers to prioritize the first move, not only to save the assessment."}
        </p>

        <div className="mt-6 grid gap-4 sm:grid-cols-[8.5rem_minmax(0,1fr)]">
          <div className="flex flex-col items-center justify-center rounded-[1.5rem] border border-[#dbe6f3] bg-[#071b42] px-4 py-5 text-white">
            <p className="text-[0.65rem] font-black uppercase tracking-[0.2em] text-[#f7cc62]">
              {spanish ? "Puntaje" : "Score"}
            </p>
            <p className="mt-2 text-4xl font-black tracking-[-0.08em] text-white">
              {recommendation.score}
              <span className="text-lg text-white/55">/100</span>
            </p>
            <p className="mt-1 text-center text-xs font-semibold text-white/70">
              {spanish ? "Listo para crecer" : "Growth readiness"}
            </p>
          </div>
          <div className="rounded-[1.5rem] border border-[#dbe6f3] bg-[#f8fbff] p-5">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-[#1246a0]">
              {spanish ? "Siguiente paso priorizado" : "Prioritized next step"}
            </p>
            <h3 className="mt-2 text-2xl font-black tracking-[-0.05em] text-[#06266d]">
              {copy(recommendation.priorityTitle)}
            </h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">{copy(recommendation.nextStep)}</p>
          </div>
        </div>

        <div className="mt-6">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-[#1246a0]">
            {spanish ? "Vista previa útil" : "Useful preview"}
          </p>
          <ul className="mt-3 grid gap-3">
            {recommendation.preview.map((item) => (
              <li
                className="rounded-2xl border border-[#dbe6f3] bg-white px-4 py-3 text-sm leading-6 text-slate-700"
                key={item.en}
              >
                {copy(item)}
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Link
            className="inline-flex min-h-12 items-center justify-center rounded-full bg-[#f5b932] px-6 text-sm font-black text-[#071b42] shadow-[0_12px_28px_rgba(245,185,50,.24)] hover:bg-[#ffd064]"
            href={withSiteLanguage("/start-trial", language)}
          >
            {spanish ? "Comenzar prueba gratis de 7 días" : "Start 7-day free trial"}
          </Link>
          <Link
            className="inline-flex min-h-12 items-center justify-center rounded-full bg-[#1246a0] px-6 text-sm font-black text-white hover:bg-[#0a2f78]"
            href={withSiteLanguage(`/pricing#${planAnchor}`, language)}
          >
            {spanish ? `Ver ${planLabel}` : `See ${planLabel}`}
          </Link>
        </div>
        <p className="mt-4 text-sm leading-6 text-slate-500">
          {spanish
            ? "Atlas guardó esta evaluación para revisión privada. Atlas no llama, envía correo ni escribe automáticamente. Una persona aprueba cualquier contacto externo."
            : "Atlas saved this assessment for private review. Atlas does not automatically call, email, or text anyone. A person approves any external outreach."}
        </p>
      </div>

      <aside className="rounded-[1.75rem] border border-[#dbe6f3] bg-[#071b42] p-6 text-white shadow-[0_1.25rem_2.5rem_rgba(6,27,82,.16)]">
        <p className="text-xs font-black uppercase tracking-[0.22em] text-[#f7cc62]">
          {spanish ? "Plan recomendado" : "Recommended plan"}
        </p>
        <h3 className="mt-3 text-2xl font-black tracking-[-0.05em]">{planLabel}</h3>
        <p className="mt-2 text-4xl font-black tracking-[-0.08em] text-[#f7cc62]">
          ${recommendation.monthlyPrice}
          <span className="text-base font-bold text-white/70">{spanish ? "/mes" : "/mo"}</span>
        </p>
        <p className="mt-2 text-sm font-semibold text-white/78">{copy(recommendation.bestFor)}</p>
        <p className="mt-4 text-sm leading-6 text-white/80">{copy(recommendation.planWhy)}</p>
        <ul className="mt-5 grid gap-3">
          {recommendation.planProof.map((item) => (
            <li className="rounded-2xl border border-white/12 bg-white/8 px-4 py-3 text-sm leading-6 text-white/88" key={item.en}>
              {copy(item)}
            </li>
          ))}
        </ul>
        <p className="mt-5 text-xs leading-5 text-white/60">
          {spanish
            ? "La prueba de 7 días no pide tarjeta. Los planes de pago son mensuales y se renuevan hasta que los canceles."
            : "The 7-day trial does not take a card. Paid plans are monthly and renew until you cancel."}
        </p>
      </aside>
    </section>
  );
}
