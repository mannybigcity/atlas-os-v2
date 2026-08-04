"use client";

import { useMemo, useState } from "react";
import { FocusedHud } from "@/components/focused-hud";
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
        aria-label="Obsidian relationship map"
        className="brain-map-shell"
      >
        <div className="brain-map-toolbar">
          <div>
            <p className="brain-kicker">Knowledge command canvas</p>
            <h2>Owned sources, client context, and mission trails</h2>
          </div>
          <p className="brain-map-hint">Select a node for focused detail · Esc closes</p>
        </div>

        {graph.nodes.length === 0 ? (
          <div className="brain-map-empty" role="status">
            <strong>Owned source needs input</strong>
            <p>
              The configured vault does not contain the exact SIS Custom Creations
              source path yet, so ATLAS will not invent a center node.
            </p>
          </div>
        ) : (
          <div className="brain-map" role="group" aria-label="Interactive knowledge graph">
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
                node={node}
                onSelect={() => selectNode(node.id)}
                selected={selectedNodeId === node.id}
              />
            ))}
            <p className="sr-only">
              {graph.nodes.length} source nodes are shown. Use Tab to move between
              nodes and Enter or Space to open focused detail.
            </p>
          </div>
        )}

        <div className="brain-map-legend" aria-label="Relationship legend">
          <span><i className="is-owned" /> Owned source</span>
          <span><i className="is-client" /> Client source</span>
          <span><i className="is-mission" /> Mission or knowledge trail</span>
        </div>
      </section>

      <FocusedHud
        eyebrow={selectedNode?.semanticLabel ?? "Source detail"}
        footer={
          selectedNode ? (
            <p className="focused-hud-boundary">
              Read-only metadata from the configured vault. No note content is
              written, synchronized, or exposed here.
            </p>
          ) : null
        }
        onClose={() => setSelectedNodeId(null)}
        open={Boolean(selectedNode)}
        status={selectedNode ? statusForNode(selectedNode) : undefined}
        title={selectedNode?.label ?? "Source detail"}
      >
        {selectedNode ? (
          <NodeDetail node={selectedNode} noteByPath={noteByPath} />
        ) : null}
      </FocusedHud>
    </>
  );
}

function GraphNodeButton({
  node,
  onSelect,
  selected,
}: {
  node: ObsidianRelationshipNode;
  onSelect: () => void;
  selected: boolean;
}) {
  return (
    <button
      aria-label={`${node.label}, ${node.semanticLabel}. Open focused detail.`}
      aria-pressed={selected}
      className={`brain-graph-node is-${node.kind} ${selected ? "is-selected" : ""}`}
      onClick={onSelect}
      style={{ left: `${node.position.x}%`, top: `${node.position.y}%` }}
      type="button"
    >
      <span className="brain-graph-node-orb" aria-hidden="true" />
      <span className="brain-graph-node-copy">
        <small>{node.semanticLabel}</small>
        <strong>{node.label}</strong>
      </span>
    </button>
  );
}

function NodeDetail({
  node,
  noteByPath,
}: {
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
          ? "Your owned knowledge source for SIS Custom Creations."
          : node.kind === "client-source"
            ? "A client source established by an exact CLIENTS folder match."
            : node.kind === "mission-source"
              ? "A mission trail found at an exact mission path; it is not an application mission record."
              : "A knowledge source found by an exact vault path."}
      </p>
      <div className="focused-hud-section">
        <span className="focused-hud-label">Linked knowledge</span>
        {noteTitles.length > 0 ? (
          <ul>
            {noteTitles.slice(0, 6).map((title) => <li key={title}>{title}</li>)}
          </ul>
        ) : (
          <p className="focused-hud-muted">No note metadata is linked yet.</p>
        )}
      </div>
      {node.actionTitles.length > 0 ? (
        <div className="focused-hud-section">
          <span className="focused-hud-label">Current actions</span>
          <ul>{node.actionTitles.slice(0, 5).map((title) => <li key={title}>{title}</li>)}</ul>
        </div>
      ) : null}
      <div className="focused-hud-section">
        <span className="focused-hud-label">Source boundary</span>
        <code>{node.sourcePath}</code>
      </div>
    </div>
  );
}

function statusForNode(node: ObsidianRelationshipNode) {
  if (node.kind === "client-source") return "Exact client-folder match";
  if (node.kind === "mission-source") return "Exact mission-path trail · needs app link";
  return "Exact vault-path match";
}
