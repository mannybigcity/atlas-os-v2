import {
  isAfeClientDeskOrganization,
  isAfeCrmDemoOrganization,
  isAfeOperatorDeskOrganization,
  isSisOrganization,
} from "../client-portal/identity.ts";
import { isMicahBrandDraft } from "./micah-starter-week.ts";

export const ACTIVATION_FIND_TARGET = 10;
export const ACTIVATION_ACCEPT_TARGET = 1;

export const ACTIVATION_DISMISSED_STORAGE_PREFIX = "ld-activation-dismissed:";
export const ACTIVATION_MICAH_STORAGE_PREFIX = "ld-activation-micah:";

export type ActivationChecklistOrganization = {
  name?: string | null;
  slug?: string | null;
} | null | undefined;

export type ActivationChecklistStepId = "find10" | "accept1" | "micah";

export type ActivationChecklistCopy = {
  eyebrow: string;
  title: string;
  hint: string;
  doneHint: string;
  hide: string;
  hideAria: string;
  sampleBadge: string;
  steps: Record<
    ActivationChecklistStepId,
    {
      label: string;
      detail: string;
      done: string;
    }
  >;
};

export function activationDismissedStorageKey(organizationId: string) {
  return `${ACTIVATION_DISMISSED_STORAGE_PREFIX}${organizationId}`;
}

export function activationMicahStorageKey(organizationId: string) {
  return `${ACTIVATION_MICAH_STORAGE_PREFIX}${organizationId}`;
}

export function shouldShowActivationChecklist(input: {
  organization?: ActivationChecklistOrganization;
  sisDesk?: boolean;
  organizationId?: string | null;
}) {
  if (!input.organizationId) return false;
  if (input.sisDesk) return false;
  const organization = input.organization;
  if (!organization) return false;
  if (isSisOrganization(organization) || isAfeOperatorDeskOrganization(organization)) {
    return false;
  }
  return isAfeCrmDemoOrganization(organization) || isAfeClientDeskOrganization(organization);
}

export function isActivationSampleWalkthrough(organization?: ActivationChecklistOrganization) {
  return Boolean(organization && isAfeCrmDemoOrganization(organization));
}

export function activationFoundCount(input: {
  pendingCount?: number;
  acceptedCount?: number;
  foundCount?: number;
}) {
  if (typeof input.foundCount === "number" && Number.isFinite(input.foundCount)) {
    return Math.max(0, Math.floor(input.foundCount));
  }
  return Math.max(0, Math.floor(input.pendingCount ?? 0)) + Math.max(0, Math.floor(input.acceptedCount ?? 0));
}

export function hasMicahActivationProof(
  drafts: Array<{
    metadata?: Record<string, unknown> | null;
    title?: string | null;
    headline?: string | null;
    campaign?: string | null;
  }> = [],
  openedMicah = false,
) {
  if (openedMicah) return true;
  return drafts.some((draft) => {
    if (isMicahBrandDraft(draft.metadata)) return false;
    const day = Number(draft.metadata?.week_day ?? 0);
    if (day === 1) return true;
    if (draft.metadata?.week_pack === true) return true;
    const text = `${draft.title ?? ""} ${draft.headline ?? ""} ${draft.campaign ?? ""}`;
    return /\bday\s*1\b|monday motivation/i.test(text);
  });
}

export function activationChecklistProgress(input: {
  pendingCount?: number;
  acceptedCount?: number;
  foundCount?: number;
  drafts?: Array<{
    metadata?: Record<string, unknown> | null;
    title?: string | null;
    headline?: string | null;
    campaign?: string | null;
  }>;
  openedMicah?: boolean;
}) {
  const foundCount = activationFoundCount(input);
  const acceptedCount = Math.max(0, Math.floor(input.acceptedCount ?? 0));
  const find10 = foundCount >= ACTIVATION_FIND_TARGET;
  const accept1 = acceptedCount >= ACTIVATION_ACCEPT_TARGET;
  const micah = hasMicahActivationProof(input.drafts, Boolean(input.openedMicah));
  const completed = [find10, accept1, micah].filter(Boolean).length;
  return {
    foundCount,
    acceptedCount,
    find10,
    accept1,
    micah,
    completed,
    total: 3,
    allDone: find10 && accept1 && micah,
  };
}

export function activationChecklistCopy(input: {
  spanish?: boolean;
  sampleWalkthrough?: boolean;
} = {}): ActivationChecklistCopy {
  const spanish = Boolean(input.spanish);
  const sampleWalkthrough = Boolean(input.sampleWalkthrough);

  if (spanish) {
    return {
      eyebrow: sampleWalkthrough ? "Recorrido SAMPLE" : "Empieza aquí · tus primeros 3 pasos",
      title: "Consigue tu primer prospecto real esta semana.",
      hint: "Tú haces la llamada. Atlas no envía correos, llamadas ni SMS por ti.",
      doneHint: "Listo. Ya tienes negocios reales en el escritorio: ahora la llamada es tuya.",
      hide: "Ocultar",
      hideAria: "Ocultar la lista de primeros pasos",
      sampleBadge: "SAMPLE",
      steps: {
        find10: {
          label: "Busca 10",
          detail: "Abre HUNTER, escribe tu oficio y tu código postal. Atlas trae 10 negocios cercanos de Google Maps.",
          done: "Ya tienes 10 negocios reales en HUNTER.",
        },
        accept1: {
          label: "Acepta 1",
          detail: "Elige el negocio que más te convenga y acéptalo. Pasa a Prospectos con su teléfono, si Google lo publica.",
          done: "Tu primer prospecto real está en la lista.",
        },
        micah: {
          label: "Abre MICAH",
          detail: "Día 1 / galería: descarga la tarjeta del lunes y publícala tú mismo. MICAH no publica.",
          done: "Ya viste tus tarjetas de la semana.",
        },
      },
    };
  }

  return {
    eyebrow: sampleWalkthrough ? "SAMPLE walkthrough" : "Start here · your first 3 steps",
    title: "Land your first real prospect this week.",
    hint: "You call. Atlas does not email, call, or text anyone for you.",
    doneHint: "Done. Real businesses are on your desk now; the next call is yours.",
    hide: "Hide",
    hideAria: "Hide the first-three checklist",
    sampleBadge: "SAMPLE",
    steps: {
      find10: {
        label: "Find 10",
        detail: "Open HUNTER, type your trade and ZIP code. Atlas pulls 10 nearby businesses from Google Maps.",
        done: "You have 10 real businesses in HUNTER.",
      },
      accept1: {
        label: "Accept 1",
        detail: "Pick the business you would most like to work with and accept it. It moves to Prospects with its phone number, when Google lists one.",
        done: "Your first real prospect is on the list.",
      },
      micah: {
        label: "Open MICAH",
        detail: "Day 1 / gallery: download Monday's card and post it yourself. MICAH does not post.",
        done: "You have seen this week's cards.",
      },
    },
  };
}
