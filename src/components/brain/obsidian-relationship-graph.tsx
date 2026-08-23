"use client";

import { useMemo, useState } from "react";
import { FocusedHud } from "@/components/focused-hud";
import { useSiteLanguage } from "@/components/language-switcher";
import type { SiteLanguage } from "@/lib/site-language";
import type { ObsidianNote } from "@/server/brain/obsidian";
import type {
  ObsidianRelationshipGraph,
  ObsidianRelationshipNode,
} from "@/server/brain/discovery";

type ObsidianRelationshipGraphProps = {
  graph: ObsidianRelationshipGraph;
  notes: ObsidianNote[];
  initialNodeId?: string;
};

export function ObsidianRelationshipGraph({
  graph,
  initialNodeId,
  notes,
}: ObsidianRelationshipGraphProps) {
  const language = useSiteLanguage();
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(
    initialNodeId && graph.nodes.some((node) => node.id === initialNodeId)
      ? initialNodeId
      : null,
  );
  const selectedNode = graph.nodes.find((node) => node.id === selectedNodeId) ?? null;
  const noteByPath = useMemo(
    () => new Map(notes.map((note) => [note.path, note])),
    [notes],
  );

  function selectNode(nodeId: string) {
    setSelectedNodeId((current) => (current === nodeId ? null : nodeId));
  }

  return (
    <>
      <section
        aria-label={language === "es" ? "Mapa de relaciones de Obsidian" : "Obsidian relationship map"}
        className="brain-map-shell"
      >
        <div className="brain-map-toolbar">
          <div>
            <p className="brain-kicker">{language === "es" ? "Lienzo de mando del conocimiento" : "Knowledge command canvas"}</p>
            <h2>{language === "es" ? "Fuentes propias, contexto del cliente y rutas de misión" : "Owned sources, client context, and mission trails"}</h2>
          </div>
          <p className="brain-map-hint">{language === "es" ? "Selecciona un nodo para ver el detalle · Esc cierra" : "Select a node for focused detail · Esc closes"}</p>
        </div>

        {graph.nodes.length === 0 ? (
          <div className="brain-map-empty" role="status">
            <strong>{language === "es" ? "La fuente propia requiere información" : "Owned source needs input"}</strong>
            <p>
              {language === "es" ? "La bóveda configurada todavía no contiene la ruta exacta de SIS Custom Creations, por lo que ATLAS no inventará un nodo central." : "The configured vault does not contain the exact SIS Custom Creations source path yet, so ATLAS will not invent a center node."}
            </p>
          </div>
        ) : (
          <div className="brain-map" role="group" aria-label={language === "es" ? "Gráfico interactivo de conocimiento" : "Interactive knowledge graph"}>
            <svg
              aria-hidden="true"
              className="brain-map-lines"
              preserveAspectRatio="none"
              viewBox="0 0 100 100"
            >
              <defs>
                <linearGradient id="brain-map-line" x1="0" x2="1" y1="0" y2="1">
                  <stop offset="0" stopColor="#8b7bf0" stopOpacity=".65" />
                  <stop offset="1" stopColor="#85b9ea" stopOpacity=".42" />
                </linearGradient>
              </defs>
              {graph.edges.map((edge) => {
                const from = graph.nodes.find((node) => node.id === edge.from);
                const to = graph.nodes.find((node) => node.id === edge.to);
                if (!from || !to) return null;
                return (
                  <line
                    className={selectedNodeId && ![edge.from, edge.to].includes(selectedNodeId) ? "is-dimmed" : ""}
                    key={edge.id}
                    stroke="url(#brain-map-line)"
                    strokeDasharray={edge.basis === "exact-client-folder" ? undefined : "1.2 1.2"}
                    strokeWidth=".35"
                    x1={from.position.x}
                    x2={to.position.x}
                    y1={from.position.y}
                    y2={to.position.y}
                  />
                );
              })}
            </svg>
            {graph.nodes.map((node) => (
              <GraphNodeButton
                key={node.id}
                language={language}
                node={node}
                onSelect={() => selectNode(node.id)}
                selected={selectedNodeId === node.id}
              />
            ))}
            <p className="sr-only">
              {language === "es" ? `Se muestran ${graph.nodes.length} nodos de fuente. Usa Tab para moverte entre nodos y Enter o Espacio para abrir el detalle.` : `${graph.nodes.length} source nodes are shown. Use Tab to move between nodes and Enter or Space to open focused detail.`}
            </p>
          </div>
        )}

        <div className="brain-map-legend" aria-label={language === "es" ? "Leyenda de relaciones" : "Relationship legend"}>
          <span><i className="is-owned" /> {language === "es" ? "Fuente propia" : "Owned source"}</span>
          <span><i className="is-client" /> {language === "es" ? "Fuente del cliente" : "Client source"}</span>
          <span><i className="is-mission" /> {language === "es" ? "Ruta de misión o conocimiento" : "Mission or knowledge trail"}</span>
        </div>
      </section>

      <FocusedHud
        eyebrow={selectedNode ? semanticLabel(selectedNode.semanticLabel, language) : language === "es" ? "Detalle de la fuente" : "Source detail"}
        footer={
          selectedNode ? (
            <p className="focused-hud-boundary">
              {language === "es" ? "Metadatos de solo lectura de la bóveda configurada. Aquí no se escribe, sincroniza ni expone el contenido de las notas." : "Read-only metadata from the configured vault. No note content is written, synchronized, or exposed here."}
            </p>
          ) : null
        }
        onClose={() => setSelectedNodeId(null)}
        open={Boolean(selectedNode)}
        status={selectedNode ? statusForNode(selectedNode, language) : undefined}
        title={selectedNode?.label ?? (language === "es" ? "Detalle de la fuente" : "Source detail")}
      >
        {selectedNode ? (
          <NodeDetail language={language} node={selectedNode} noteByPath={noteByPath} />
        ) : null}
      </FocusedHud>
    </>
  );
}

function GraphNodeButton({
  language,
  node,
  onSelect,
  selected,
}: {
  language: SiteLanguage;
  node: ObsidianRelationshipNode;
  onSelect: () => void;
  selected: boolean;
}) {
  return (
    <button
      aria-label={`${node.label}, ${semanticLabel(node.semanticLabel, language)}. ${language === "es" ? "Abrir detalle enfocado." : "Open focused detail."}`}
      aria-pressed={selected}
      className={`brain-graph-node is-${node.kind} ${selected ? "is-selected" : ""}`}
      onClick={onSelect}
      style={{ left: `${node.position.x}%`, top: `${node.position.y}%` }}
      type="button"
    >
      <span className="brain-graph-node-orb" aria-hidden="true" />
      <span className="brain-graph-node-copy">
        <small>{semanticLabel(node.semanticLabel, language)}</small>
        <strong>{node.label}</strong>
      </span>
    </button>
  );
}

function NodeDetail({
  language,
  node,
  noteByPath,
}: {
  language: SiteLanguage;
  node: ObsidianRelationshipNode;
  noteByPath: Map<string, ObsidianNote>;
}) {
  const noteTitles = node.notePaths
    .map((path) => noteByPath.get(path)?.title ?? path.split("/").at(-1)?.replace(/\.md$/i, ""))
    .filter((value): value is string => Boolean(value));

  return (
    <div className="focused-hud-detail">
      <p className="focused-hud-description">
        {node.kind === "owned-source"
          ? language === "es" ? "Tu fuente de conocimiento propia para SIS Custom Creations." : "Your owned knowledge source for SIS Custom Creations."
          : node.kind === "client-source"
            ? language === "es" ? "Una fuente del cliente establecida por una coincidencia exacta de la carpeta CLIENTS." : "A client source established by an exact CLIENTS folder match."
            : node.kind === "mission-source"
              ? language === "es" ? "Una ruta de misión encontrada en una ruta exacta; no es un registro de misión de la aplicación." : "A mission trail found at an exact mission path; it is not an application mission record."
              : language === "es" ? "Una fuente de conocimiento encontrada mediante una ruta exacta de la bóveda." : "A knowledge source found by an exact vault path."}
      </p>
      <div className="focused-hud-section">
        <span className="focused-hud-label">{language === "es" ? "Conocimiento vinculado" : "Linked knowledge"}</span>
        {noteTitles.length > 0 ? (
          <ul>
            {noteTitles.slice(0, 6).map((title) => <li key={title}>{title}</li>)}
          </ul>
        ) : (
          <p className="focused-hud-muted">{language === "es" ? "Todavía no hay metadatos de notas vinculados." : "No note metadata is linked yet."}</p>
        )}
      </div>
      {node.actionTitles.length > 0 ? (
        <div className="focused-hud-section">
          <span className="focused-hud-label">{language === "es" ? "Acciones actuales" : "Current actions"}</span>
          <ul>{node.actionTitles.slice(0, 5).map((title) => <li key={title}>{title}</li>)}</ul>
        </div>
      ) : null}
      <div className="focused-hud-section">
        <span className="focused-hud-label">{language === "es" ? "Límite de la fuente" : "Source boundary"}</span>
        <code>{node.sourcePath}</code>
      </div>
    </div>
  );
}

function statusForNode(node: ObsidianRelationshipNode, language: SiteLanguage) {
  if (node.kind === "client-source") return language === "es" ? "Coincidencia exacta de carpeta del cliente" : "Exact client-folder match";
  if (node.kind === "mission-source") return language === "es" ? "Ruta exacta de misión · requiere vínculo con la aplicación" : "Exact mission-path trail · needs app link";
  return language === "es" ? "Coincidencia exacta de ruta de bóveda" : "Exact vault-path match";
}

function semanticLabel(value: ObsidianRelationshipNode["semanticLabel"], language: SiteLanguage) {
  if (language !== "es") return value;
  return {
    "Owned source": "Fuente propia",
    "Client source": "Fuente del cliente",
    "Knowledge source": "Fuente de conocimiento",
    "Mission trail": "Ruta de misión",
  }[value];
}
