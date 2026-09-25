import type { Metadata } from "next";
import Link from "next/link";
import {
  LegalList,
  LegalPage,
  LegalSection,
  legalLinkClass,
} from "@/components/legal-page";
import { getSiteLanguage } from "@/lib/site-language-server";

const CONTACT_EMAIL = "info@atlasforentrepreneurs.com";

export async function generateMetadata(): Promise<Metadata> {
  const language = await getSiteLanguage();
  return {
    title: language === "es" ? "Privacidad de SignScout | Atlas para emprendedores" : "SignScout privacy | Atlas For Entrepreneurs",
    description:
      language === "es"
        ? "Cómo SignScout usa la cámara, la ubicación y el envío a tu escritorio de Atlas."
        : "How SignScout uses the camera, location, and Send to Atlas.",
  };
}

export default async function SignScoutPrivacyPage() {
  const language = await getSiteLanguage();
  const spanish = language === "es";

  return (
    <LegalPage
      eyebrow="SignScout"
      language={language}
      lastUpdated={spanish ? "25 de septiembre de 2026" : "September 25, 2026"}
      summary={
        spanish
          ? "SignScout fotografía letreros y camiones de negocios, lee el texto y guarda el lead en tu teléfono. Nada se envía a Atlas hasta que tocas Enviar a Atlas."
          : "SignScout photographs business signs and trucks, reads the text, and keeps the lead on your phone. Nothing is sent to Atlas until you tap Send to Atlas."
      }
      title={spanish ? "Privacidad de SignScout" : "SignScout privacy"}
    >
      <LegalSection title={spanish ? "Qué hace la app" : "What the app does"}>
        <p>
          {spanish
            ? "SignScout es una herramienta de Atlas para emprendedores. Usa la cámara, o una foto que elijas, para fotografiar letreros y camiones de negocios. El texto se lee en el teléfono."
            : "SignScout is a tool from Atlas For Entrepreneurs. It uses the camera, or a photo you pick, to photograph business signs and trucks. The text is read on the phone."}
        </p>
      </LegalSection>

      <LegalSection title={spanish ? "Cámara y lectura del texto" : "Camera and text reading"}>
        <p>
          {spanish
            ? "La lectura predeterminada ocurre en el dispositivo con Tesseract. Esa ruta no sube la foto."
            : "The default read happens on the device with Tesseract. That path does not upload the photo."}
        </p>
        <p>
          {spanish
            ? "Si la lectura en la nube está activada, la foto se envía a xAI (visión de Grok) solo para extraer el texto. No se usa para anuncios ni para entrenar un perfil publicitario."
            : "Where cloud reading is enabled, the photo is sent to xAI (Grok vision) only to extract the text. It is not used for ads or to build an advertising profile."}
        </p>
      </LegalSection>

      <LegalSection title={spanish ? "Ubicación" : "Location"}>
        <p>
          {spanish
            ? "Si lo permites, SignScout guarda una ubicación aproximada o precisa con el lead para que recuerdes dónde viste el letrero. Si la niegas, igual puedes capturar el letrero."
            : "If you allow it, SignScout saves an approximate or precise location with the lead so you can remember where you saw the sign. If you deny it, you can still capture the sign."}
        </p>
      </LegalSection>

      <LegalSection title={spanish ? "Dónde se guardan los leads" : "Where leads are stored"}>
        <p>
          {spanish
            ? "Los leads se guardan en el dispositivo. Borrar los datos de la app o desinstalarla los quita del teléfono."
            : "Leads are stored on the device. Clearing the app data or uninstalling the app removes them from the phone."}
        </p>
      </LegalSection>

      <LegalSection title={spanish ? "Enviar a Atlas" : "Send to Atlas"}>
        <p>
          {spanish
            ? "El lead (y la foto, si la app la adjunta) se envía solo a tu propio escritorio de Atlas cuando tocas Enviar a Atlas, por HTTPS. Llega a la pila de revisión de HUNTER. No se vuelve un prospecto hasta que alguien en ese escritorio lo acepta. Atlas no envía correos, llamadas ni mensajes de texto por ese envío."
            : "Lead data (and the photo, when the app attaches one) is sent only to your own Atlas desk when you tap Send to Atlas, over HTTPS. It lands in the HUNTER review pile. It does not become a Prospect until someone on that desk accepts it. Atlas does not email, call, or text anyone because of that send."}
        </p>
      </LegalSection>

      <LegalSection title={spanish ? "Lo que no hacemos" : "What we do not do"}>
        <LegalList>
          <li>{spanish ? "No hay anuncios." : "There are no ads."}</li>
          <li>{spanish ? "No vendemos tus datos." : "We do not sell your data."}</li>
          <li>
            {spanish
              ? "No hay analítica de terceros en SignScout. La lista de dependencias de la app no incluye un SDK de analítica, publicidad ni rastreo."
              : "There is no third-party analytics in SignScout. The app dependency list does not include an analytics, advertising, or tracking SDK."}
          </li>
        </LegalList>
      </LegalSection>

      <LegalSection title={spanish ? "Borrar datos y contacto" : "Deletion and contact"}>
        <p>
          {spanish
            ? "En el teléfono: borra los datos de la app o desinstálala. En Atlas: escribe a Manny y pide que borre el lead de tu escritorio."
            : "On the phone: clear the app data or uninstall it. On Atlas: email Manny and ask to delete the lead from your desk."}
        </p>
        <p>
          <a className={legalLinkClass} href={`mailto:${CONTACT_EMAIL}`}>
            {CONTACT_EMAIL}
          </a>
        </p>
        <p>
          <Link className={legalLinkClass} href="/privacy">
            {spanish ? "Política de privacidad de Atlas" : "Atlas privacy policy"}
          </Link>
        </p>
      </LegalSection>
    </LegalPage>
  );
}
