import Link from "next/link";
import type { Metadata } from "next";
import {
  LegalList,
  LegalPage,
  LegalSection,
  legalLinkClass,
} from "@/components/legal-page";
import { getSiteLanguage } from "@/lib/site-language-server";

export async function generateMetadata(): Promise<Metadata> {
  const language = await getSiteLanguage();

  return {
    title: language === "es" ? "IA responsable y revisión humana | Atlas para emprendedores" : "Responsible AI & Human Review | Atlas For Entrepreneurs",
    description:
      language === "es"
        ? "Cómo Atlas incorpora flujos empresariales con asistencia de IA, revisión humana, controles de aprobación y límites claros."
        : "How Atlas introduces AI-assisted business workflows with human review, approval controls, and clear limits.",
  };
}

export default async function ResponsibleAiPage() {
  const language = await getSiteLanguage();
  const spanish = language === "es";
  const principles = spanish
    ? [["Aprobación humana", "Los borradores permanecen bajo tu control antes de tomar una acción externa."], ["Alcance en lenguaje claro", "Ves qué hará Atlas, qué no hará y cuánto cuesta."], ["Datos mínimos necesarios", "Un flujo debe usar solo la información razonablemente necesaria para su propósito."], ["Incorporación medida", "Las capacidades se agregan después de definirlas, probarlas y hacerlas revisables."]]
    : [["Human approval", "Drafts stay under your control before an external action is taken."], ["Plain-language scope", "You see what Atlas will do, what it will not do, and what it costs."], ["Minimum necessary data", "A workflow should use only the information reasonably needed for its purpose."], ["Measured introduction", "Capabilities are added after they are scoped, tested, and reviewable."]];
  return (
    <LegalPage
      eyebrow={spanish ? "Confianza por diseño" : "Trust by design"}
      language={language}
      lastUpdated={spanish ? "15 de julio de 2026" : "July 15, 2026"}
      summary={spanish ? "Atlas incorpora la IA en etapas prácticas. El objetivo es brindar apoyo empresarial útil con responsabilidad clara, no automatizar por automatizar." : "Atlas introduces AI in practical stages. The goal is useful business support with clear ownership—not automation for its own sake."}
      title={spanish ? "IA responsable y revisión humana" : "Responsible AI & Human Review"}
    >
      <section className="grid gap-5 sm:grid-cols-2">
        {principles.map(([title, description]) => (
          <article
            className="rounded-3xl border border-[#b9ddcd] bg-white p-6 shadow-sm"
            key={title}
          >
            <h2 className="text-xl font-black text-[#071b42]">{title}</h2>
            <p className="mt-3 text-sm leading-6 text-slate-600">{description}</p>
          </article>
        ))}
      </section>

      <LegalSection title={spanish ? "Lo que Atlas es hoy" : "What Atlas is today"}>
        <p>
          {spanish ? "Atlas es un piloto de operaciones empresariales dirigido por su fundador, con espacio de trabajo privado, recepción de evaluaciones, planificación, acciones, historial de revisión de borradores y controles de aprobación para clientes. Parte del trabajo puede ser preparado por una persona, asistido por software o asistido por IA cuando se incluya en un flujo de trabajo aprobado." : "Atlas is a founder-led business operations pilot with a private workspace, assessment intake, planning, actions, draft-review history, and client approval controls. Some work may be prepared by a person, assisted by software, or assisted by AI when included in an approved workflow."}
        </p>
        <p>
          {spanish ? "Atlas coordina funciones empresariales. No es un empleado humano y no afirma que todas las funciones sean totalmente autónomas. La evaluación pública se revisa antes de recomendar un alcance pagado. El sitio web actual no envía automáticamente las evaluaciones a un modelo de IA externo." : "Atlas coordinates business functions. It is not a human employee and does not claim that every function is fully autonomous. The public assessment is reviewed before a paid scope is recommended. The current website does not automatically send assessment submissions to an external AI model."}
        </p>
      </LegalSection>

      <LegalSection title={spanish ? "Aprobación antes de una acción externa" : "Approval before external action"}>
        <p>
          {spanish ? "Atlas no publica automáticamente una publicación, envía mensajes a un prospecto, compra publicidad, cambia un sitio web público ni inicia contacto solo porque exista un borrador o una recomendación. Una acción externa requiere la aprobación definida para ese flujo de trabajo." : "Atlas does not automatically publish a post, message a prospect, purchase advertising, change a public website, or start outreach merely because a draft or recommendation exists. An external action requires the approval defined for that workflow."}
        </p>
        <p>{spanish ? "Antes de incorporar un flujo conectado, Atlas busca identificar:" : "Before introducing a connected workflow, Atlas aims to identify:"}</p>
        <LegalList>
          {spanish ? <><li>el propósito empresarial y el resultado esperado;</li><li>la información y el proveedor externo necesarios;</li><li>la persona responsable de la revisión y aprobación final;</li><li>la acción que Atlas puede tomar después de la aprobación; y</li><li>los límites de uso y costos externos cobrados por separado.</li></> : <><li>the business purpose and expected outcome;</li><li>the information and external provider required;</li><li>the person responsible for review and final approval;</li><li>the action Atlas may take after approval; and</li><li>usage limits and separately billed external costs.</li></>}
        </LegalList>
      </LegalSection>

      <LegalSection title={spanish ? "Precisión y responsabilidad humana" : "Accuracy and human responsibility"}>
        <p>
          {spanish ? "El resultado asistido por IA puede ser incorrecto, incompleto, estar desactualizado, ser sesgado o demasiado genérico. Una respuesta pulida no demuestra que sea precisa. Los nombres, fechas, datos de contacto, afirmaciones, precios, citas y decisiones deben comprobarse con fuentes confiables antes de usarlos." : "AI-assisted output can be wrong, incomplete, outdated, biased, or too generic. A polished answer is not proof that it is accurate. Names, dates, contact details, claims, prices, citations, and decisions should be checked against reliable sources before use."}
        </p>
        <p>
          {spanish ? "El apoyo de Atlas no reemplaza el criterio del dueño del negocio ni de un profesional debidamente autorizado. El resultado de IA no debe ser la única base para decisiones legales, médicas, financieras, crediticias, de seguros, laborales, de vivienda u otras decisiones de alto impacto." : "Atlas support does not replace the judgment of the business owner or an appropriately licensed professional. AI output should not be the sole basis for legal, medical, financial, credit, insurance, employment, housing, or other high-impact decisions."}
        </p>
      </LegalSection>

      <LegalSection title={spanish ? "Cuidado de los datos" : "Data care"}>
        <p>
          {spanish ? "Atlas busca recopilar y usar solo la información razonablemente necesaria para un propósito empresarial aprobado. No envíes contraseñas, números de tarjetas de pago, identificadores gubernamentales, expedientes médicos ni otra información personal altamente sensible, salvo que un flujo revisado por separado la requiera y proteja específicamente." : "Atlas aims to collect and use only information reasonably necessary for an approved business purpose. Do not submit passwords, payment card numbers, government identifiers, health records, or other highly sensitive personal information unless a separately reviewed workflow specifically requires and protects it."}
        </p>
        <p>
          {spanish ? "Si un flujo futuro envía información de clientes a un proveedor externo de IA o datos, Atlas describirá el propósito y el punto de aprobación antes de activar ese flujo. Hay más detalles en la " : "If a future workflow will send client information to an external AI or data provider, Atlas will describe the purpose and approval point before that workflow is activated. Additional details appear in the "}
          <Link className={legalLinkClass} href="/privacy">
            {spanish ? "Política de privacidad" : "Privacy Policy"}
          </Link>
          .
        </p>
      </LegalSection>

      <LegalSection title={spanish ? "Usos que Atlas no apoyará" : "Uses Atlas will not support"}>
        <LegalList>
          {spanish ? <><li>reseñas falsas, testimonios engañosos, suplantación o evidencia fabricada;</li><li>spam ilegal, acoso o contacto automatizado no autorizado;</li><li>discriminación ilegal o decisiones automatizadas de alto impacto prohibidas;</li><li>malware, robo de credenciales, fraude, abuso de vigilancia u otros daños;</li><li>uso de información confidencial o personal sin autorización; o</li><li>afirmaciones de que la IA garantiza crecimiento empresarial, prospectos, ingresos o ganancias.</li></> : <><li>fake reviews, deceptive testimonials, impersonation, or fabricated evidence;</li><li>unlawful spam, harassment, or unauthorized automated outreach;</li><li>illegal discrimination or prohibited high-impact automated decisions;</li><li>malware, credential theft, fraud, surveillance abuse, or other harm;</li><li>use of confidential or personal information without authority; or</li><li>claims that AI guarantees business growth, leads, revenue, or profit.</li></>}
        </LegalList>
      </LegalSection>

      <LegalSection title={spanish ? "Preguntas y preocupaciones" : "Questions and concerns"}>
        <p>
          {spanish ? "Si una recomendación de Atlas parece inexacta, insegura, no autorizada o incompatible con estos principios, deja de usarla y escribe a " : "If an Atlas recommendation appears inaccurate, unsafe, unauthorized, or inconsistent with these principles, stop using the output and email "}
          <a className={legalLinkClass} href="mailto:hello@siscustomcreations.com">
            atlasforentrepreneurs@gmail.com
          </a>
          {spanish ? ". Atlas revisará la preocupación y, cuando corresponda, corregirá el flujo de trabajo o restringirá su uso." : ". Atlas will review the concern and, where appropriate, correct the workflow or restrict its use."}
        </p>
      </LegalSection>
    </LegalPage>
  );
}
