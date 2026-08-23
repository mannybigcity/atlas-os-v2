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
    title: language === "es" ? "Accesibilidad | Atlas para emprendedores" : "Accessibility | Atlas For Entrepreneurs",
    description:
      language === "es"
        ? "Compromiso de accesibilidad e información de contacto de Atlas para emprendedores."
        : "Atlas For Entrepreneurs accessibility commitment and contact information.",
  };
}

export default async function AccessibilityPage() {
  const language = await getSiteLanguage();
  const spanish = language === "es";

  return (
    <LegalPage
      eyebrow={spanish ? "Acceso para más dueños de negocios" : "Access for more owners"}
      language={language}
      lastUpdated={spanish ? "15 de julio de 2026" : "July 15, 2026"}
      summary={spanish ? "Atlas trabaja para que su sitio web público, evaluación y experiencia de cliente sean comprensibles y utilizables para personas con distintas capacidades y tecnologías." : "Atlas is working to make its public website, assessment, and client experience understandable and usable for people with different abilities and technologies."}
      title={spanish ? "Accesibilidad" : "Accessibility"}
    >
      <LegalSection title={spanish ? "Nuestro compromiso" : "Our commitment"}>
        <p>
          {spanish ? "La accesibilidad es un trabajo continuo, no una insignia de una sola vez. Atlas busca mejorar la experiencia a medida que crece el servicio y responder de forma constructiva cuando se informa una barrera." : "Accessibility is ongoing work, not a one-time badge. Atlas aims to improve the experience as the service grows and to respond constructively when a barrier is reported."}
        </p>
        <p>
          {spanish ? "Esta declaración describe nuestra intención y prácticas actuales. No afirma que cada página haya sido auditada de forma independiente o certificada conforme a un estándar de accesibilidad particular." : "This statement describes our current intent and practices. It is not a claim that every page has been independently audited or certified to a particular accessibility standard."}
        </p>
      </LegalSection>

      <LegalSection title={spanish ? "Prácticas actuales de diseño" : "Current design practices"}>
        <p>{spanish ? "Actualmente Atlas busca proporcionar:" : "Atlas currently works to provide:"}</p>
        <LegalList>
          {spanish ? <><li>encabezados, etiquetas, listas, enlaces y controles de formulario semánticos;</li><li>navegación accesible con teclado y foco visible;</li><li>alternativas de texto para imágenes significativas;</li><li>instrucciones y mensajes de error en lenguaje claro;</li><li>contraste de color legible y texto escalable; y</li><li>diseños adaptables para pantallas de escritorio y móviles.</li></> : <><li>semantic headings, labels, lists, links, and form controls;</li><li>keyboard-accessible navigation and visible focus behavior;</li><li>text alternatives for meaningful images;</li><li>plain-language instructions and error messages;</li><li>readable color contrast and scalable text; and</li><li>responsive layouts for desktop and mobile screens.</li></>}
        </LegalList>
      </LegalSection>

      <LegalSection title={spanish ? "¿Necesitas ayuda o encontraste una barrera?" : "Need help or found a barrier?"}>
        <p>
          {spanish ? "Si no puedes acceder a una parte del sitio web o completar la evaluación, escribe a " : "If you cannot access part of the website or complete the assessment, email "}
          <a className={legalLinkClass} href="mailto:hello@siscustomcreations.com?subject=Accessibility%20request">
            atlasforentrepreneurs@gmail.com
          </a>{" "}
          {spanish ? "con el asunto “Solicitud de accesibilidad”. Describe la página, información o acción que intentabas usar y el formato o asistencia que te ayudaría." : "with the subject “Accessibility request.” Please describe the page, information, or action you were trying to use and the format or assistance that would help."}
        </p>
        <p>
          {spanish ? "Atlas hará un esfuerzo razonable para proporcionar la información o el servicio mediante una alternativa accesible mientras se revisa el problema subyacente." : "Atlas will make a reasonable effort to provide the information or service through an accessible alternative while the underlying issue is reviewed."}
        </p>
      </LegalSection>
    </LegalPage>
  );
}
