"use client";

import Image from "next/image";
import Link from "next/link";
import { RecoveryLinkRedirect } from "@/components/recovery-link-redirect";
import { useSiteLanguage } from "@/components/language-switcher";
import { SiteHeader } from "@/components/site-header";
import { atlasPricingPlans } from "@/lib/pricing";
import { withSiteLanguage, type SiteLanguage } from "@/lib/site-language";

type WorkflowStep = {
  title: string;
  body: string;
  mark: string;
};

type LandingCopy = {
  eyebrow: string;
  headline: string;
  heroCopy: string;
  example: string;
  trial: string;
  afterTrial: string;
  assessmentPrompt: string;
  assessmentLink: string;
  nav: { how: string; who: string; dashboard: string; pricing: string; resources: string; login: string; action: string };
  principles: string[];
  peopleTitle: string;
  people: { name: string; mark: string }[];
  howTitle: string;
  howOutcome: string;
  workflow: WorkflowStep[];
  denTitle: string;
  denCopy: string;
  denPoints: string[];
  denCta: string;
  denCtaNote: string;
  closingTitle: [string, string];
  closingCopy: string;
  stats: { value: string; label: string }[];
  bottomCta: string;
  mostPopular: string;
  perMonth: string;
  stillsLabel: string;
  stillsTitle: string;
  stillsLede: string;
  stillsWorkflow: string[];
  stillsCards: { title: string; body: string }[];
  stillsOwner: string;
  stillsFooter: string;
  stills: Array<{ src: string; name: string; label: string; caption: string; alt: string }>;
  denStillAlt: string;
};

function IndustryGlyph({ index }: { index: number }) {
  /* eslint-disable react/jsx-key -- glyphs are selected as a single SVG child, not mapped directly. */
  const common = { fill: "none", stroke: "currentColor", strokeLinecap: "round" as const, strokeLinejoin: "round" as const, strokeWidth: 2.4 };
  const glyphs = [
    <path {...common} d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.1-3.1a6 6 0 0 1-8.3 7.1l-7.9 7.9a2.1 2.1 0 0 1-3-3l7.9-7.9a6 6 0 0 1 7.1-8.3z" />,
    <><path {...common} d="M10 20 8.75 17.5 6 18M10 4 8.75 6.5 6 6m8 14 1.25-2.5L18 18M14 4l1.25 2.5L18 6M17 21l-3-6h-4m7-12-3 6 1.5 3M2 12h6.5L10 9m10 1-1.5 2 1.5 2M22 12h-6.5L14 15M4 10l1.5 2L4 14M7 21l3-6-1.5-3M7 3l3 6h4" /></>,
    <><circle {...common} cx="6" cy="6" r="3" /><path {...common} d="M8.1 8.1 12 12 20 4" /><circle {...common} cx="6" cy="18" r="3" /><path {...common} d="m14.8 14.8 5.2 5.2" /></>,
    <><path {...common} d="m6.3 20.3a2.4 2.4 0 0 0 3.4 0L12 18l-6-6-2.3 2.3a2.4 2.4 0 0 0 0 3.4zM2 22l3-3m2.5-5.5L10 11m.5 5.5L13 14M18 3l-4 4h6l-4 4" /></>,
    <><path {...common} d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8M3 10a2 2 0 0 1 .7-1.5l7-6a2 2 0 0 1 2.6 0l7 6A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /></>,
    <><path {...common} d="M2 12c3-4 6-4 9 0s6 4 9 0" /><path {...common} d="M2 19c3-4 6-4 9 0s6 4 9 0" /><path {...common} d="M6 7c2-2 4-2 6 0s4 2 6 0" /></>,
    <><path {...common} d="m15 12-9.4 9.4a2.1 2.1 0 0 1-3-3L12 9" /><path {...common} d="m17.6 15 3.3-3.3a2 2 0 0 0 0-2.8L15.1 3a2 2 0 0 0-2.8 0L9 6.3" /></>,
    <><rect {...common} x="2" y="2" width="16" height="6" rx="2" /><path {...common} d="M10 16v-2a2 2 0 0 1 2-2h8a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M8 16v6h4v-6" /></>,
    <><path {...common} d="M14 9.5V7a4 4 0 0 1 4-4h1.5a.5.5 0 0 1 .5.5V5a4 4 0 0 1-4 4 4 4 0 0 0-4 4c0 2 1 3 1 5a5 5 0 0 1-1 3M4 9a5 5 0 0 1 8 4M5 21h14" /></>,
    <><path {...common} d="M3 14h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7a9 9 0 0 1 18 0v7a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3" /></>,
  ];
  const glyph = <svg aria-hidden="true" className="atlas-audience-svg" viewBox="0 0 24 24">{glyphs[index % glyphs.length]}</svg>;
  /* eslint-enable react/jsx-key */
  return glyph;
}

function DeskGlyph({ index }: { index: number }) {
  const common = { fill: "none", stroke: "currentColor", strokeLinecap: "round" as const, strokeLinejoin: "round" as const, strokeWidth: 2.2 };
  const glyphs = [
    <><circle {...common} cx="12" cy="8" r="3" /><path {...common} d="M6 19c.8-2.4 2.8-3.6 6-3.6s5.2 1.2 6 3.6" /></>,
    <><circle {...common} cx="11" cy="11" r="6" /><path {...common} d="m20 20-3.5-3.5" /></>,
    <><rect {...common} x="4" y="5" width="16" height="15" rx="2" /><path {...common} d="M8 3v4M16 3v4M4 10h16" /></>,
    <><path {...common} d="M8 5h8v15H8z" /><path {...common} d="M10 9h4M10 13h4M10 17h2" /></>,
    <><path {...common} d="M4 6h16v12H4z" /><path {...common} d="m4 7 8 6 8-6" /></>,
  ];
  return <svg aria-hidden="true" className="atlas-desks-svg" viewBox="0 0 24 24">{glyphs[index % glyphs.length]}</svg>;
}

const copy: Record<SiteLanguage, LandingCopy> = {
  en: {
    eyebrow: "ATLAS FOR ENTREPRENEURS",
    headline: "Stop losing good leads between the call, the quote, and the follow-up.",
    heroCopy: "Keep prospects, callbacks, and next actions in one desk. You approve every customer message.",
    example: "Example: New HVAC inquiry → reminder to call → you approve the follow-up → marked booked.",
    trial: "Start 7-day free trial",
    afterTrial: "After the 7 days, Debbie onboards you for $500, then you get 2 weeks free before a paid plan.",
    assessmentPrompt: "Not sure yet?",
    assessmentLink: "Take the optional business assessment",
    nav: {
      how: "How ATLAS Works",
      who: "Who It's For",
      dashboard: "CLIENT PANEL",
      pricing: "Pricing",
      resources: "Resources",
      login: "Acceso del cliente",
      action: "CLIENT PANEL",
    },
    principles: [
      "Built for small business",
      "AI with accountability",
      "Human approval when it matters",
      "One system. Multiple AI workers.",
    ],
    peopleTitle: "BUILT FOR THE PEOPLE WHO BUILD, TEACH, SERVE, SELL, PERFORM, AND PROVIDE.",
    people: [
      { name: "Plumbers", mark: "PL" },
      { name: "HVAC owners", mark: "HV" },
      { name: "Barbers", mark: "BR" },
      { name: "Electricians", mark: "EL" },
      { name: "Realtors", mark: "RE" },
      { name: "Swim instructors", mark: "SW" },
      { name: "Roofers", mark: "RF" },
      { name: "Painters", mark: "PT" },
      { name: "Landscapers", mark: "LS" },
      { name: "DJs & party planners", mark: "DJ" },
    ],
    howTitle: "HOW ATLAS WORKS FOR YOUR BUSINESS",
    howOutcome:
      "Atlas finds the next conversation, drafts the follow-up, and parks it for one-tap approval. You wake up to a brief. Nothing sends without you.",
    workflow: [
      { title: "Find", body: "Organize prospects and opportunities around the business goal.", mark: "01" },
      { title: "Respond", body: "Keep notes, tasks, and owner-approved follow-up drafts in one place.", mark: "02" },
      { title: "Follow up", body: "See reminders and next actions before opportunities go cold.", mark: "03" },
      { title: "Close", body: "Keep pipeline context visible while you make the customer decisions.", mark: "04" },
      { title: "Grow", body: "Draft focused marketing content with human review before anything goes live.", mark: "05" },
    ],
    denTitle: "CLIENT PANEL",
    denCopy: "Your command center. See what ATLAS is doing, what needs your attention, and what is coming next.",
    denPoints: [
      "Owner-approved work and next actions",
      "Follow-up status and reminders",
      "Opportunity pipeline visibility",
      "Tasks and reminders",
      "Notes, activity, and account usage",
    ],
    denCta: "Sign in — existing clients",
    denCtaNote: "Real client login for people who already have an account. Not a public demo.",
    closingTitle: ["RUN THE BUSINESS.", "MAKE IT TO THE MOMENTS THAT MATTER."],
    closingCopy:
      "ATLAS organizes the work that gets scattered: prospects, follow-up, pipeline, tasks, and approved drafts, so you can focus on your customers and your family.",
    stats: [
      { value: "GOAL", label: "One focused 30-day goal" },
      { value: "WORKSPACE", label: "One private client workspace" },
      { value: "CONTROL", label: "Monthly plans. Cancel anytime." },
      { value: "YOU", label: "Stay in control" },
    ],
    bottomCta: "Start 7-day free trial",
    mostPopular: "Most popular",
    perMonth: "per month",
    stillsLabel: "THE DESKS",
    stillsTitle: "One workflow. Specialized desks.",
    stillsLede: "Atlas commands the desk. Hunter finds businesses. Micah drafts content. David keeps the CRM. Amanda writes the inbound drafts you approve.",
    stillsWorkflow: ["Receive", "Find", "Review", "Accept", "Follow-up"],
    stillsCards: [
      {
        title: "Atlas commands",
        body: "Chief of Staff. One priority and the next move. You stay in charge of every send.",
      },
      {
        title: "Hunter finds businesses that can send work",
        body: "Surface real opportunities in your market. They stay in the review pile until you accept them into Prospects.",
      },
      {
        title: "Micah turns ideas into weekly content",
        body: "Done-for-you day-cards and gallery drafts, ready to copy or download. Never a live post.",
      },
      {
        title: "David keeps the CRM",
        body: "Pipeline, follow-ups, and the next action stay in one place so good leads do not go cold.",
      },
      {
        title: "Amanda receives",
        body: "Client Closer. Inbound email (and text when live) lands on the desk. She drafts the reply. You approve before anything sends.",
      },
    ],
    stillsOwner: "Every desk keeps the owner in control. You decide. Nothing sends or posts without you.",
    stillsFooter: "Small business · Bigger opportunities · With Atlas",
    stills: [
      {
        src: "/marketing/desk-stills/follow-up-drafts.webp",
        name: "AMANDA",
        label: "inbound drafts you approve",
        caption: "Approve · Edit · Delete. Nothing sends without you.",
        alt: "Amanda follow-up drafts with Approve, Edit, and Delete on the Atlas desk",
      },
      {
        src: "/marketing/desk-stills/hunter-review-pile.webp",
        name: "HUNTER",
        label: "businesses that can send work",
        caption: "Review pile before Prospects",
        alt: "HUNTER review pile on the Atlas desk",
      },
      {
        src: "/marketing/desk-stills/micah-gallery.webp",
        name: "MICAH",
        label: "weekly content drafts",
        caption: "Day-cards · Copy/Download — never a live post",
        alt: "MICAH social gallery flyers with captions and Copy caption / Download — Instagram and Facebook drafts for a local owner",
      },
    ],
    denStillAlt:
      "Lion’s Den Summary for Massive Action Maintenance with Desk menu — Summary, Prospects, Clients, Follow-up, Calendar, Notes, HUNTER, MICAH — plus packed Prospects, HUNTER, Follow-up, and MICAH counts",
  },
  es: {
    eyebrow: "ATLAS PARA EMPRENDEDORES",
    headline: "Deja de perder buenos clientes entre la llamada, la cotización y el seguimiento.",
    heroCopy: "Mantén prospectos, devoluciones de llamada y próximos pasos en un solo escritorio. Tú apruebas cada mensaje al cliente.",
    example: "Ejemplo: Nueva consulta de HVAC → recordatorio para llamar → tú apruebas el seguimiento → marcado como reservado.",
    trial: "Iniciar prueba gratuita de 7 días",
    afterTrial: "Después de los 7 días, Debbie te incorpora por $500 y luego tienes 2 semanas gratis antes de un plan de pago.",
    assessmentPrompt: "¿Aún no estás seguro?",
    assessmentLink: "Haz la evaluación opcional del negocio",
    nav: {
      how: "Cómo funciona ATLAS",
      who: "Para quién es",
      dashboard: "CLIENT PANEL",
      pricing: "Precios",
      resources: "Recursos",
      login: "Client Login",
      action: "CLIENT PANEL",
    },
    principles: [
      "Hecho para pequeñas empresas",
      "IA con responsabilidad",
      "Aprobación humana cuando importa",
      "Un sistema. Múltiples asistentes de IA.",
    ],
    peopleTitle: "HECHO PARA QUIENES CONSTRUYEN, ENSEÑAN, SIRVEN, VENDEN, ACTÚAN Y PROVEEN.",
    people: [
      { name: "Plomeros", mark: "PL" },
      { name: "Dueños de HVAC", mark: "HV" },
      { name: "Barberos", mark: "BR" },
      { name: "Profesores de piano", mark: "PI" },
      { name: "Instructores de natación", mark: "SW" },
      { name: "Agentes inmobiliarios", mark: "RE" },
      { name: "DJs y organizadores", mark: "DJ" },
    ],
    howTitle: "CÓMO FUNCIONA ATLAS PARA TU NEGOCIO",
    howOutcome:
      "Atlas encuentra la próxima conversación, redacta el seguimiento y lo deja listo para aprobarlo de un toque. Te despiertas con un resumen. Nada se envía sin ti.",
    workflow: [
      { title: "Organiza", body: "Organiza prospectos y oportunidades alrededor de una meta del negocio.", mark: "01" },
      { title: "Responde", body: "Mantén notas, tareas y borradores de seguimiento aprobados en un solo lugar.", mark: "02" },
      { title: "Da seguimiento", body: "Mira recordatorios y próximos pasos antes de que se enfríen las oportunidades.", mark: "03" },
      { title: "Avanza", body: "Mantén visible el contexto del pipeline mientras tomas las decisiones con clientes.", mark: "04" },
      { title: "Crece", body: "Crea borradores de marketing enfocados con revisión humana antes de publicar.", mark: "05" },
    ],
    denTitle: "CLIENT PANEL",
    denCopy: "Tu centro de mando. Mira lo que ATLAS está haciendo, lo que necesita tu atención y lo que sigue.",
    denPoints: [
      "Trabajo aprobado por el propietario y próximos pasos",
      "Estado de seguimientos y recordatorios",
      "Visibilidad de oportunidades en el pipeline",
      "Tareas y recordatorios",
      "Notas, actividad y uso de la cuenta",
    ],
    denCta: "Iniciar sesión — clientes actuales",
    denCtaNote: "Acceso real para quien ya tiene cuenta. No es una demostración pública.",
    closingTitle: ["MANEJA EL NEGOCIO.", "LLEGA A LOS MOMENTOS QUE IMPORTAN."],
    closingCopy:
      "ATLAS organiza el trabajo que se dispersa: prospectos, seguimientos, oportunidades, tareas y borradores aprobados, para que puedas enfocarte en tus clientes y tu familia.",
    stats: [
      { value: "META", label: "Una meta enfocada de 30 días" },
      { value: "ESPACIO", label: "Un espacio de trabajo privado" },
      { value: "CONTROL", label: "Planes mensuales. Cancela cuando quieras." },
      { value: "TÚ", label: "Mantienes el control" },
    ],
    bottomCta: "Iniciar prueba gratuita de 7 días",
    mostPopular: "Más popular",
    perMonth: "al mes",
    stillsLabel: "LOS ESCRITORIOS",
    stillsTitle: "Un flujo. Escritorios especializados.",
    stillsLede: "Atlas manda el escritorio. Hunter encuentra negocios. Micah redacta contenido. David lleva el CRM. Amanda escribe los borradores de entrada que tú apruebas.",
    stillsWorkflow: ["Recibe", "Busca", "Revisa", "Acepta", "Seguimiento"],
    stillsCards: [
      {
        title: "Atlas manda",
        body: "Jefe de Gabinete. Una prioridad y el siguiente paso. Tú decides cada envío.",
      },
      {
        title: "Hunter encuentra negocios que te pueden mandar trabajo",
        body: "Oportunidades reales en tu mercado. Quedan en la pila de revisión hasta que las aceptas en Prospectos.",
      },
      {
        title: "Micah convierte ideas en contenido semanal",
        body: "Tarjetas del día y borradores de galería, listos para copiar o descargar. Nunca una publicación en vivo.",
      },
      {
        title: "David lleva el CRM",
        body: "El pipeline, los seguimientos y el próximo paso se quedan a la vista para que no se enfríen los buenos clientes.",
      },
      {
        title: "Amanda recibe",
        body: "Cierre de clientes. El correo de entrada (y el texto cuando esté en vivo) llega al escritorio. Ella redacta la respuesta. Tú apruebas antes de enviar.",
      },
    ],
    stillsOwner: "Cada escritorio te deja el control. Tú decides. Nada se envía ni se publica sin ti.",
    stillsFooter: "Pequeño negocio · Mayores oportunidades · Con Atlas",
    stills: [
      {
        src: "/marketing/desk-stills/follow-up-drafts.webp",
        name: "AMANDA",
        label: "borradores de entrada que tú apruebas",
        caption: "Aprobar · Editar · Eliminar. Nada se envía sin ti.",
        alt: "Borradores de seguimiento de Amanda con Aprobar, Editar y Eliminar en el escritorio de Atlas",
      },
      {
        src: "/marketing/desk-stills/hunter-review-pile.webp",
        name: "HUNTER",
        label: "negocios que te pueden mandar trabajo",
        caption: "Pila de revisión antes de Prospectos",
        alt: "Pila de revisión de HUNTER en el escritorio de Atlas",
      },
      {
        src: "/marketing/desk-stills/micah-gallery.webp",
        name: "MICAH",
        label: "borradores de contenido semanal",
        caption: "Tarjetas del día · Copiar/Descargar — nunca una publicación en vivo",
        alt: "Galería social MICAH con flyers, pies de foto y Copiar / Descargar — borradores de Instagram y Facebook para un dueño local",
      },
    ],
    denStillAlt:
      "Resumen del Lion’s Den para Massive Action Maintenance con el menú del escritorio — Summary, Prospects, Clients, Follow-up, Calendar, Notes, HUNTER, MICAH — y conteos llenos de Prospects, HUNTER, Follow-up y MICAH",
  },
};

function DeskSummaryStill({ alt }: { alt: string }) {
  return (
    <figure className="atlas-den-still">
      <div className="atlas-den-still-frame">
        <Image
          alt={alt}
          className="atlas-den-still-image"
          fill
          sizes="(max-width: 820px) 100vw, 58vw"
          src="/marketing/desk-stills/lions-den-summary.webp"
        />
      </div>
    </figure>
  );
}

export function AtlasHomepage({ initialLanguage = "en" }: { initialLanguage?: SiteLanguage }) {
  const language = useSiteLanguage(initialLanguage);
  const t = copy[language];

  return (
    <div className="atlas-site">
      <RecoveryLinkRedirect />
      <SiteHeader active="home" initialLanguage={initialLanguage} />

      <main>
        <section className="atlas-hero-section" aria-labelledby="atlas-title">
          <div className="atlas-wrap atlas-hero-grid">
            <div className="atlas-hero-copy">
              <p className="atlas-kicker">{t.eyebrow}</p>
              <h1 id="atlas-title">{t.headline}</h1>
              <p className="atlas-hero-lede">{t.heroCopy}</p>
              <article className="atlas-hero-example">
                <span aria-hidden="true" className="atlas-hero-example-icon">
                  <svg fill="none" viewBox="0 0 24 24">
                    <path d="M6.6 3.2c.4-.4 1.1-.5 1.6-.1l2.2 1.6c.5.3.7 1 .4 1.5L9.7 8.6c-.2.4-.1.8.1 1.2 1 1.6 2.4 3 4 4 .4.2.8.3 1.2.1l2.4-1.1c.5-.3 1.2-.1 1.5.4l1.6 2.2c.4.5.3 1.2-.1 1.6l-1.3 1.3c-.6.6-1.5.9-2.4.7-2.2-.4-5.3-2-8-4.7S4.8 8.3 4.4 6.1c-.2-.9.1-1.8.7-2.4z" fill="currentColor" />
                  </svg>
                </span>
                <p>{t.example}</p>
              </article>
              <div className="atlas-hero-plans" aria-label={language === "es" ? "Planes mensuales" : "Monthly plans"}>
                {atlasPricingPlans.map((plan) => (
                  <article
                    className={plan.featured ? "atlas-hero-plan featured" : "atlas-hero-plan"}
                    key={plan.slug}
                  >
                    {plan.featured ? <span className="atlas-hero-plan-tag">{t.mostPopular}</span> : null}
                    <span className="atlas-hero-plan-name">{plan.name.replace(/^ATLAS\s+/, "")}</span>
                    <strong className="atlas-hero-plan-price">${plan.monthlyPrice}</strong>
                    <span className="atlas-hero-plan-period">{t.perMonth}</span>
                  </article>
                ))}
              </div>
              <div className="atlas-hero-actions">
                <Link className="atlas-button gold" href={withSiteLanguage("/start-trial", language)}>{t.trial}</Link>
              </div>
              <p className="atlas-hero-path">{t.afterTrial}</p>
              <p className="atlas-hero-optional">
                {t.assessmentPrompt}{" "}
                <Link href={withSiteLanguage("/assessment", language)}>{t.assessmentLink}</Link>
              </p>
            </div>
            <div className="atlas-hero-art" aria-label={language === "es" ? "Atlas carga con el negocio" : "Atlas carries the business"}>
              <div className="atlas-sun" />
              <Image
                alt={language === "es" ? "Los plomeros, dueños de HVAC, barberos, instructores y agentes inmobiliarios a quienes sirve Atlas" : "The plumbers, HVAC owners, barbers, swim instructors, and realtors Atlas serves"}
                className="atlas-service-collage"
                src="/atlas-service-industry-collage-landscape.png"
                width={1536}
                height={864}
                priority
              />
              <Image className="atlas-hero-figure" alt={language === "es" ? "León de Atlas cargando el mundo" : "Atlas lion carrying a globe"} src="/atlas-holding-globe-tight.png" width={799} height={1008} priority />
            </div>
          </div>
        </section>

        <section className="atlas-principles" aria-label={language === "es" ? "Principios de Atlas" : "Atlas principles"}>
          <div className="atlas-wrap atlas-principles-grid">
            {t.principles.map((principle, index) => <article key={principle}><b>{String(index + 1).padStart(2, "0")}</b><span>{principle}</span></article>)}
          </div>
        </section>

        <section className="atlas-audience-section atlas-wrap" id="who" aria-labelledby="audience-title">
          <h2 id="audience-title">{t.peopleTitle}</h2>
          <div className="atlas-audience-grid">
            {t.people.map((person, index) => <article key={person.name}><span className="atlas-audience-icon"><IndustryGlyph index={index} /></span><strong>{person.name}</strong></article>)}
          </div>
        </section>

        <section className="atlas-workflow-section atlas-wrap" id="how" aria-labelledby="workflow-title">
          <h2 id="workflow-title">{t.howTitle}</h2>
          <p className="atlas-workflow-lede">{t.howOutcome}</p>
          <div className="atlas-workflow-grid">
            {t.workflow.map((step, index) => <article key={step.title}>
              <span className="atlas-workflow-symbol" aria-hidden="true">
                <span className="atlas-workflow-count">{step.mark}</span>
              </span>
              <p>{step.body}</p>
            </article>)}
          </div>
        </section>

        <section className="atlas-den-section atlas-wrap" id="den" aria-labelledby="den-title">
          <div className="atlas-den-copy">
            <p className="atlas-section-label">{t.denTitle}</p>
            <h2 id="den-title">{t.denCopy}</h2>
            <ul>{t.denPoints.map((point) => <li key={point}>{point}</li>)}</ul>
            <Link className="atlas-button gold compact" href={withSiteLanguage("/login", language)}>{t.denCta}</Link>
            <p className="atlas-den-note">{t.denCtaNote}</p>
          </div>
          <DeskSummaryStill alt={t.denStillAlt} />
        </section>

        <section className="atlas-desks-section atlas-stills-section" id="desk-stills" aria-labelledby="stills-title">
          <div className="atlas-wrap">
            <div className="atlas-desks-head">
              <p className="atlas-section-label">{t.stillsLabel}</p>
              <h2 id="stills-title">{t.stillsTitle}</h2>
              <p className="atlas-desks-lede">{t.stillsLede}</p>
            </div>
            <div className="atlas-desks-cards">
              {t.stillsCards.map((card, index) => (
                <article key={card.title}>
                  <span className="atlas-desks-icon"><DeskGlyph index={index} /></span>
                  <strong>{card.title}</strong>
                  <p>{card.body}</p>
                </article>
              ))}
            </div>
            <div className="atlas-stills-grid">
              {t.stills.map((still) => (
                <figure className="atlas-still-card" key={still.src}>
                  <div className="atlas-still-frame">
                    <Image
                      alt={still.alt}
                      className="atlas-still-image"
                      fill
                      sizes="(max-width: 820px) 100vw, 33vw"
                      src={still.src}
                    />
                  </div>
                  <figcaption>
                    <strong>{still.name} — {still.label}</strong>
                    <span>{still.caption}</span>
                  </figcaption>
                </figure>
              ))}
            </div>
            <ol className="atlas-desks-workflow" aria-label={language === "es" ? "Flujo del escritorio" : "Desk workflow"}>
              {t.stillsWorkflow.map((step, index) => (
                <li key={step}>
                  {index > 0 ? <span aria-hidden="true" className="atlas-desks-arrow">→</span> : null}
                  <span className="atlas-desks-chip">{step}</span>
                </li>
              ))}
            </ol>
            <p className="atlas-desks-owner">{t.stillsOwner}</p>
            <p className="atlas-desks-footer">{t.stillsFooter}</p>
          </div>
        </section>

        <section className="atlas-family-section" id="family" aria-labelledby="family-title">
          <div className="atlas-wrap atlas-family-grid">
            <div className="atlas-family-copy">
              <h2 id="family-title"><span>{t.closingTitle[0]}</span><strong>{t.closingTitle[1]}</strong></h2>
              <p>{t.closingCopy}</p>
            </div>
            <div className="atlas-family-art">
              <Image
                alt={language === "es" ? "Partidos, recitales de teatro y conciertos familiares en los que puedes estar presente" : "Baseball games, theater recitals, and band recitals families can be present for"}
                src="/atlas-family-moments-collage-landscape.png"
                width={1536}
                height={864}
              />
              <Image className="atlas-family-atlas" alt={language === "es" ? "Atlas carga con el negocio" : "Atlas carries the business"} src="/atlas-holding-globe-tight.png" width={799} height={1008} />
            </div>
          </div>
        </section>

        <section className="atlas-outcome-section" id="resources">
          <div className="atlas-outcome-stats">{t.stats.map((stat) => <article key={stat.label}><strong>{stat.value}</strong><span>{stat.label}</span></article>)}</div>
          <Link className="atlas-outcome-cta" href={withSiteLanguage("/start-trial", language)}><span>{t.bottomCta}</span><span aria-hidden="true" className="atlas-outcome-arrow">→</span></Link>
        </section>
      </main>

      <aside className="atlas-bottom-bar"><div className="atlas-wrap"><span>ATLAS</span><strong>{language === "es" ? "TÚ LIDERAS. ATLAS TE RESPALDA." : "YOU LEAD. ATLAS HAS YOUR BACK."}</strong><Link href={withSiteLanguage("/start-trial", language)}>{t.bottomCta}</Link></div></aside>
    </div>
  );
}


