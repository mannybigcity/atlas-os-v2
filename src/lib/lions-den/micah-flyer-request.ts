/**
 * Ask Micah for a flyer from Email compose. Gallery draft only.
 * Pure — zero Next or Supabase. Nothing here posts.
 */

export type MicahFlyerRequestInput = {
  spanish: boolean;
  prospectName: string;
  prospectCompany?: string | null;
  prospectType?: string | null;
  businessName: string;
  trade?: string | null;
  city?: string | null;
  sisDesk?: boolean;
};

export function micahFlyerPrompt(input: MicahFlyerRequestInput) {
  const prospect =
    [input.prospectName, input.prospectCompany].filter((part) => String(part ?? "").trim()).join(" at ") ||
    "this prospect";
  const kind = String(input.prospectType ?? "").replaceAll("_", " ").trim();
  const trade = String(input.trade ?? "").trim();
  const city = String(input.city ?? "").trim();
  const shop = [input.businessName.trim(), trade, city].filter(Boolean).join(", ");
  const brand = input.sisDesk
    ? "Use this client's own brand. Do not use the AFE lion logo."
    : "Use this desk's brand kit. AFE house desks may use AFE brand. Client desks must not use the AFE lion.";
  return [
    `Make a flyer for ${prospect}${kind ? `, a ${kind}` : ""}.`,
    `From ${shop || "the owner's business"}.`,
    "Gallery draft only. Do not post, schedule, or send.",
    "No Blotato. No live Facebook or Instagram post.",
    brand,
    "Friendly/local.",
  ].join(" ");
}

export function micahFlyerConfirmation(input: {
  spanish: boolean;
  prospectName: string;
  saved: boolean;
  galleryHref?: string | null;
}) {
  const name = input.prospectName.trim() || (input.spanish ? "este prospecto" : "this prospect");
  if (input.spanish) {
    return input.saved
      ? `Micah dejó un borrador en la galería para ${name}. Copia o descarga ahí. No se publicó nada.`
      : `Micah tiene el pedido de flyer para ${name}. Abre MICAH para terminar el borrador de galería. No se publicó nada.`;
  }
  return input.saved
    ? `Micah queued a gallery draft for ${name}. Copy or download it there. Nothing was posted.`
    : `Micah has the flyer request for ${name}. Open MICAH to finish the gallery draft. Nothing was posted.`;
}

export function micahFlyerButtonLabel(spanish: boolean) {
  return spanish ? "Pídele un flyer a Micah" : "Ask Micah for a flyer";
}
