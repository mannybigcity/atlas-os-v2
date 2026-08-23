"use client";

import Link from "next/link";
import { useSiteLanguage } from "@/components/language-switcher";
import { atlasSprintOffer } from "@/lib/pricing";

const spanishLabels: Record<string, string> = {
  "Founding offer": "Oferta para fundadores",
  "Atlas 30-Day Revenue Rescue Sprint": "Sprint de rescate de ingresos de 30 días de Atlas",
  "A focused, human-led 30-day engagement to identify one revenue leak, install a practical follow-up system, and review what changed.":
    "Un trabajo enfocado de 30 días, dirigido por personas, para identificar una fuga de ingresos, instalar un sistema práctico de seguimiento y revisar qué cambió.",
  "one time · no automatic renewal": "pago único · sin renovación automática",
  "What you get": "Lo que incluye",
  "Focused business and revenue-leak assessment":
    "Evaluación enfocada del negocio y de las fugas de ingresos",
  "One agreed measurable 30-day goal": "Una meta medible acordada para 30 días",
  "One private Atlas workspace": "Un espacio de trabajo privado de Atlas",
  "Simple opportunity and follow-up pipeline":
    "Un proceso sencillo de oportunidades y seguimiento",
  "One approved follow-up sequence or focused marketing asset set":
    "Una secuencia de seguimiento aprobada o un conjunto enfocado de materiales de marketing",
  "Weekly owner check-ins and a day-30 review":
    "Revisiones semanales con el propietario y una revisión el día 30",
  "Not included": "No incluido",
  "Phone AI or autonomous customer contact":
    "IA telefónica o contacto autónomo con clientes",
  "Autonomous publishing, ad spend, or paid third-party software":
    "Publicación autónoma, gasto publicitario o software de terceros de pago",
  "Unlimited consulting or multiple unrelated business problems":
    "Consultoría ilimitada o múltiples problemas del negocio no relacionados",
  "Guaranteed leads, sales, revenue, or business results":
    "Prospectos, ventas, ingresos o resultados del negocio garantizados",
  "Start My 30-Day Sprint": "Comenzar mi sprint de 30 días",
  "Review the sprint with Atlas": "Revisar el sprint con Atlas",
  "Secure Stripe-hosted checkout. No card details are collected on this site.":
    "Pago seguro alojado por Stripe. Este sitio no recopila los datos de tu tarjeta.",
  "Checkout is not configured in this local environment yet.":
    "El pago todavía no está configurado en este entorno local.",
};

type AtlasSprintOfferProps = {
  checkoutUrl: string | null;
  compact?: boolean;
};

export function AtlasSprintOffer({ checkoutUrl, compact = false }: AtlasSprintOfferProps) {
  const language = useSiteLanguage();
  const translate = (value: string) =>
    language === "es" ? spanishLabels[value] ?? value : value;

  return (
    <section
      aria-labelledby="atlas-sprint-title"
      className={compact
        ? "border-y border-[#dce6f5] bg-[#fffdf6] px-5 py-12 text-[#071b42] sm:px-7 sm:py-16"
        : "rounded-[1.8rem] border border-[#f0c24a] bg-[#fffdf5] p-6 text-[#071b42] shadow-[0_16px_42px_rgba(15,23,42,0.05)] sm:p-8"}
      id="sprint"
    >
      <div className={compact ? "mx-auto grid w-full max-w-6xl gap-8 lg:grid-cols-[1.05fr_.95fr] lg:items-center" : "grid gap-8 lg:grid-cols-[1.1fr_.9fr] lg:items-start"}>
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-[#1246a0]">{translate("Founding offer")}</p>
          <h2 id="atlas-sprint-title" className="mt-3 max-w-3xl text-3xl font-black tracking-[-0.05em] sm:text-4xl">
            {translate(atlasSprintOffer.name)}
          </h2>
          <p className="mt-4 max-w-2xl text-lg leading-8 text-slate-700">
            {translate(atlasSprintOffer.summary)}
          </p>
          <p className="mt-5 text-3xl font-black tracking-[-0.04em]">
            ${atlasSprintOffer.price.toLocaleString("en-US")} <span className="text-base font-semibold text-slate-600">{translate("one time · no automatic renewal")}</span>
          </p>
        </div>

        <div className="rounded-2xl border border-[#eadb9d] bg-white/80 p-5">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-[#527096]">{translate("What you get")}</p>
          <ul className="mt-4 space-y-2 text-sm leading-6 text-slate-700">
            {(compact ? atlasSprintOffer.includes.slice(0, 4) : atlasSprintOffer.includes).map((item) => (
              <li className="flex gap-3" key={item}>
                <span aria-hidden="true" className="mt-2 h-2 w-2 shrink-0 rounded-full bg-[#f5b932]" />
                <span>{translate(item)}</span>
              </li>
            ))}
          </ul>
          {!compact ? (
            <>
              <p className="mt-6 text-xs font-black uppercase tracking-[0.16em] text-[#527096]">{translate("Not included")}</p>
              <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-600">
                {atlasSprintOffer.notIncluded.map((item) => <li key={item}>- {translate(item)}</li>)}
              </ul>
            </>
          ) : null}
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
            {checkoutUrl ? (
              <a
                className="inline-flex items-center justify-center rounded-full bg-[#f5b932] px-6 py-3 text-sm font-black text-[#071b42] transition hover:bg-[#ffd064]"
                href={checkoutUrl}
                rel="noreferrer"
                target="_blank"
              >
                {translate("Start My 30-Day Sprint")}
              </a>
            ) : (
              <Link
                className="inline-flex items-center justify-center rounded-full bg-[#1246a0] px-6 py-3 text-sm font-black text-white transition hover:bg-[#0a2f78]"
                href="/assessment"
              >
                {translate("Review the sprint with Atlas")}
              </Link>
            )}
            <p className="text-xs leading-5 text-slate-600">
              {translate(checkoutUrl ? "Secure Stripe-hosted checkout. No card details are collected on this site." : "Checkout is not configured in this local environment yet.")}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
