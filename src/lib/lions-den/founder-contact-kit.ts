/**
 * Locked founder phones for Amanda / email / inbound copy on Manny's desks.
 * SIS Custom Creations uses both numbers. AFE operator desk uses Manny only.
 * Trial customers keep their own ownerPhone — this kit is never invented for them.
 */
import { AFE_MANNY_PHONE_DISPLAY } from "../afe-public-contact.ts";
import { isAfeOperatorDeskOrganization, isSisOrganization } from "../client-portal/identity.ts";

export const DELEANA_PHONE_DISPLAY = "346-544-8697";
export const DELEANA_NAME = "Deleana";

export type FounderContactLine = {
  name: string;
  phone: string;
};

export function correctDeleanaSpelling(value: string | null | undefined) {
  return String(value ?? "").replace(/\bDelina\b/gi, DELEANA_NAME);
}

export function founderContactLinesFor(
  organization?: { name?: string | null; slug?: string | null } | null,
): FounderContactLine[] | null {
  if (isSisOrganization(organization)) {
    return [
      { name: "Manny", phone: AFE_MANNY_PHONE_DISPLAY },
      { name: DELEANA_NAME, phone: DELEANA_PHONE_DISPLAY },
    ];
  }
  if (isAfeOperatorDeskOrganization(organization)) {
    return [{ name: "Manny", phone: AFE_MANNY_PHONE_DISPLAY }];
  }
  return null;
}

export function applyFounderContactKit<
  T extends {
    ownerName?: string | null;
    ownerPhone?: string | null;
    businessName?: string;
    contactLines?: FounderContactLine[] | null;
  },
>(
  business: T,
  organization?: { name?: string | null; slug?: string | null } | null,
): T & { contactLines?: FounderContactLine[] } {
  const ownerName = correctDeleanaSpelling(business.ownerName).trim() || business.ownerName || null;
  const org = organization ?? (business.businessName ? { name: business.businessName } : null);
  const lines = founderContactLinesFor(org);
  if (!lines) {
    return { ...business, ownerName, contactLines: undefined };
  }
  return {
    ...business,
    ownerName,
    ownerPhone: lines[0]!.phone,
    contactLines: lines,
  };
}

export function contactAnswerLines(input: {
  spanish: boolean;
  ownerName?: string | null;
  ownerPhone?: string | null;
  contactLines?: FounderContactLine[] | null;
}) {
  const fallbackName = correctDeleanaSpelling(input.ownerName).trim() || (input.spanish ? "El dueño" : "The owner");
  const contacts =
    input.contactLines?.filter((line) => String(line.phone ?? "").trim()).map((line) => ({
      name: correctDeleanaSpelling(line.name).trim() || fallbackName,
      phone: line.phone.trim(),
    })) ?? [];
  if (contacts.length === 0 && input.ownerPhone?.trim()) {
    contacts.push({ name: fallbackName, phone: input.ownerPhone.trim() });
  }
  return contacts.map((contact) =>
    input.spanish ? `${contact.name} contesta al ${contact.phone}` : `${contact.name} answers at ${contact.phone}`,
  );
}

export function founderUrgentCallCopy(
  lines: FounderContactLine[] | null | undefined,
  spanish: boolean,
) {
  const contacts = (lines ?? []).filter((line) => String(line.phone ?? "").trim());
  if (contacts.length === 0) return null;
  if (contacts.length === 1) {
    return spanish
      ? `Si es urgente, llama directo al ${contacts[0]!.phone}.`
      : `If it is urgent, call us directly at ${contacts[0]!.phone}.`;
  }
  const joined = contacts
    .map((line) => (spanish ? `${line.name} al ${line.phone}` : `${line.name} at ${line.phone}`))
    .join(spanish ? " o " : " or ");
  return spanish ? `Si es urgente, llama a ${joined}.` : `If it is urgent, call ${joined}.`;
}

export function allowedFounderPhoneDigits(input: {
  ownerPhone?: string | null;
  contactLines?: FounderContactLine[] | null;
}) {
  const values = [
    String(input.ownerPhone ?? ""),
    ...(input.contactLines ?? []).map((line) => line.phone),
  ];
  return values.map((value) => value.replace(/\D/g, "")).filter(Boolean);
}
