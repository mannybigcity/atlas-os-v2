"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

type Language = "en" | "es";

type WorkflowStep = {
  title: string;
  body: string;
  mark: string;
};

type LandingCopy = {
  eyebrow: string;
  headline: [string, string];
  heroCopy: string;
  primary: string;
  secondary: string;
  nav: { how: string; who: string; dashboard: string; pricing: string; resources: string; login: string; action: string };
  principles: string[];
  peopleTitle: string;
  people: { name: string; mark: string }[];
  howTitle: string;
  workflow: WorkflowStep[];
  denTitle: string;
  denCopy: string;
  denPoints: string[];
  denCta: string;
  closingTitle: [string, string];
  closingCopy: string;
  closingBenefits: string[];
  stats: { value: string; label: string }[];
  bottomCta: string;
};

function IndustryGlyph({ index }: { index: number }) {
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
  return <svg aria-hidden="true" className="atlas-audience-svg" viewBox="0 0 24 24">{glyphs[index % glyphs.length]}</svg>;
}

function WorkflowGlyph({ index }: { index: number }) {
  const common = {
    fill: "none",
    stroke: "currentColor",
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    strokeWidth: 2.2,
  };

  const glyphs = [
    <><circle {...common} cx="11" cy="11" r="5.75" /><path {...common} d="M15.2 15.2 19 19" /></>,
    <><path {...common} d="M5.5 7.5A3 3 0 0 1 8.5 4.5h7a3 3 0 0 1 3 3v3a3 3 0 0 1-3 3H13l-3.5 3v-3H8.5a3 3 0 0 1-3-3z" /><path {...common} d="M8 8.5h8" /><path {...common} d="M8 11h5" /></>,
    <><path {...common} d="M6 8a6.5 6.5 0 0 1 11.2-1.8" /><path {...common} d="M16.5 5.8 17.8 8l2.2-1.3" /><path {...common} d="M18 16a6.5 6.5 0 0 1-11.2 1.8" /><path {...common} d="M7.5 18.2 6.2 16 4 17.3" /></>,
    <><path {...common} d="m6.5 12.5 3.2 3.2 7.8-7.8" /><circle {...common} cx="12" cy="12" r="7" /></>,
    <><path {...common} d="M5 16.5 9 12l3 2.6 6-8.1" /><path {...common} d="M16.8 6.5H18.5v1.7" /><path {...common} d="M18 18.5H6" /></>,
  ];

  return <svg aria-hidden="true" className="atlas-workflow-svg" viewBox="0 0 24 24">{glyphs[index % glyphs.length]}</svg>;
}

const copy: Record<Language, LandingCopy> = {
  en: {
    eyebrow: "ATLAS FOR ENTREPRENEURS",
    headline: ["YOU CARRY THE FAMILY.", "ATLAS CARRIES THE BUSINESS."],
    heroCopy:
      "Your AI business partner that helps small businesses find more prospects, follow up faster, and close more deals, so you can be there for what matters most.",
    primary: "SEE ATLAS IN ACTION",
    secondary: "BUILD MY ATLAS",
    nav: {
      how: "How ATLAS Works",
      who: "Who It's For",
      dashboard: "Client Dashboard",
      pricing: "Pricing",
      resources: "Resources",
      login: "Client Login",
      action: "Client Dashboard",
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
    workflow: [
      { title: "Find", body: "ATLAS finds and attracts new prospects and opportunities.", mark: "01" },
      { title: "Respond", body: "ATLAS answers calls, chats, and captures every lead.", mark: "02" },
      { title: "Follow up", body: "ATLAS follows up, sends reminders, and keeps leads warm.", mark: "03" },
      { title: "Close", body: "ATLAS helps book appointments and close more deals.", mark: "04" },
      { title: "Grow", body: "ATLAS gets reviews, brings back customers, and fuels growth.", mark: "05" },
    ],
    denTitle: "CLIENT DASHBOARD",
    denCopy: "Your command center. See what ATLAS is doing, what needs your attention, and what is coming next.",
    denPoints: [
      "Live activity and AI performance",
      "Appointments and follow-ups",
      "Opportunities in pipeline",
      "Tasks and reminders",
      "Reports that drive decisions",
    ],
    denCta: "ENTER THE CLIENT DASHBOARD",
    closingTitle: ["RUN THE BUSINESS.", "MAKE IT TO THE MOMENTS THAT MATTER."],
    closingCopy:
      "ATLAS handles the work that pulls you away: calls, follow-ups, schedules, and more, so you can focus on your customers and your family.",
    closingBenefits: ["More time with family", "Less stress. More control.", "Stronger business. Better life."],
    stats: [
      { value: "24/7", label: "Always working" },
      { value: "0", label: "Missed leads" },
      { value: "+", label: "More deals" },
      { value: "YOU", label: "Stay in control" },
    ],
    bottomCta: "START FREE ASSESSMENT",
  },
  es: {
    eyebrow: "ATLAS PARA EMPRENDEDORES",
    headline: ["TÃƒÆ’Ã…Â¡ CARGAS CON LA FAMILIA.", "ATLAS CARGA CON EL NEGOCIO."],
    heroCopy:
      "Tu socio de negocios con IA ayuda a las pequeÃƒÆ’Ã‚Â±as empresas a encontrar mÃƒÆ’Ã‚Â¡s prospectos, dar seguimiento mÃƒÆ’Ã‚Â¡s rÃƒÆ’Ã‚Â¡pido y cerrar mÃƒÆ’Ã‚Â¡s ventas, para que puedas estar presente en lo que mÃƒÆ’Ã‚Â¡s importa.",
    primary: "VER ATLAS EN ACCIÃƒÆ’Ã¢â‚¬Å“N",
    secondary: "CREAR MI ATLAS",
    nav: {
      how: "CÃƒÆ’Ã‚Â³mo funciona ATLAS",
      who: "Para quiÃƒÆ’Ã‚Â©n es",
      dashboard: "Client Dashboard",
      pricing: "Precios",
      resources: "Recursos",
      login: "Client Login",
      action: "Client Dashboard",
    },
    principles: [
      "Hecho para pequeÃƒÆ’Ã‚Â±as empresas",
      "IA con responsabilidad",
      "AprobaciÃƒÆ’Ã‚Â³n humana cuando importa",
      "Un sistema. MÃƒÆ’Ã‚Âºltiples asistentes de IA.",
    ],
    peopleTitle: "HECHO PARA QUIENES CONSTRUYEN, ENSEÃƒÆ’Ã¢â‚¬ËœAN, SIRVEN, VENDEN, ACTÃƒÆ’Ã…Â¡AN Y PROVEEN.",
    people: [
      { name: "Plomeros", mark: "PL" },
      { name: "DueÃƒÆ’Ã‚Â±os de HVAC", mark: "HV" },
      { name: "Barberos", mark: "BR" },
      { name: "Profesores de piano", mark: "PI" },
      { name: "Instructores de nataciÃƒÆ’Ã‚Â³n", mark: "SW" },
      { name: "Agentes inmobiliarios", mark: "RE" },
      { name: "DJs y organizadores", mark: "DJ" },
    ],
    howTitle: "CÃƒÆ’Ã¢â‚¬Å“MO FUNCIONA ATLAS PARA TU NEGOCIO",
    workflow: [
      { title: "Encuentra", body: "ATLAS encuentra y atrae nuevos prospectos y oportunidades.", mark: "01" },
      { title: "Responde", body: "ATLAS responde llamadas, chats y captura cada prospecto.", mark: "02" },
      { title: "Da seguimiento", body: "ATLAS da seguimiento, envÃƒÆ’Ã‚Â­a recordatorios y mantiene activos a los prospectos.", mark: "03" },
      { title: "Cierra", body: "ATLAS ayuda a agendar citas y a cerrar mÃƒÆ’Ã‚Â¡s ventas.", mark: "04" },
      { title: "Crece", body: "ATLAS obtiene reseÃƒÆ’Ã‚Â±as, recupera clientes e impulsa el crecimiento.", mark: "05" },
    ],
    denTitle: "LA GUARIDA DEL LEÃƒÆ’Ã¢â‚¬Å“N",
    denCopy: "Tu centro de mando. Mira lo que ATLAS estÃƒÆ’Ã‚Â¡ haciendo, lo que necesita tu atenciÃƒÆ’Ã‚Â³n y lo que sigue.",
    denPoints: [
      "Actividad en vivo y rendimiento de IA",
      "Citas y seguimientos",
      "Oportunidades en el pipeline",
      "Tareas y recordatorios",
      "Reportes que impulsan decisiones",
    ],
    denCta: "ENTRA A LA GUARIDA DEL LEÃƒÆ’Ã¢â‚¬Å“N",
    closingTitle: ["MANEJA EL NEGOCIO.", "LLEGA A LOS MOMENTOS QUE IMPORTAN."],
    closingCopy:
      "ATLAS se encarga del trabajo que te aleja: llamadas, seguimientos, agendas y mÃƒÆ’Ã‚Â¡s, para que puedas enfocarte en tus clientes y tu familia.",
    closingBenefits: ["MÃƒÆ’Ã‚Â¡s tiempo con la familia", "Menos estrÃƒÆ’Ã‚Â©s. MÃƒÆ’Ã‚Â¡s control.", "Negocio mÃƒÆ’Ã‚Â¡s fuerte. Mejor vida."],
    stats: [
      { value: "24/7", label: "Siempre trabajando" },
      { value: "0", label: "Prospectos perdidos" },
      { value: "+", label: "MÃƒÆ’Ã‚Â¡s ventas" },
      { value: "TÃƒÆ’Ã…Â¡", label: "Mantienes el control" },
    ],
    bottomCta: "EMPEZAR EVALUACIÃƒÆ’Ã¢â‚¬Å“N GRATIS",
  },
};

function DashboardPreview({ language }: { language: Language }) {
  const spanish = language === "es";

  return (
    <div className="atlas-dashboard" aria-label={spanish ? "Vista previa del panel de clientes" : "Client Dashboard preview"}>
      <aside className="atlas-dashboard-sidebar">
        <div className="atlas-dashboard-wordmark"><span>A</span> ATLAS</div>
        <div className="atlas-dashboard-nav">
          <span className="selected">{spanish ? "Panel" : "Dashboard"}</span>
          <span>{spanish ? "Prospectos" : "Leads"}</span>
          <span>{spanish ? "Conversaciones" : "Conversations"}</span>
          <span>{spanish ? "Oportunidades" : "Opportunities"}</span>
          <span>{spanish ? "Calendario" : "Calendar"}</span>
          <span>{spanish ? "Tareas" : "Tasks"}</span>
          <span>{spanish ? "Clientes" : "Customers"}</span>
          <span>{spanish ? "Reportes" : "Reports"}</span>
        </div>
      </aside>
      <div className="atlas-dashboard-main">
        <div className="atlas-dashboard-greeting">
          <div><strong>{spanish ? "Buenos dÃƒÆ’Ã‚Â­as, Manny" : "Good morning, Manny"}</strong><small>{spanish ? "Esto es lo que estÃƒÆ’Ã‚Â¡ pasando hoy." : "Here is what is happening today."}</small></div>
          <span className="atlas-notification">3</span>
        </div>
        <div className="atlas-dashboard-metrics">
          <article><strong>23</strong><span>{spanish ? "Nuevos prospectos" : "New leads"}</span></article>
          <article><strong>7</strong><span>{spanish ? "Citas agendadas" : "Appointments"}</span></article>
          <article><strong>12</strong><span>{spanish ? "Seguimientos" : "Follow-ups"}</span></article>
          <article><strong>$18,450</strong><span>{spanish ? "En pipeline" : "In pipeline"}</span></article>
        </div>
        <div className="atlas-dashboard-lower">
          <article className="atlas-activity-card">
            <h3>{spanish ? "Actividad reciente" : "Recent activity"}</h3>
            <p><i />{spanish ? "Nuevo prospecto desde el sitio web" : "New lead from website"}<small>2m</small></p>
            <p><i />{spanish ? "Cita agendada" : "Appointment booked"}<small>12m</small></p>
            <p><i />{spanish ? "Seguimiento enviado" : "Follow-up sent"}<small>28m</small></p>
          </article>
          <article className="atlas-pipeline-card">
            <h3>{spanish ? "Resumen del pipeline" : "Pipeline overview"}</h3>
            <div className="atlas-donut"><span /></div>
            <div className="atlas-pipeline-key"><span>New</span><span>Qualified</span><span>Proposal</span></div>
          </article>
        </div>
      </div>
    </div>
  );
}

export function AtlasHomepage() {
  const [language, setLanguage] = useState<Language>("en");
  const t = copy[language];

  return (
    <div className="atlas-site">
      <header className="atlas-header">
        <div className="atlas-wrap atlas-header-inner">
          <Link className="atlas-brand" href="/" aria-label="Atlas For Entrepreneurs home">
            <Image alt="Atlas lion logo" src="/brand/atlas-logo.png" width={720} height={720} priority />
            <span><b>ATLAS</b><small>{language === "es" ? "GUÃƒÆ’Ã‚ÂA. CRECE. VIVE MÃƒÆ’Ã‚ÂS." : "GUIDE. GROW. LIVE MORE."}</small></span>
          </Link>
          <nav className="atlas-primary-nav" aria-label="Primary navigation">
            <a href="#how">{t.nav.how}</a>
            <a href="#who">{t.nav.who}</a>
            <a href="#pricing">{t.nav.pricing}</a>
            <a href="#resources">{t.nav.resources}</a>
          </nav>
          <div className="atlas-header-actions">
            <div className="atlas-language" aria-label="Language selection">
              <button className={language === "en" ? "active" : ""} type="button" onClick={() => setLanguage("en")}>EN</button>
              <button className={language === "es" ? "active" : ""} type="button" onClick={() => setLanguage("es")}>ES</button>
            </div>
            <Link className="atlas-login" href="/atlas-team-live">{t.nav.dashboard}</Link>
            <Link className="atlas-top-cta" href="/login">{t.nav.login}</Link>
          </div>
        </div>
      </header>

      <main>
        <section className="atlas-hero-section" aria-labelledby="atlas-title">
          <div className="atlas-wrap atlas-hero-grid">
            <div className="atlas-hero-copy">
              <p className="atlas-kicker">{t.eyebrow}</p>
              <h1 id="atlas-title"><span>{t.headline[0]}</span><strong>{t.headline[1]}</strong></h1>
              <p className="atlas-hero-lede">{t.heroCopy}</p>
              <div className="atlas-hero-actions">
                <Link className="atlas-button gold" href="/atlas-team-live">{t.primary}</Link>
                <a className="atlas-button outline" href="#how">{t.secondary}</a>
              </div>
            </div>
            <div className="atlas-hero-art" aria-label="Atlas carries the business">
              <div className="atlas-sun" />
              <Image
                alt="The plumbers, HVAC owners, barbers, swim instructors, and realtors Atlas serves"
                className="atlas-service-collage"
                src="/atlas-service-industry-collage-landscape.png"
                width={1536}
                height={864}
                priority
              />
              <Image className="atlas-hero-figure" alt="Atlas lion carrying a globe" src="/atlas-holding-globe-tight.png" width={799} height={1008} priority />
            </div>
          </div>
        </section>

        <section className="atlas-principles" aria-label="Atlas principles">
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
          <div className="atlas-workflow-grid">
            {t.workflow.map((step, index) => <article key={step.title}>
              <span className="atlas-workflow-symbol" role="img" aria-label={`${step.title} workflow marker`}>
                <WorkflowGlyph index={index} />
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
            <Link className="atlas-button gold compact" href="/login">{t.denCta}</Link>
          </div>
          <DashboardPreview language={language} />
        </section>

        <section className="atlas-family-section" id="pricing" aria-labelledby="family-title">
          <div className="atlas-wrap atlas-family-grid">
            <div className="atlas-family-copy">
              <h2 id="family-title"><span>{t.closingTitle[0]}</span><strong>{t.closingTitle[1]}</strong></h2>
              <p>{t.closingCopy}</p>
              <div className="atlas-family-benefits">{t.closingBenefits.map((benefit) => <span key={benefit}>{benefit}</span>)}</div>
            </div>
            <div className="atlas-family-art">
              <Image
                alt="Baseball games, theater recitals, and band recitals families can be present for"
                src="/atlas-family-moments-collage-landscape.png"
                width={1536}
                height={864}
              />
              <Image className="atlas-family-atlas" alt="Atlas carries the business" src="/atlas-holding-globe-tight.png" width={799} height={1008} />
            </div>
          </div>
        </section>

        <section className="atlas-outcome-section atlas-wrap" id="resources">
          <div className="atlas-outcome-stats">{t.stats.map((stat) => <article key={stat.label}><strong>{stat.value}</strong><span>{stat.label}</span></article>)}</div>
          <Link className="atlas-outcome-cta" href="/assessment"><span>{t.bottomCta}</span><span aria-hidden="true" className="atlas-outcome-arrow">→</span></Link>
        </section>
      </main>

      <aside className="atlas-bottom-bar"><div className="atlas-wrap"><span>ATLAS</span><strong>{language === "es" ? "TÃƒÆ’Ã…Â¡ LIDERAS. ATLAS TE RESPALDA." : "YOU LEAD. ATLAS HAS YOUR BACK."}</strong><Link href="/assessment">{t.bottomCta}</Link></div></aside>
    </div>
  );
}


