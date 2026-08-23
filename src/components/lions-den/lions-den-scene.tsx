"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useSiteLanguage } from "@/components/language-switcher";
import type { SiteLanguage } from "@/lib/site-language";
import {
  demoWorkEvents,
  initialAgentSnapshots,
  lionsDenAgents,
  navigationEdges,
  navigationNodes,
  officeZones,
} from "@/lib/lions-den/demo-scenario";
import {
  findShortestPath,
  interpolatePathPosition,
} from "@/lib/lions-den/pathfinding";
import type {
  AgentSceneSnapshot,
  AgentWorkState,
  LionsDenAgentId,
  WorkEvent,
} from "@/lib/lions-den/types";

const EVENT_DURATION_MS = 4200;

const stateLabels: Record<SiteLanguage, Record<AgentWorkState, string>> = {
  en: {
    offline: "Offline", available: "Available", thinking: "Thinking", walking: "Walking", working: "Working", waiting_for_input: "Needs input", waiting_for_approval: "Awaiting approval", in_meeting: "In meeting", handing_off: "Handing off", blocked: "Blocked", completed: "Completed", error: "Needs attention",
  },
  es: {
    offline: "Sin conexión", available: "Disponible", thinking: "Pensando", walking: "En movimiento", working: "Trabajando", waiting_for_input: "Requiere información", waiting_for_approval: "Esperando aprobación", in_meeting: "En reunión", handing_off: "Transfiriendo", blocked: "Bloqueado", completed: "Completado", error: "Requiere atención",
  },
};

function buildSnapshots(activeEvent: WorkEvent): AgentSceneSnapshot[] {
  return initialAgentSnapshots.map((snapshot) => {
    if (snapshot.agentId !== activeEvent.agentId) return snapshot;
    return {
      agentId: activeEvent.agentId,
      state: activeEvent.state,
      nodeId: activeEvent.fromNodeId,
      targetNodeId: activeEvent.toNodeId,
      currentAssignment: activeEvent.safeSummary,
      lastEvent: activeEvent.eventType.replaceAll("_", " "),
      nextExpectedAction: activeEvent.nextExpectedAction,
    };
  });
}

function statusTone(state: AgentWorkState) {
  if (state === "waiting_for_approval") return "approval";
  if (state === "blocked" || state === "error") return "blocked";
  if (state === "completed") return "complete";
  if (state === "walking" || state === "handing_off") return "handoff";
  return "active";
}

export function LionsDenScene() {
  const language = useSiteLanguage();
  const [eventIndex, setEventIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [selectedAgentId, setSelectedAgentId] =
    useState<LionsDenAgentId>("atlas");
  const [isPaused, setIsPaused] = useState(false);

  const activeEvent = demoWorkEvents[eventIndex];
  const snapshots = useMemo(() => buildSnapshots(activeEvent), [activeEvent]);
  const selectedAgent = lionsDenAgents.find((agent) => agent.id === selectedAgentId);
  const selectedSnapshot = snapshots.find(
    (snapshot) => snapshot.agentId === selectedAgentId,
  );
  const activeAgentIsMoving = progress > 0 && progress < 1;

  useEffect(() => {
    if (isPaused) return;

    const startedAt = Date.now();
    const timer = window.setInterval(() => {
      const elapsed = Date.now() - startedAt;
      const nextProgress = Math.min(elapsed / EVENT_DURATION_MS, 1);
      setProgress(nextProgress);

      if (nextProgress >= 1) {
        setEventIndex((current) => (current + 1) % demoWorkEvents.length);
        setProgress(0);
      }
    }, 80);

    return () => window.clearInterval(timer);
  }, [eventIndex, isPaused]);

  const activePath = useMemo(
    () =>
      findShortestPath(
        navigationNodes,
        navigationEdges,
        activeEvent.fromNodeId,
        activeEvent.toNodeId,
      ),
    [activeEvent.fromNodeId, activeEvent.toNodeId],
  );

  return (
    <section className="lions-shell" aria-label={language === "es" ? "Reproducción pública del Panel del cliente de Atlas" : "Atlas Client Dashboard public playback"}>
      <div className="lions-copy">
        <span className="tiny-tag">{language === "es" ? "Reproducción pública del flujo" : "Public workflow playback"}</span>
        <h1>{language === "es" ? "Mira cómo Atlas y el equipo hacen avanzar el trabajo." : "Watch Atlas and the team move the work."}</h1>
        <p>
          {language === "es" ? "Esta es la versión del Panel del cliente segura para ventas. La sala funciona con asignaciones, puertas de aprobación y transferencias, no con movimientos aleatorios." : "This is the sales-safe version of the Client Dashboard. The room is powered by assignment events, approval gates, and handoffs, not random walking."}
        </p>
        <div className="lions-actions">
          <Link href="/assessment" className="primary-cta">
            {language === "es" ? "Iniciar evaluación" : "Start assessment"}
          </Link>
          <Link href="/login" className="secondary-cta">
            {language === "es" ? "Acceso de clientes" : "Client login"}
          </Link>
        </div>
        <p className="lions-note">
          {language === "es" ? "El modo público usa datos de muestra. El trabajo privado del cliente permanece protegido por acceso y aprobación." : "Public mode uses sample data. Private client work stays behind login and approval."}
        </p>
      </div>

      <div className="office-wrap">
        <div className="office-label">{language === "es" ? "Planta de eventos del Panel del cliente" : "Client Dashboard event floor"}</div>
        <div className="office-live-badge" aria-live="polite">
          <span className="demo-dot" />
          <strong>{language === "es" ? "REPRODUCCIÓN PÚBLICA" : "PUBLIC PLAYBACK"}</strong>
          <small>{language === "es" ? "telemetría no conectada" : "telemetry not connected"}</small>
        </div>
        <div className="office-stage">
          {officeZones.map((zone) => (
            <div
              key={zone.id}
              className={`office-zone office-zone-${zone.kind}`}
              style={{
                left: `${zone.x}%`,
                top: `${zone.y}%`,
                width: `${zone.width}%`,
                height: `${zone.height}%`,
              }}
            >
              <span>{translateSceneText(zone.name, language)}</span>
            </div>
          ))}

          {lionsDenAgents.map((agent) => {
            const snapshot =
              snapshots.find((item) => item.agentId === agent.id) ??
              initialAgentSnapshots.find((item) => item.agentId === agent.id)!;
            const path =
              agent.id === activeEvent.agentId
                ? activePath
                : [snapshot.nodeId || agent.homeNodeId];
            const position = interpolatePathPosition(
              path.length > 0 ? path : [agent.homeNodeId],
              navigationNodes,
              agent.id === activeEvent.agentId ? progress : 0,
            );
            const lookAhead = interpolatePathPosition(
              path.length > 0 ? path : [agent.homeNodeId],
              navigationNodes,
              agent.id === activeEvent.agentId ? Math.min(progress + 0.03, 1) : 0,
            );
            const selected = selectedAgentId === agent.id;
            const moving = agent.id === activeEvent.agentId && activeAgentIsMoving;
            const direction = lookAhead.x >= position.x ? 1 : -1;

            return (
              <button
                key={agent.id}
                type="button"
                className={`agent-sprite ${selected ? "selected" : ""} ${moving ? "walking" : "idle"}`}
                style={{
                  left: `${position.x}%`,
                  top: `${position.y}%`,
                  zIndex: Math.round(position.y),
                  ["--agent-accent" as string]: agent.accent,
                  ["--agent-direction" as string]: direction,
                }}
                onClick={() => setSelectedAgentId(agent.id)}
                aria-label={language === "es" ? `Inspeccionar ${agent.name}` : `Inspect ${agent.name}`}
              >
                <span className="agent-avatar">
                  <Image
                    src={agent.id === "atlas" ? "/live-sprites/atlas-live.png" : agent.id === "hunter" ? "/live-sprites/hunter-live.png" : agent.id === "micah" ? "/live-sprites/micah-live.png" : "/live-sprites/david-live.png"}
                    alt=""
                    width={92}
                    height={124}
                    sizes="92px"
                  />
                  {moving ? <span className="walk-shadow" aria-hidden="true" /> : null}
                </span>
                <span className={`agent-state agent-state-${statusTone(snapshot.state)}`}>
                  {stateLabels[language][snapshot.state]}
                </span>
              </button>
            );
          })}

        </div>

        <div className="office-controls">
          <button type="button" onClick={() => setIsPaused((value) => !value)}>
            {isPaused ? language === "es" ? "Reanudar sala" : "Resume room" : language === "es" ? "Pausar sala" : "Pause room"}
          </button>
          <button
            type="button"
            onClick={() => {
              setEventIndex(0);
              setProgress(0);
              setSelectedAgentId("atlas");
            }}
          >
            {language === "es" ? "Reiniciar misión" : "Restart mission"}
          </button>
          <span>{language === "es" ? "Solo reproducción pública. Aquí no se expone telemetría privada de clientes." : "Public playback only. No private client telemetry is exposed here."}</span>
        </div>
      </div>

      <aside className="agent-inspector">
        {selectedAgent && selectedSnapshot ? (
          <>
            <div className="inspector-head">
              <Image
                src={selectedAgent.portrait}
                alt={language === "es" ? `Retrato de ${selectedAgent.name}` : `${selectedAgent.name} portrait`}
                width={84}
                height={84}
              />
              <div>
                <span>{translateSceneText(selectedAgent.animal, language)}</span>
                <h2>{selectedAgent.name}</h2>
                <p>{translateSceneText(selectedAgent.role, language)}</p>
              </div>
            </div>
            <dl>
              <div>
                <dt>{language === "es" ? "Estado" : "Status"}</dt>
                <dd>{stateLabels[language][selectedSnapshot.state]}</dd>
              </div>
              <div>
                <dt>{language === "es" ? "Asignación" : "Assignment"}</dt>
                <dd>{translateSceneText(selectedSnapshot.currentAssignment, language)}</dd>
              </div>
              <div>
                <dt>{language === "es" ? "Próxima acción" : "Next action"}</dt>
                <dd>{translateSceneText(selectedSnapshot.nextExpectedAction, language)}</dd>
              </div>
            </dl>
            <div className="tool-strip" aria-label={`${selectedAgent.name} indicators`}>
              {selectedAgent.tools.map((tool) => (
                <span key={tool.label} className={`tool-pill tool-${tool.state}`}>
                  {translateSceneText(tool.label, language)}
                </span>
              ))}
            </div>
          </>
        ) : null}
      </aside>

      <div className="activity-feed">
        <div className="feed-title">
          <span>{language === "es" ? "Actividad de eventos de demostración" : "Demo event feed"}</span>
          <strong>{activeEvent.occurredAt}</strong>
        </div>
        {demoWorkEvents.map((event, index) => {
          const agent = lionsDenAgents.find((item) => item.id === event.agentId);
          return (
            <button
              key={event.id}
              type="button"
              className={index === eventIndex ? "feed-event active" : "feed-event"}
              onClick={() => {
                setEventIndex(index);
                setProgress(0);
                setSelectedAgentId(event.agentId);
              }}
            >
              <span>{agent?.name}</span>
              <strong>{translateSceneText(event.safeSummary, language)}</strong>
              <small>{event.approvalRequired ? language === "es" ? "Protegido por aprobación" : "Approval protected" : language === "es" ? eventTypeLabels[event.eventType] ?? event.eventType.replaceAll("_", " ") : event.eventType.replaceAll("_", " ")}</small>
            </button>
          );
        })}
      </div>
    </section>
  );
}

const eventTypeLabels: Record<string, string> = {
  mission_received: "misión recibida",
  assignment_created: "asignación creada",
  deliverable_created: "entregable creado",
  approval_granted: "aprobación concedida",
  approval_requested: "aprobación solicitada",
  handoff_started: "transferencia iniciada",
  follow_up_queued: "seguimiento en cola",
  mission_updated: "misión actualizada",
};

function translateSceneText(value: string, language: SiteLanguage) {
  if (language !== "es") return value;
  return spanishSceneText[value] ?? value;
}

const spanishSceneText: Record<string, string> = {
  "ATLAS Command": "Comando de ATLAS",
  "Opportunity Bay": "Bahía de oportunidades",
  "Content Studio": "Estudio de contenido",
  "CRM Corner": "Rincón del CRM",
  "Lion's Den Table": "Mesa de la Guarida del León",
  "Approval Rail": "Carril de aprobación",
  "Revenue Signals": "Señales de ingresos",
  "Mission Board": "Tablero de misiones",
  "Central Hall": "Sala central",
  "Chief of Staff": "Jefe de Gabinete",
  "Opportunity Director": "Director de oportunidades",
  "Marketing Director": "Director de marketing",
  "CRM Director": "Director del CRM",
  "Golden Lion": "León dorado",
  "Bald Eagle": "Águila calva",
  Sloth: "Perezoso",
  Wolf: "Lobo",
  "Supabase ledger": "Registro de Supabase",
  "Approval gate": "Puerta de aprobación",
  "OpenAI planning": "Planificación con OpenAI",
  "Google Places": "Google Places",
  "Fit signals": "Señales de encaje",
  "Research queue": "Cola de investigación",
  "Content drafts": "Borradores de contenido",
  "Brand voice": "Voz de marca",
  "Approval first": "Aprobación primero",
  "CRM table": "Tabla del CRM",
  "Follow-up clock": "Reloj de seguimiento",
  "Pipeline hygiene": "Higiene del embudo",
  "Turn the assessment into one measurable revenue priority.": "Convertir la evaluación en una prioridad de ingresos medible.",
  "Assign the first growth investigation.": "Asignar la primera investigación de crecimiento.",
  "Standing by for opportunity research.": "En espera para investigar oportunidades.",
  "Scan for warm lead sources.": "Buscar fuentes de prospectos interesados.",
  "Standing by for approved offers.": "En espera de ofertas aprobadas.",
  "Draft private campaign assets.": "Crear borradores privados de campaña.",
  "Watching for leads needing a next step.": "Vigilando prospectos que necesitan una próxima acción.",
  "Attach every opportunity to follow-up.": "Vincular cada oportunidad a un seguimiento.",
  "ATLAS received a business assessment and found the first priority: warm leads are not getting followed up.": "ATLAS recibió una evaluación de negocio y encontró la primera prioridad: no se está dando seguimiento a los prospectos interesados.",
  "Create one growth mission and assign research to HUNTER.": "Crear una misión de crecimiento y asignar la investigación a HUNTER.",
  "HUNTER was assigned to find the fastest path to more qualified opportunities.": "HUNTER recibió la tarea de encontrar la ruta más rápida hacia más oportunidades calificadas.",
  "Scan local channels and prepare an opportunity snapshot.": "Examinar canales locales y preparar un resumen de oportunidades.",
  "HUNTER returned a shortlist of warm-lead sources and one recommended next move.": "HUNTER devolvió una lista corta de fuentes de prospectos interesados y una próxima acción recomendada.",
  "ATLAS reviews and chooses the offer to test.": "ATLAS revisa y elige la oferta que se probará.",
  "ATLAS approved the strongest offer. MICAH is turning it into simple marketing drafts.": "ATLAS aprobó la oferta más sólida. MICAH la está convirtiendo en borradores sencillos de marketing.",
  "Create private captions, offer angles, and a short CTA.": "Crear textos privados, enfoques de oferta y un llamado a la acción breve.",
  "MICAH drafted content, but it stays private until ATLAS and the owner approve it.": "MICAH preparó contenido, pero seguirá privado hasta que ATLAS y el dueño lo aprueben.",
  "Review draft and approve, reject, or request changes.": "Revisar el borrador y aprobarlo, rechazarlo o solicitar cambios.",
  "DAVID received the approved offer so every response can be tracked with a next step.": "DAVID recibió la oferta aprobada para que cada respuesta tenga una próxima acción rastreable.",
  "Create follow-up stages and a simple response tracker.": "Crear etapas de seguimiento y un rastreador sencillo de respuestas.",
  "DAVID found three open follow-ups and put them into a visible queue.": "DAVID encontró tres seguimientos abiertos y los colocó en una cola visible.",
  "ATLAS reviews the revenue leak before outreach is approved.": "ATLAS revisa la fuga de ingresos antes de aprobar el contacto.",
  "ATLAS updated the mission: fix inquiry-to-follow-up first before adding another tool.": "ATLAS actualizó la misión: corregir primero el seguimiento de consultas antes de agregar otra herramienta.",
  "Founder approval decides whether this becomes live work.": "La aprobación del fundador decide si esto se convierte en trabajo activo.",
};
