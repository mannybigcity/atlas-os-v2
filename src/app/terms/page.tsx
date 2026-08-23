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
    title: language === "es" ? "Términos de uso | Atlas para emprendedores" : "Terms of Use | Atlas For Entrepreneurs",
    description:
      language === "es"
        ? "Términos que rigen el uso del sitio web, la evaluación y el espacio de trabajo de clientes de Atlas para emprendedores."
        : "Terms governing use of the Atlas For Entrepreneurs website, assessment, and client workspace.",
  };
}

export default async function TermsPage() {
  const language = await getSiteLanguage();
  const spanish = language === "es";

  return (
    <LegalPage
      eyebrow={spanish ? "Términos del sitio web" : "Website terms"}
      language={language}
      lastUpdated={spanish ? "16 de julio de 2026" : "July 16, 2026"}
      summary={spanish ? "Estos términos rigen el uso del sitio web de Atlas, la evaluación gratuita y el espacio de trabajo de clientes. Un acuerdo de servicio escrito independiente rige el trabajo pagado." : "These terms govern use of the Atlas website, free assessment, and client workspace. A separate written service agreement governs paid work."}
      title={spanish ? "Términos de uso" : "Terms of Use"}
    >
      <LegalSection title={spanish ? "1. Acuerdo y operador" : "1. Agreement and operator"}>
        <p>
          {spanish ? "Al acceder o usar este sitio web, enviar una evaluación o usar un espacio de trabajo de Atlas, aceptas estos Términos de uso. Si no estás de acuerdo, no uses el servicio." : "By accessing or using this website, submitting an assessment, or using an Atlas workspace, you agree to these Terms of Use. If you do not agree, do not use the service."}
        </p>
        <p>
          {spanish ? "“Atlas”, “nosotros” y “nuestro” significan el operador de la marca de servicios empresariales Atlas para emprendedores. El proveedor identificado en una propuesta o acuerdo de servicio firmado es el proveedor contractual de los servicios pagados, y ese acuerdo escrito prevalece si entra en conflicto con estos términos del sitio web." : "“Atlas,” “we,” “us,” and “our” mean the operator of the Atlas For Entrepreneurs business-services brand. The provider identified in a signed proposal or service agreement is the contracting provider for paid services, and that written agreement controls if it conflicts with these website terms."}
        </p>
      </LegalSection>

      <LegalSection title={spanish ? "2. Elegibilidad y autoridad empresarial" : "2. Eligibility and business authority"}>
        <p>
          {spanish ? "Atlas está destinado a personas de al menos 18 años que usan el servicio para fines empresariales lícitos. Si envías información o aceptas términos en nombre de una empresa u otra persona, declaras que tienes autoridad para hacerlo." : "Atlas is intended for people who are at least 18 years old and are using the service for lawful business purposes. If you submit information or accept terms for a company or another person, you represent that you have authority to do so."}
        </p>
      </LegalSection>

      <LegalSection title={spanish ? "3. Evaluación gratuita y relación con el cliente" : "3. Free assessment and client relationship"}>
        <p>
          {spanish ? "La evaluación empresarial es una herramienta de admisión y evaluación de compatibilidad. Enviarla no crea una relación de consultoría, fiduciaria, de agencia, laboral ni profesional de otro tipo; no garantiza la aceptación; y no obliga a ninguna de las partes a comprar o prestar servicios pagados." : "The business assessment is an intake and fit-evaluation tool. Submitting it does not create a consulting, fiduciary, agency, employment, or other professional relationship; does not guarantee acceptance; and does not obligate either party to purchase or provide paid services."}
        </p>
        <p>
          {spanish ? "La evaluación no cobra ningún pago y no inicia automáticamente una suscripción. El trabajo pagado comienza solo después de que las partes acuerden por escrito el alcance, los entregables, el precio, los plazos, el proceso de aprobación y los términos de pago." : "No payment is collected by the assessment and no subscription begins automatically. Paid work starts only after the parties agree to a written scope, deliverables, price, timing, approval process, and payment terms."}
        </p>
        <p>
          {spanish ? "El chat público de Atlas es una vista previa limitada, no un servicio de consultoría pagado. Las preguntas y respuestas pueden conservarse para operar y proteger la vista previa, entender necesidades empresariales comunes y controlar el uso de la API. El acceso a la vista previa puede estar limitado o no disponible, y su resultado debe revisarse antes de usarlo." : "The public Atlas chat is a limited preview, not a paid consulting engagement. Questions and replies may be retained to operate and secure the preview, understand common business needs, and control API usage. Preview access may be limited or unavailable, and its output must be reviewed before use."}
        </p>
      </LegalSection>

      <LegalSection title={spanish ? "4. Precios, cancelaciones y reembolsos" : "4. Pricing, cancellations, and refunds"}>
        <p>
          {spanish ? "Los precios públicos describen las estructuras actuales de las ofertas y pueden estar sujetos a disponibilidad, elegibilidad, límites de alcance y costos externos aprobados por separado. Una propuesta o acuerdo de servicio indicará el precio final antes de comenzar el trabajo pagado." : "Public prices describe current offer structures and may be subject to availability, eligibility, scope boundaries, and separately approved external costs. A proposal or service agreement will state the final price before paid work begins."}
        </p>
        <p>
          {spanish ? "Las reglas de cancelación, reprogramación, renovación y reembolso del trabajo pagado se indicarán en la propuesta o acuerdo de servicio aplicable. Atlas no promete un reembolso que no esté escrito en ese acuerdo." : "Cancellation, rescheduling, renewal, and refund rules for paid work will be stated in the applicable proposal or service agreement. Atlas does not make a refund promise that is not written into that agreement."}
        </p>
      </LegalSection>

      <LegalSection title={spanish ? "5. Trabajo con asistencia de IA y revisión humana" : "5. AI-assisted work and human review"}>
        <p>
          {spanish ? "Atlas puede usar una combinación de trabajo humano, software, automatización, información pública y herramientas con asistencia de IA cuando estén incluidas en un alcance aprobado. El material generado o asistido por IA puede estar incompleto, ser inexacto, estar desactualizado, no ser exclusivo o no ser adecuado para un uso particular." : "Atlas may use a combination of human work, software, automation, public information, and AI-assisted tools where included in an approved scope. AI-generated or AI-assisted material can be incomplete, inaccurate, outdated, nonexclusive, or unsuitable for a particular use."}
        </p>
        <p>
          {spanish ? "Sigues siendo responsable de revisar hechos, nombres, fechas, precios, afirmaciones, permisos, requisitos legales y decisiones empresariales antes de usar o aprobar el trabajo. Atlas no publicará contenido automáticamente, contactará a un prospecto, comprará publicidad ni realizará otra acción externa salvo que un flujo de trabajo separado lo autorice expresamente." : "You remain responsible for reviewing facts, names, dates, pricing, claims, permissions, legal requirements, and business decisions before using or approving work. Atlas will not automatically publish content, contact a prospect, purchase advertising, or take another external action unless a separate workflow expressly authorizes it."}
        </p>
        <p>
          {spanish ? "Atlas coordina flujos de trabajo empresariales. No es un empleado humano, y no todas las capacidades son autónomas o están disponibles en todos los planes. Consulta " : "Atlas coordinates business workflows. It is not a human employee, and not every capability is autonomous or available in every plan. See "}
          <Link className={legalLinkClass} href="/responsible-ai">
            {spanish ? "IA responsable y revisión humana" : "Responsible AI & Human Review"}
          </Link>
          .
        </p>
      </LegalSection>

      <LegalSection title={spanish ? "6. Sin asesoría profesional ni resultados garantizados" : "6. No professional advice or guaranteed result"}>
        <p>
          {spanish ? "Atlas brinda apoyo para organización empresarial, investigación, planificación, redacción e implementación. No brinda asesoría profesional legal, fiscal, contable, de inversiones, médica, crediticia, de seguros, laboral ni de otro tipo que requiera licencia. Consulta a un profesional debidamente calificado para esos asuntos." : "Atlas provides business organization, research, planning, drafting, and implementation support. It does not provide legal, tax, accounting, investment, medical, credit, insurance, employment, or other licensed professional advice. Consult an appropriately qualified professional for those matters."}
        </p>
        <p>
          {spanish ? "Los resultados empresariales dependen de muchos factores fuera del control de Atlas. Atlas no garantiza ingresos, ganancias, prospectos, posicionamiento, ventas, financiamiento, respuestas de clientes, ahorro de tiempo ni ningún otro resultado específico." : "Business outcomes depend on many factors outside Atlas&apos;s control. Atlas does not guarantee revenue, profit, leads, rankings, sales, funding, customer responses, time savings, or any other particular result."}
        </p>
      </LegalSection>

      <LegalSection title={spanish ? "7. Tu información y responsabilidades" : "7. Your information and responsibilities"}>
        <p>{spanish ? "Aceptas:" : "You agree to:"}</p>
        <LegalList>
          {spanish ? <><li>proporcionar información razonablemente precisa y actualizada;</li><li>tener los derechos y permisos necesarios para enviar contenido empresarial, información de contacto y material de fuentes públicas;</li><li>proteger las credenciales de la cuenta e informar con prontitud sobre sospechas de uso indebido;</li><li>revisar el trabajo antes de aprobarlo o usarlo; y</li><li>cumplir las normas aplicables de privacidad, publicidad, contacto y de la industria.</li></> : <><li>provide information that is reasonably accurate and current;</li><li>have the rights and permissions needed to submit business content, contact information, and public-source material;</li><li>protect account credentials and promptly report suspected misuse;</li><li>review work before approving or using it; and</li><li>comply with applicable privacy, advertising, outreach, and industry rules.</li></>}
        </LegalList>
        <p>
          {spanish ? "No envíes contraseñas, números de tarjetas de pago, identificadores gubernamentales, expedientes médicos, datos personales altamente sensibles, secretos comerciales de otra persona ni información que no estés autorizado a usar." : "Do not submit passwords, payment card numbers, government identifiers, medical records, highly sensitive personal data, trade secrets belonging to someone else, or information you are not authorized to use."}
        </p>
      </LegalSection>

      <LegalSection title={spanish ? "8. Uso aceptable" : "8. Acceptable use"}>
        <p>{spanish ? "No puedes usar Atlas para:" : "You may not use Atlas to:"}</p>
        <LegalList>
          {spanish ? <><li>infringir la ley, violar los derechos de otra persona o facilitar daños;</li><li>enviar spam ilegal, contacto engañoso o mensajes automatizados no autorizados;</li><li>suplantar a otra persona o crear reseñas o testimonios falsos;</li><li>tomar decisiones automatizadas discriminatorias o de alto impacto prohibidas;</li><li>introducir malware, evadir controles de acceso o interrumpir el servicio;</li><li>extraer o recopilar datos en violación de términos o leyes aplicables; o</li><li>presentar un borrador de Atlas como asesoría profesional verificada.</li></> : <><li>break the law, violate another person&apos;s rights, or facilitate harm;</li><li>send unlawful spam, deceptive outreach, or unauthorized automated messages;</li><li>impersonate another person or create fake reviews or testimonials;</li><li>make prohibited discriminatory or high-impact automated decisions;</li><li>introduce malware, bypass access controls, or disrupt the service;</li><li>scrape or collect data in violation of applicable terms or law; or</li><li>misrepresent an Atlas draft as verified professional advice.</li></>}
        </LegalList>
        <p>
          {spanish ? "Podemos restringir o suspender el acceso cuando sea razonablemente necesario para proteger a clientes, Atlas, terceros o el servicio." : "We may restrict or suspend access when reasonably necessary to protect clients, Atlas, third parties, or the service."}
        </p>
      </LegalSection>

      <LegalSection title={spanish ? "9. Propiedad y permiso para prestar el servicio" : "9. Ownership and permission to provide the service"}>
        <p>
          {spanish ? "Conservas la propiedad del contenido y la información empresarial que envías. Otorgas a Atlas un permiso limitado para alojar, copiar, organizar, transformar y procesar de otro modo ese material solo en la medida razonablemente necesaria para prestar, proteger y respaldar el servicio solicitado." : "You keep ownership of content and business information you submit. You grant Atlas a limited permission to host, copy, organize, transform, and otherwise process that material only as reasonably needed to provide, secure, and support the requested service."}
        </p>
        <p>
          {spanish ? "Atlas conserva los derechos sobre su sitio web, marca, software, métodos generales, plantillas y materiales preexistentes. La propiedad y el uso permitido de los entregables pagados se tratarán en el acuerdo de servicio aplicable." : "Atlas retains rights in its website, brand, software, general methods, templates, and preexisting materials. Ownership and permitted use of paid deliverables will be addressed in the applicable service agreement."}
        </p>
      </LegalSection>

      <LegalSection title={spanish ? "10. Privacidad y servicios de terceros" : "10. Privacy and third-party services"}>
        <p>
          {spanish ? "Nuestra " : "Our "}
          <Link className={legalLinkClass} href="/privacy">
            {spanish ? "Política de privacidad" : "Privacy Policy"}
          </Link>{" "}
          {spanish ? "explica cómo Atlas maneja la información. El servicio depende de proveedores externos aprobados de alojamiento, autenticación, bases de datos, correo electrónico y otros servicios. Sus servicios pueden tener términos, disponibilidad y prácticas de privacidad independientes." : "explains how Atlas handles information. The service relies on third-party hosting, authentication, database, email, and other approved providers. Their services may have separate terms, availability, and privacy practices."}
        </p>
        <p>
          {spanish ? "Atlas no es responsable de un sitio web externo simplemente porque Atlas enlace a él o revise su contenido público." : "Atlas is not responsible for an external website merely because Atlas links to it or reviews its public content."}
        </p>
        <p>
          {spanish ? "Una vista previa privada de investigación de Atlas puede mostrar contenido temporal de Google Maps Platform. Ese contenido se rige por los " : "A private Atlas research preview may display transient Google Maps Platform content. That content is governed by the "}
          <a
            className={legalLinkClass}
            href="https://cloud.google.com/maps-platform/terms"
            rel="noreferrer"
            target="_blank"
          >
            {spanish ? "Términos de Google Maps Platform" : "Google Maps Platform Terms"}
          </a>
          {spanish ? ". El contenido de resultados de Google Maps se proporciona para revisión y verificación; los usuarios no pueden copiarlo masivamente, exportarlo ni crear un directorio separado a partir de él." : ". Google Maps result content is provided for review and verification; users may not bulk-copy, export, or build a separate directory from it."}
        </p>
      </LegalSection>

      <LegalSection title={spanish ? "11. Disponibilidad y exenciones" : "11. Availability and disclaimers"}>
        <p>
          {spanish ? "Atlas se está desarrollando por etapas. Las funciones pueden cambiar, limitarse o descontinuarse. Buscamos mantener el servicio útil y disponible, pero no prometemos un funcionamiento ininterrumpido o sin errores." : "Atlas is being developed in stages. Features may change, be limited, or be discontinued. We aim to keep the service useful and available but do not promise uninterrupted or error-free operation."}
        </p>
        <p>
          {spanish ? "En la máxima medida permitida por la ley, el sitio web, la evaluación y los materiales no pagados se proporcionan “tal cual” y “según disponibilidad”, sin garantías implícitas de comerciabilidad, idoneidad para un propósito particular, titularidad o no infracción. Los derechos que legalmente no puedan renunciarse permanecen intactos." : "To the maximum extent permitted by law, the website, assessment, and unpaid materials are provided “as is” and “as available,” without implied warranties of merchantability, fitness for a particular purpose, title, or noninfringement. Rights that cannot legally be waived remain unaffected."}
        </p>
      </LegalSection>

      <LegalSection title={spanish ? "12. Limitación de responsabilidad" : "12. Limitation of liability"}>
        <p>
          {spanish ? "En la máxima medida permitida por la ley, Atlas no será responsable conforme a estos términos del sitio web por daños indirectos, incidentales, especiales, consecuentes o punitivos, ni por pérdida de ganancias, ingresos, datos, reputación u oportunidades comerciales derivadas del uso del sitio web o de la evaluación no pagada." : "To the maximum extent permitted by law, Atlas will not be liable under these website terms for indirect, incidental, special, consequential, or punitive damages, or for lost profits, revenue, data, goodwill, or business opportunities arising from use of the website or unpaid assessment."}
        </p>
        <p>
          {spanish ? "La responsabilidad relacionada con servicios pagados se regirá por el acuerdo de servicio firmado. Nada en estos términos excluye una responsabilidad que legalmente no pueda limitarse." : "Liability relating to paid services will be governed by the signed service agreement. Nothing in these terms excludes liability that cannot lawfully be limited."}
        </p>
      </LegalSection>

      <LegalSection title={spanish ? "13. Ley aplicable, cambios y contacto" : "13. Governing law, changes, and contact"}>
        <p>
          {spanish ? "Estos términos del sitio web se rigen por las leyes aplicables de Estados Unidos y Texas, sin limitar los derechos a los que no puedas renunciar conforme a la ley que te aplique. Un acuerdo de servicio pagado puede contener términos adicionales sobre disputas revisados y aceptados por ambas partes." : "These website terms are governed by applicable United States and Texas law, without limiting rights that cannot be waived under the law that applies to you. A paid service agreement may contain additional dispute terms reviewed and accepted by both parties."}
        </p>
        <p>
          {spanish ? "Podemos actualizar estos términos a medida que cambie Atlas. La versión revisada mostrará una nueva fecha de “Última actualización”. El uso continuo después de una actualización significa que los términos actualizados se aplican en adelante, sujeto a la ley aplicable." : "We may update these terms as Atlas changes. The revised version will show a new “Last updated” date. Continued use after an update means the updated website terms apply going forward, subject to applicable law."}
        </p>
        <p>
          {spanish ? "Puedes enviar preguntas a " : "Questions may be sent to "}
          <a className={legalLinkClass} href="mailto:hello@siscustomcreations.com">
            atlasforentrepreneurs@gmail.com
          </a>
          .
        </p>
      </LegalSection>
    </LegalPage>
  );
}
