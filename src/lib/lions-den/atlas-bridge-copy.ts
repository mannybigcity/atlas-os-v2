export const ATLAS_BRIDGE_STAGE_EVENT = "atlas-bridge-stage";

export const ATLAS_BRIDGE_LISTENING_MS = 2500;
export const ATLAS_BRIDGE_ANSWER_MS = 4000;

export type AtlasBridgeStage = "listening" | "thinking" | "answer";

/** Staged lines while a file-queue ask is in flight. Spanish is warm, not apologetic. */
export const ATLAS_BRIDGE_STAGE_COPY: Record<AtlasBridgeStage, { en: string; es: string }> = {
  listening: { en: "Atlas is listening", es: "Atlas te escucha" },
  thinking: { en: "thinking it through", es: "lo está pensando" },
  answer: { en: "here's what I've got", es: "mira lo que tengo" },
};

const ATLAS_BRIDGE_OPS_NOTE = /\n?<!--\s*atlas-bridge\s+\{[^}]*\}\s*-->/g;

/** Ops marker stays in the logged response. The pane strips it before display. */
export function stripAtlasBridgeOpsNote(response: string) {
  return response.replace(ATLAS_BRIDGE_OPS_NOTE, "").trimEnd();
}
