import type { OpportunityStage } from "@/server/opportunities/queries";

export const PROSPECT_TOUCH_CHANNELS = ["call", "text", "email", "in_person", "other"] as const;
export type ProspectTouchChannel = (typeof PROSPECT_TOUCH_CHANNELS)[number];

export const PROSPECT_TOUCH_OUTCOMES = [
  "reached",
  "left_message",
  "no_answer",
  "replied",
  "booked",
  "not_interested",
  "wrong_number",
] as const;
export type ProspectTouchOutcome = (typeof PROSPECT_TOUCH_OUTCOMES)[number];

export const PROSPECT_STAGE_MOVES = ["ready_for_follow_up", "won", "lost", "archived"] as const;
export type ProspectStageMove = (typeof PROSPECT_STAGE_MOVES)[number];

export function isProspectTouchChannel(value: unknown): value is ProspectTouchChannel {
  return PROSPECT_TOUCH_CHANNELS.includes(value as ProspectTouchChannel);
}

export function isProspectTouchOutcome(value: unknown): value is ProspectTouchOutcome {
  return PROSPECT_TOUCH_OUTCOMES.includes(value as ProspectTouchOutcome);
}

export function isProspectStageMove(value: unknown): value is ProspectStageMove {
  return PROSPECT_STAGE_MOVES.includes(value as ProspectStageMove);
}

export function touchChannelLabel(channel: ProspectTouchChannel, spanish = false) {
  const labels: Record<ProspectTouchChannel, [string, string]> = {
    call: ["Call", "Llamada"],
    text: ["Text", "SMS"],
    email: ["Email", "Correo"],
    in_person: ["In person", "En persona"],
    other: ["Other", "Otro"],
  };
  return labels[channel][spanish ? 1 : 0];
}

export function touchOutcomeLabel(outcome: ProspectTouchOutcome, spanish = false) {
  const labels: Record<ProspectTouchOutcome, [string, string]> = {
    reached: ["Reached them", "Contesté con ellos"],
    left_message: ["Left a message", "Dejé mensaje"],
    no_answer: ["No answer", "Sin respuesta"],
    replied: ["They replied", "Respondieron"],
    booked: ["Booked a meeting", "Reunión agendada"],
    not_interested: ["Not interested", "No interesado"],
    wrong_number: ["Wrong number", "Número equivocado"],
  };
  return labels[outcome][spanish ? 1 : 0];
}

/** Where a prospect lands after the owner logs a touch. Won is never downgraded. */
export function stageAfterTouch(current: OpportunityStage, outcome: ProspectTouchOutcome): OpportunityStage {
  if (current === "won") return "won";
  if (outcome === "not_interested") return "lost";
  if (outcome === "replied" || outcome === "booked") return "responded";
  if (current === "responded" || current === "lost") return current;
  return "contacted";
}

export function eventTypeForTouch(outcome: ProspectTouchOutcome) {
  if (outcome === "not_interested") return "lost" as const;
  if (outcome === "replied" || outcome === "booked") return "reply_received" as const;
  return "contacted" as const;
}

export function touchSummary(
  channel: ProspectTouchChannel,
  outcome: ProspectTouchOutcome,
) {
  return `Owner logged a ${touchChannelLabel(channel).toLowerCase()}: ${touchOutcomeLabel(outcome).toLowerCase()}. Atlas did not contact anyone.`;
}

export function stageMoveLabel(move: ProspectStageMove, spanish = false) {
  const labels: Record<ProspectStageMove, [string, string]> = {
    ready_for_follow_up: ["Back to call list", "Volver a la lista"],
    won: ["Mark won", "Marcar ganado"],
    lost: ["Not a fit", "No encaja"],
    archived: ["Remove from desk", "Quitar del escritorio"],
  };
  return labels[move][spanish ? 1 : 0];
}

export function prospectStatusMessage(status: string | undefined, spanish = false) {
  const messages: Record<string, [string, string]> = {
    trial_added: [
      "Trial lead added to Prospects. Call, text, or email from your own phone below.",
      "Prueba agregada a Prospectos. Llama, escribe o envía correo desde tu propio teléfono.",
    ],
    trial_linked: [
      "This trial was already in Prospects. Here is the record.",
      "Esta prueba ya estaba en Prospectos. Aquí está el registro.",
    ],
    touch_logged: ["Touch logged.", "Contacto registrado."],
    contact_saved: ["Contact details saved.", "Datos de contacto guardados."],
    next_action_saved: ["Next step saved. It now shows on Follow-up.", "Próximo paso guardado. Ya aparece en Seguimiento."],
    next_action_cleared: ["Next step cleared.", "Próximo paso borrado."],
    stage_won: ["Marked won. Nice.", "Marcado como ganado."],
    stage_lost: ["Marked not a fit.", "Marcado como no encaja."],
    stage_ready_for_follow_up: ["Back on the call list.", "De vuelta en la lista de llamadas."],
    stage_archived: ["Removed from the desk. History is kept.", "Quitado del escritorio. El historial se conserva."],
    invalid: ["That change could not be read. Try again.", "No se pudo leer ese cambio. Inténtalo de nuevo."],
    save_failed: ["The change did not save. Try again.", "El cambio no se guardó. Inténtalo de nuevo."],
    missing_prospect: ["That prospect could not be found.", "No se encontró ese prospecto."],
    sis_blocked: ["SIS prospects are managed on the SIS desk.", "Los prospectos SIS se manejan en el escritorio SIS."],
  };
  if (!status || !messages[status]) return null;
  return messages[status][spanish ? 1 : 0];
}

export function trialDeskStatusMessage(
  params: { trial?: string; added?: string; failed?: string; reason?: string } | undefined,
  spanish = false,
) {
  const status = params?.trial;
  if (!status) return null;
  if (status === "synced") {
    const added = Number(params?.added ?? 0) || 0;
    const failed = Number(params?.failed ?? 0) || 0;
    const base = spanish
      ? `${added} prueba(s) agregadas a Prospectos.`
      : `${added} trial${added === 1 ? "" : "s"} added to Prospects.`;
    return failed > 0
      ? `${base} ${spanish ? `${failed} no se pudieron agregar.` : `${failed} could not be added.`}`
      : base;
  }
  const messages: Record<string, [string, string]> = {
    add_failed: [
      `Could not add that trial to Prospects${params?.reason ? ` (${params.reason.replaceAll("_", " ")})` : ""}.`,
      `No se pudo agregar esa prueba a Prospectos${params?.reason ? ` (${params.reason.replaceAll("_", " ")})` : ""}.`,
    ],
    sync_failed: ["The trial queue could not load, so nothing was added.", "La cola de pruebas no cargó, no se agregó nada."],
    invalid: ["That trial row could not be read.", "No se pudo leer esa fila."],
  };
  return messages[status] ? messages[status][spanish ? 1 : 0] : null;
}
