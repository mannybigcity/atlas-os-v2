import type { Metadata } from "next";
import Link from "next/link";
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
    title: language === "es" ? "Política de privacidad | Atlas para emprendedores" : "Privacy Policy | Atlas For Entrepreneurs",
    description:
      language === "es"
        ? "Conoce cómo Atlas para emprendedores recopila, usa, comparte y protege la información."
        : "Learn how Atlas For Entrepreneurs collects, uses, shares, and protects information.",
  };
}

export default async function PrivacyPage() {
  const language = await getSiteLanguage();
  const spanish = language === "es";

  return (
    <LegalPage
      eyebrow={spanish ? "Privacidad y datos" : "Privacy & data"}
      language={language}
      lastUpdated={spanish ? "16 de julio de 2026" : "July 16, 2026"}
      summary={spanish ? "Esta política explica qué recopila Atlas, por qué lo necesita, cuándo puede compartirlo y qué opciones tienen los prospectos de evaluación y los usuarios del espacio de trabajo." : "This policy explains what Atlas collects, why it is needed, when it may be shared, and the choices available to assessment prospects and client workspace users."}
      title={spanish ? "Política de privacidad" : "Privacy Policy"}
    >
      <LegalSection title={spanish ? "1. Alcance" : "1. Scope"}>
        <p>
          {spanish ? "Esta Política de privacidad se aplica a Atlas para emprendedores (“Atlas”, “nosotros” o “nuestro”), este sitio web, la evaluación empresarial gratuita y los espacios de trabajo de clientes de Atlas. No reemplaza un acuerdo escrito independiente que pueda aplicarse a los servicios pagados para clientes." : "This Privacy Policy applies to Atlas For Entrepreneurs (“Atlas,” “we,” “us,” or “our”), this website, the free business assessment, and Atlas client workspaces. It does not replace a separate written agreement that may apply to paid client services."}
        </p>
        <p>
          {spanish ? "Atlas está diseñado para dueños de negocios y usuarios empresariales autorizados en Estados Unidos. No está destinado a usos personales, domésticos, médicos, financieros, laborales, crediticios ni a otras decisiones reguladas." : "Atlas is designed for business owners and authorized business users in the United States. It is not intended for personal, household, medical, financial, employment, credit, or other regulated decision-making uses."}
        </p>
      </LegalSection>

      <LegalSection title={spanish ? "2. Información que recopilamos" : "2. Information we collect"}>
        <p>{spanish ? "Según cómo uses Atlas, podemos recopilar:" : "Depending on how you use Atlas, we may collect:"}</p>
        <LegalList>
          <li>
            <strong>{spanish ? "Información de evaluación:" : "Assessment information:"}</strong>{" "}{spanish ? "descripción del negocio, cliente ideal, fuentes de clientes, desafíos, metas, intereses de evaluación, tamaño del negocio, uso actual de IA y plazos." : "your description of the business, ideal customer, customer sources, challenges, goals, evaluation interests, business size, current AI use, and timing."}
          </li>
          <li>
            <strong>{spanish ? "Información de contacto y negocio:" : "Contact and business information:"}</strong>{" "}{spanish ? "nombre, nombre del negocio, correo electrónico, teléfono, sitio web, enlaces o identificadores públicos opcionales de redes sociales y consentimiento para contactarte." : "name, business name, email address, telephone number, website, optional public social media links or handles, and consent to be contacted."}
          </li>
          <li>
            <strong>{spanish ? "Información de cuenta y espacio de trabajo:" : "Account and workspace information:"}</strong>{" "}{spanish ? "correo de acceso, membresía de organización, perfil del negocio, planes, acciones, borradores, decisiones de revisión, mensajes, notas y registros de actividad creados al prestar el servicio." : "login email, organization membership, business profile, plans, actions, drafts, review decisions, messages, notes, and activity records created while providing the service."}
          </li>
          <li>
            <strong>{spanish ? "Información del chat público de Atlas:" : "Public Atlas chat information:"}</strong>{" "}{spanish ? "preguntas enviadas a la vista previa de la página principal, respuestas de Atlas, un identificador temporal de sesión del navegador, estado de respuesta, registros de modelo y uso de tokens, y costo estimado de API usados para operar, limitar y evaluar la vista previa." : "questions submitted to the homepage preview, Atlas replies, a short-lived browser-session identifier, response status, model and token-usage records, and estimated API cost used to operate, limit, and evaluate the preview."}
          </li>
          <li>
            <strong>{spanish ? "Información técnica:" : "Technical information:"}</strong>{" "}{spanish ? "cookies esenciales de autenticación y seguridad, información de solicitudes, dirección IP, información del navegador o dispositivo y registros operativos generados por nuestros proveedores de alojamiento, autenticación y seguridad." : "essential authentication and security cookies, request information, IP address, browser or device information, and operational logs generated by our hosting, authentication, and security providers."}
          </li>
          <li>
            <strong>{spanish ? "Información empresarial pública:" : "Public business information:"}</strong>{" "}{spanish ? "información de un sitio web, perfil social, directorio empresarial u otra fuente pública cuando pides a Atlas evaluar o investigar un negocio." : "information from a website, social profile, business directory, or other public source when you ask Atlas to evaluate or research a business."}
          </li>
        </LegalList>
        <p>
          {spanish ? "Este sitio web actualmente no recopila datos de tarjetas de pago. No envíes contraseñas, números de identificación gubernamental, números de tarjetas de pago, información médica ni información personal sensible mediante una evaluación o mensaje del espacio de trabajo." : "This website does not currently collect payment card details. Please do not submit passwords, government identification numbers, payment card numbers, medical information, or sensitive personal information through an assessment or workspace message."}
        </p>
      </LegalSection>

      <LegalSection title={spanish ? "3. Cómo usamos la información" : "3. How we use information"}>
        <p>{spanish ? "Usamos la información para:" : "We use information to:"}</p>
        <LegalList>
          {spanish ? <><li>recibir y revisar solicitudes de evaluación;</li><li>contactarte sobre la solicitud que enviaste;</li><li>recomendar, prestar y administrar los servicios de Atlas;</li><li>crear y proteger cuentas y espacios de trabajo de organizaciones;</li><li>organizar planes, oportunidades, borradores y revisiones aprobados;</li><li>prevenir el uso indebido, resolver problemas y proteger el servicio;</li><li>mejorar los flujos de trabajo y la atención al cliente de Atlas; y</li><li>cumplir la ley aplicable y hacer cumplir nuestros acuerdos.</li></> : <><li>receive and review assessment requests;</li><li>contact you about the request you submitted;</li><li>recommend, provide, and administer Atlas services;</li><li>create and secure accounts and organization workspaces;</li><li>organize approved plans, opportunities, drafts, and reviews;</li><li>prevent misuse, troubleshoot problems, and protect the service;</li><li>improve Atlas workflows and customer support; and</li><li>comply with applicable law and enforce our agreements.</li></>}
        </LegalList>
        <p>
          {spanish ? "No usamos la información de evaluación para un propósito materialmente distinto sin dar el aviso correspondiente y obtener consentimiento cuando sea necesario." : "We do not use assessment information for a materially different purpose without providing appropriate notice and obtaining consent when required."}
        </p>
      </LegalSection>

      <LegalSection title={spanish ? "4. Cómo compartimos la información" : "4. How information is shared"}>
        <p>
          {spanish ? "Atlas no vende información personal ni la comparte para publicidad conductual entre contextos. Podemos divulgar información solo cuando sea razonablemente necesario para:" : "Atlas does not sell personal information and does not share it for cross-context behavioral advertising. We may disclose information only as reasonably necessary to:"}
        </p>
        <LegalList>
          {spanish ? <><li>usar proveedores para alojamiento web, almacenamiento de bases de datos, autenticación, entrega de correo, seguridad y soporte técnico;</li><li>trabajar con contratistas o asesores profesionales que necesiten la información para apoyar a Atlas y deban protegerla;</li><li>seguir tus instrucciones o completar un flujo de trabajo de cliente aprobado;</li><li>cumplir la ley, un proceso legal o una solicitud gubernamental válida, o proteger derechos, seguridad e integridad del servicio; o</li><li>evaluar o completar una transacción comercial relacionada con Atlas, con la confidencialidad y el aviso correspondientes cuando sean necesarios.</li></> : <><li>use service providers for website hosting, database storage, authentication, email delivery, security, and technical support;</li><li>work with contractors or professional advisers who need the information to support Atlas and are expected to protect it;</li><li>follow your directions or complete an approved client workflow;</li><li>comply with law, legal process, or a valid government request, or protect rights, safety, and service integrity; or</li><li>evaluate or complete a business transaction involving Atlas, subject to appropriate confidentiality and notice where required.</li></>}
        </LegalList>
        <p>
          {spanish ? "Los proveedores procesan información para Atlas conforme a sus propios términos de servicio y obligaciones de seguridad. Atlas sigue siendo responsable de elegir proveedores adecuados para la información y el flujo de trabajo propuesto." : "Service providers process information for Atlas under their own service terms and security obligations. Atlas remains responsible for selecting providers appropriate to the information and proposed workflow."}
        </p>
        <p>
          {spanish ? "Cuando un administrador autorizado de Atlas ejecuta deliberadamente la vista previa de descubrimiento de negocios locales, Atlas envía el tipo de negocio y el área de servicio ingresados a Google Places API. El contenido de los resultados se muestra temporalmente para verificación y no se copia automáticamente al CRM de Atlas. Google puede procesar la información de solicitudes y uso conforme a la " : "When an authorized Atlas administrator deliberately runs the local-business discovery preview, Atlas sends the entered business type and service area to Google Places API. Result content is displayed transiently for verification and is not automatically copied into the Atlas CRM. Google may process request and usage information under the "}
          <a
            className={legalLinkClass}
            href="https://policies.google.com/privacy"
            rel="noreferrer"
            target="_blank"
          >
            {spanish ? "Política de privacidad de Google" : "Google Privacy Policy"}
          </a>
          {spanish ? ". Atlas registra por separado la frase de búsqueda, el número de solicitudes, el número de resultados y la exposición estimada al precio de lista para controlar costos." : ". Atlas separately records the search phrase, request count, result count, and estimated list-price exposure for cost control."}
        </p>
      </LegalSection>

      <LegalSection title={spanish ? "5. Procesamiento con asistencia de IA" : "5. AI-assisted processing"}>
        <p>
          {spanish ? "Enviar una evaluación mediante este sitio web no envía automáticamente la evaluación a un modelo de IA externo, publica contenido, contacta a un prospecto ni toma una decisión empresarial. Las evaluaciones se revisan antes de proponer un alcance pagado." : "Submitting an assessment through this website does not automatically send the assessment to an external AI model, publish content, contact a lead, or make a business decision. Assessment submissions are reviewed before a paid scope is proposed."}
        </p>
        <p>
          {spanish ? "Las preguntas ingresadas en la vista previa del chat público de Atlas se envían a OpenAI para generar la respuesta solicitada. Atlas almacena la pregunta, la respuesta, el estado operativo, el identificador de sesión y el registro de uso para ofrecer la vista previa, prevenir el uso indebido, entender lo que necesitan los prospectos y controlar costos. No ingreses información confidencial o sensible en la vista previa pública." : "Questions entered into the public Atlas chat preview are sent to OpenAI to generate the requested reply. Atlas stores the question, reply, operational status, session identifier, and usage record so we can provide the preview, prevent misuse, understand what prospects need, and control costs. Do not enter confidential or sensitive information into the public preview."}
        </p>
        <p>
          {spanish ? "Si un flujo de trabajo propuesto para clientes usará un proveedor externo de IA o datos, Atlas describirá el propósito, el punto de aprobación y cualquier costo externo cobrado por separado antes de activar ese flujo. Lee nuestra " : "If a proposed client workflow will use an external AI or data provider, Atlas will describe the purpose, approval point, and any separately billed external cost before that workflow is activated. Read our "}
          <Link className={legalLinkClass} href="/responsible-ai">
            {spanish ? "IA responsable y revisión humana" : "Responsible AI & Human Review"}
          </Link>{" "}
          {spanish ? "para conocer los principios operativos actuales." : "page for current operating principles."}
        </p>
      </LegalSection>

      <LegalSection title={spanish ? "6. Cookies y tecnologías similares" : "6. Cookies and similar technology"}>
        <p>
          {spanish ? "Atlas usa cookies necesarias para el acceso seguro, la continuidad de sesión, la recuperación de contraseñas, la prevención de fraude y la aplicación del límite de la vista previa del chat público. Nuestros proveedores de infraestructura también pueden crear registros operativos necesarios para entregar y proteger el sitio web." : "Atlas uses cookies that are necessary for secure sign-in, session continuity, password recovery, fraud prevention, and enforcement of the public chat preview limit. Our infrastructure providers may also create operational logs needed to deliver and secure the website."}
        </p>
        <p>
          {spanish ? "Atlas actualmente no usa cookies publicitarias ni rastreadores de publicidad dirigida entre sitios. Si se agrega analítica no esencial o tecnología publicitaria, esta política y las opciones de consentimiento requeridas se actualizarán antes de iniciar ese uso." : "Atlas does not currently use advertising cookies or cross-site targeted advertising trackers. If nonessential analytics or advertising technology is added, this policy and any required consent choices will be updated before that use begins."}
        </p>
      </LegalSection>

      <LegalSection title={spanish ? "7. Conservación y seguridad" : "7. Retention and security"}>
        <p>
          {spanish ? "Conservamos la información de prospectos durante el tiempo razonablemente necesario para responder, evaluar la compatibilidad, mantener registros comerciales adecuados, prevenir abusos y cumplir obligaciones legales. La información de clientes puede conservarse durante la relación y por un período razonable posterior. Los períodos de conservación varían según el registro y el propósito. Podemos eliminar o desidentificar la información cuando ya no sea razonablemente necesaria, sujeto a requisitos legales, de seguridad, copias de respaldo y resolución de disputas." : "We retain prospect information for as long as reasonably necessary to respond, evaluate fit, maintain appropriate business records, prevent abuse, and meet legal obligations. Client information may be retained for the duration of the relationship and for a reasonable period afterward. Retention periods vary with the record and purpose. We may delete or deidentify information when it is no longer reasonably needed, subject to legal, security, backup, and dispute-resolution requirements."}
        </p>
        <p>
          {spanish ? "Atlas usa salvaguardas administrativas, técnicas y organizativas razonables y adecuadas para la información mantenida, incluidos controles de acceso y restricciones de datos a nivel de organización. Ningún sitio web o sistema de almacenamiento puede garantizar seguridad absoluta." : "Atlas uses reasonable administrative, technical, and organizational safeguards appropriate to the information maintained, including access controls and organization-level data restrictions. No website or storage system can guarantee absolute security."}
        </p>
      </LegalSection>

      <LegalSection title={spanish ? "8. Tus opciones y solicitudes de privacidad" : "8. Your choices and privacy requests"}>
        <p>
          {spanish ? "Según dónde vivas y qué ley aplique, puedes tener derecho a solicitar acceso, corrección, eliminación o una copia portátil de la información personal, y a apelar una decisión sobre una solicitud. También puedes pedir a Atlas que detenga las comunicaciones de marketing no esenciales en cualquier momento." : "Depending on where you live and which law applies, you may have the right to request access to, correction of, deletion of, or a portable copy of personal information, and to appeal a decision about a request. You may also ask Atlas to stop nonessential marketing communications at any time."}
        </p>
        <p>
          {spanish ? "Envía una solicitud por correo a " : "Submit a request by emailing "}
          <a
            className={legalLinkClass}
            href="mailto:atlasforentrepreneurs@gmail.com?subject=Privacy%20request"
          >
            atlasforentrepreneurs@gmail.com
          </a>{" "}
          {spanish ? "con el asunto “Solicitud de privacidad”. Es posible que debamos verificar tu identidad o autoridad antes de actuar. Si se rechaza una solicitud, responde con el asunto “Apelación de privacidad” y explica por qué crees que debe reconsiderarse. Atlas responderá dentro del plazo exigido por la ley aplicable." : "with the subject “Privacy request.” We may need to verify your identity or authority before acting. If a request is denied, reply with the subject “Privacy appeal” and explain why you believe the decision should be reconsidered. Atlas will respond within the time required by applicable law."}
        </p>
      </LegalSection>

      <LegalSection title={spanish ? "9. Menores, cambios y contacto" : "9. Children, changes, and contact"}>
        <p>
          {spanish ? "Atlas es un servicio empresarial y no está dirigido a menores de 13 años. No recopilamos deliberadamente información personal de menores de 13 años. Si crees que un menor envió información, contáctanos para revisarla y eliminarla según corresponda." : "Atlas is a business service and is not directed to children under 13. We do not knowingly collect personal information from children under 13. If you believe a child submitted information, contact us so it can be reviewed and removed as appropriate."}
        </p>
        <p>
          {spanish ? "Podemos actualizar esta política a medida que cambie Atlas. La versión revisada mostrará una nueva fecha de “Última actualización”. Los cambios materiales recibirán un aviso o consentimiento adicional cuando sea necesario." : "We may update this policy as Atlas changes. The revised version will show a new “Last updated” date. Material changes will receive additional notice or consent where required."}
        </p>
        <p>
          {spanish ? "Puedes enviar preguntas o solicitudes de privacidad a " : "Questions or privacy requests may be sent to "}
          <a className={legalLinkClass} href="mailto:atlasforentrepreneurs@gmail.com">
            atlasforentrepreneurs@gmail.com
          </a>
          .
        </p>
      </LegalSection>
    </LegalPage>
  );
}
