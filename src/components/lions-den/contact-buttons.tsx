import { contactLinks } from "@/lib/lions-den/contact-links";

type ContactButtonsProps = {
  phone?: string | null;
  email?: string | null;
  smsBody?: string | null;
  emailSubject?: string | null;
  emailBody?: string | null;
  spanish: boolean;
  compact?: boolean;
};

const solid =
  "inline-flex items-center justify-center rounded-full bg-[#071b42] px-4 py-2 text-sm font-semibold text-white hover:bg-[#0d2a63]";
const ghost =
  "inline-flex items-center justify-center rounded-full border border-[#d8c27a] bg-white px-4 py-2 text-sm font-semibold text-[#071b42] hover:bg-[#fff8e6]";
const disabled =
  "inline-flex cursor-not-allowed items-center justify-center rounded-full border border-dashed border-[#d8c27a] px-4 py-2 text-sm font-semibold text-[#8a93a3]";

/**
 * Device-native contact buttons. tel:, sms:, and mailto: open the owner's own
 * phone or mail app. Atlas never places calls or sends messages itself.
 */
export function ContactButtons({
  phone,
  email,
  smsBody,
  emailSubject,
  emailBody,
  spanish,
  compact = false,
}: ContactButtonsProps) {
  const links = contactLinks({ phone, email, smsBody, emailSubject, emailBody });
  const size = compact ? " px-3 py-1.5 text-xs" : "";

  return (
    <div className="flex flex-wrap gap-2" data-contact-buttons>
      {links.tel ? (
        <a className={solid + size} data-contact="call" href={links.tel}>
          {spanish ? "Llamar" : "Call"}
        </a>
      ) : (
        <span className={disabled + size} title={spanish ? "Sin teléfono" : "No phone on file"}>
          {spanish ? "Llamar" : "Call"}
        </span>
      )}
      {links.sms ? (
        <a className={ghost + size} data-contact="text" href={links.sms}>
          {spanish ? "SMS" : "Text"}
        </a>
      ) : (
        <span className={disabled + size} title={spanish ? "Sin teléfono" : "No phone on file"}>
          {spanish ? "SMS" : "Text"}
        </span>
      )}
      {links.mailto ? (
        <a className={ghost + size} data-contact="email" href={links.mailto}>
          {spanish ? "Correo" : "Email"}
        </a>
      ) : (
        <span className={disabled + size} title={spanish ? "Sin correo" : "No email on file"}>
          {spanish ? "Correo" : "Email"}
        </span>
      )}
    </div>
  );
}
