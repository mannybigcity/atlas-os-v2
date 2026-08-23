import Link from "next/link";
import type { Metadata } from "next";
import { SiteHeader } from "@/components/site-header";
import { getSiteLanguage } from "@/lib/site-language-server";
import { requireTrialUser } from "@/server/trials/guards";

export const dynamic = "force-dynamic";
export async function generateMetadata(): Promise<Metadata> {
  const language = await getSiteLanguage();

  return {
    title: language === "es" ? "Espacio de trabajo inicial de Atlas | Atlas para emprendedores" : "Atlas Starter Workspace | Atlas For Entrepreneurs",
    robots: { index: false, follow: false },
  };
}

export default async function StarterWorkspacePage() {
  const trial = await requireTrialUser("/starter");
  const days = Math.max(1, Math.ceil((new Date(trial.trial_ends_at).getTime() - Date.now()) / 86400000));
  const language = await getSiteLanguage();
  const copy = language === "es"
    ? {
        eyebrow: "Espacio de trabajo inicial",
        welcome: "Te damos la bienvenida,",
        description: "Un espacio enfocado para captar prospectos, mantener el pipeline en movimiento y saber qué hacer después.",
        trialActive: "Prueba activa",
        days: `Quedan aproximadamente ${days} días · no necesitas tarjeta`,
        cards: [
          ["Panel", "0 prospectos", "Tu actividad y próximas acciones aparecerán aquí mientras trabajas."],
          ["Captura de prospectos", "Comienza con un prospecto", "Mantén las nuevas oportunidades en un solo lugar sencillo."],
          ["Pipeline", "Aún no hay oportunidades", "Mueve cada prospecto de nuevo a calificado y después a ganado."],
        ],
        coming: "Próximamente",
        followUp: "Centro de seguimiento",
        nextActions: "Tus próximas acciones",
        followUpBody: "Los recordatorios vivirán aquí para que los prospectos interesados no se enfríen.",
        noFollowUps: "Aún no hay seguimientos.",
        checklist: "Lista de incorporación",
        checklistItems: ["Confirma tu correo", "Agrega tu primer prospecto", "Configura tu primer seguimiento"],
        upgrade: "Ver planes y actualizar",
      }
    : {
        eyebrow: "Starter workspace",
        welcome: "Welcome,",
        description: "A focused place to capture leads, keep the pipeline moving, and know what to do next.",
        trialActive: "Trial active",
        days: `About ${days} days remaining · no card required`,
        cards: [
          ["Dashboard", "0 leads", "Your activity and next actions will appear here as you work."],
          ["Lead capture", "Start with one lead", "Keep new opportunities in one simple place."],
          ["Pipeline", "No opportunities yet", "Move each lead from new to qualified to won."],
        ],
        coming: "Coming next",
        followUp: "Follow-up Desk",
        nextActions: "Your next actions",
        followUpBody: "Reminders will live here so warm leads do not go quiet.",
        noFollowUps: "No follow-ups yet.",
        checklist: "Onboarding checklist",
        checklistItems: ["Confirm your email", "Add your first lead", "Set your first follow-up"],
        upgrade: "View plans and upgrade",
      };

  return (
    <main className="min-h-screen bg-[#f4f7fb] text-[#071b42]">
      <SiteHeader />
      <section className="mx-auto max-w-6xl px-6 py-10 sm:py-14">
        <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-[#1246a0]">{copy.eyebrow}</p>
            <h1 className="mt-3 text-4xl font-black tracking-[-.05em]">{copy.welcome} {trial.full_name}.</h1>
            <p className="mt-3 text-lg text-slate-600">{copy.description}</p>
          </div>
          <div className="rounded-2xl border border-[#f0c24a] bg-[#fff8df] px-5 py-4 text-sm text-[#4b3800]">
            <p className="font-black uppercase tracking-[.14em]">{copy.trialActive}</p>
            <p className="mt-1 font-semibold">{copy.days}</p>
          </div>
        </div>

        <div className="mt-8 grid gap-5 lg:grid-cols-3">
          {copy.cards.map(([title, stat, body]) => (
            <article className="rounded-[1.6rem] border border-[#dce5f1] bg-white p-6 shadow-sm" key={title}>
              <p className="text-xs font-black uppercase tracking-[.16em] text-[#1246a0]">{title}</p>
              <p className="mt-5 text-2xl font-black">{stat}</p>
              <p className="mt-3 text-sm leading-6 text-slate-600">{body}</p>
              <button className="mt-6 rounded-full border border-[#cbd8e8] px-4 py-2 text-sm font-bold text-slate-400" disabled type="button">{copy.coming}</button>
            </article>
          ))}
        </div>

        <div className="mt-5 grid gap-5 lg:grid-cols-[1.1fr_.9fr]">
          <article className="rounded-[1.6rem] border border-[#dce5f1] bg-white p-6 shadow-sm">
            <p className="text-xs font-black uppercase tracking-[.16em] text-[#1246a0]">{copy.followUp}</p>
            <h2 className="mt-3 text-2xl font-black">{copy.nextActions}</h2>
            <p className="mt-3 text-sm leading-6 text-slate-600">{copy.followUpBody}</p>
            <div className="mt-6 rounded-2xl bg-[#f7f9fc] p-5 text-sm font-semibold text-slate-500">{copy.noFollowUps}</div>
          </article>
          <article className="rounded-[1.6rem] border border-[#dce5f1] bg-white p-6 shadow-sm">
            <p className="text-xs font-black uppercase tracking-[.16em] text-[#1246a0]">{copy.checklist}</p>
            <ul className="mt-5 space-y-4 text-sm font-semibold text-slate-700">
              {copy.checklistItems.map((item) => <li className="flex gap-3" key={item}><span className="mt-0.5 h-5 w-5 rounded-full border-2 border-[#d8e2ee]" />{item}</li>)}
            </ul>
          </article>
        </div>

        <Link className="mt-8 inline-flex rounded-full border border-[#cbd8e8] bg-white px-5 py-3 text-sm font-bold text-[#16325c]" href="/pricing">{copy.upgrade}</Link>
      </section>
    </main>
  );
}
