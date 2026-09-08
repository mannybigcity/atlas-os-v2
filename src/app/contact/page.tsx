import type { Metadata } from "next";
import Link from "next/link";
import {
  LegalList,
  LegalPage,
  LegalSection,
  legalLinkClass,
} from "@/components/legal-page";
import { withSiteLanguage } from "@/lib/site-language";
import { getSiteLanguage } from "@/lib/site-language-server";

const CONTACT_EMAIL = "atlasforentrepreneurs@gmail.com";

export async function generateMetadata(): Promise<Metadata> {
  const language = await getSiteLanguage();

  return {
    title: language === "es" ? "Contacto | Atlas para emprendedores" : "Contact | Atlas For Entrepreneurs",
    description:
      language === "es"
        ? "Escribe a Atlas para preguntas sobre la prueba gratuita, los planes, la evaluación del negocio, privacidad o accesibilidad."
        : "Reach Atlas with questions about the free trial, plans, the business assessment, privacy, or accessibility.",
    alternates: { canonical: "https://atlasforentrepreneurs.com/contact" },
  };
}

export default async function ContactPage() {
  const language = await getSiteLanguage();
  const spanish = language === "es";

  return (
    <LegalPage
      eyebrow={spanish ? "Estamos aquí para ayudar" : "We are here to help"}
      language={language}
      lastUpdated={spanish ? "8 de septiembre de 2026" : "September 8, 2026"}
      summary={
        spanish
          ? "Atlas es un negocio dirigido por su fundador. Los mensajes los lee una persona y se responden en orden de llegada, normalmente dentro de un día hábil."
          : "Atlas is founder-led. Messages are read by a person and answered in the order they arrive, usually within one business day."
      }
      title={spanish ? "Contacto" : "Contact Atlas"}
    >
      <LegalSection title={spanish ? "Correo electrónico" : "Email"}>
        <p>
          {spanish ? "Para cualquier pregunta, escribe a " : "For any question, email "}
          <a className={legalLinkClass} href={`mailto:${CONTACT_EMAIL}`}>
            {CONTACT_EMAIL}
          </a>
          .{" "}
          {spanish
            ? "Incluye el nombre de tu negocio y el correo que usaste para la prueba o la evaluación para que podamos encontrar tu espacio de trabajo rápido."
            : "Include your business name and the email you used for the trial or assessment so we can find your workspace quickly."}
        </p>
        <p>{spanish ? "Asuntos sugeridos para que tu mensaje llegue a la persona correcta:" : "Suggested subject lines so your message reaches the right place:"}</p>
        <LegalList>
          <li>
            <span className="font-semibold text-[#071b42]">{spanish ? "Prueba gratuita" : "Free trial"}</span>
            {spanish ? " — acceso, verificación de correo o preguntas sobre el escritorio inicial." : " — access, email verification, or questions about the starter desk."}
          </li>
          <li>
            <span className="font-semibold text-[#071b42]">{spanish ? "Planes y facturación" : "Plans and billing"}</span>
            {spanish ? " — BASIC, GROW, UNLIMITED, cambios de plan o cancelación." : " — BASIC, GROW, UNLIMITED, plan changes, or cancellation."}
          </li>
          <li>
            <span className="font-semibold text-[#071b42]">{spanish ? "Solicitud de privacidad" : "Privacy request"}</span>
            {spanish ? " — acceso, corrección o eliminación de tu información." : " — access, correction, or deletion of your information."}
          </li>
          <li>
            <span className="font-semibold text-[#071b42]">{spanish ? "Solicitud de accesibilidad" : "Accessibility request"}</span>
            {spanish ? " — si una página o formulario no funciona con tu tecnología de asistencia." : " — if a page or form does not work with your assistive technology."}
          </li>
        </LegalList>
      </LegalSection>

      <LegalSection title={spanish ? "¿Todavía no eres cliente?" : "Not a client yet?"}>
        <p>
          {spanish
            ? "La forma más rápida de ver si Atlas encaja con tu negocio es probarlo. No se requiere tarjeta."
            : "The fastest way to see whether Atlas fits your business is to try it. No card required."}
        </p>
        <LegalList>
          <li>
            <Link className={legalLinkClass} href={withSiteLanguage("/start-trial", language)}>
              {spanish ? "Iniciar prueba gratuita de 7 días" : "Start the 7-day free trial"}
            </Link>
          </li>
          <li>
            <Link className={legalLinkClass} href={withSiteLanguage("/assessment", language)}>
              {spanish ? "Completar la evaluación del negocio" : "Complete the business assessment"}
            </Link>
          </li>
          <li>
            <Link className={legalLinkClass} href={withSiteLanguage("/pricing", language)}>
              {spanish ? "Comparar planes y precios" : "Compare plans and pricing"}
            </Link>
          </li>
        </LegalList>
      </LegalSection>

      <LegalSection title={spanish ? "¿Ya eres cliente?" : "Already a client?"}>
        <p>
          {spanish ? "Inicia sesión en tu espacio de trabajo desde " : "Sign in to your workspace from "}
          <Link className={legalLinkClass} href={withSiteLanguage("/login", language)}>
            {spanish ? "Acceso del cliente" : "Client Login"}
          </Link>
          .{" "}
          {spanish
            ? "Si no puedes entrar, usa el enlace de restablecer contraseña en la página de acceso o escríbenos con el asunto “Prueba gratuita”."
            : "If you cannot get in, use the reset password link on the login page or email us with the subject “Free trial”."}
        </p>
      </LegalSection>
    </LegalPage>
  );
}
