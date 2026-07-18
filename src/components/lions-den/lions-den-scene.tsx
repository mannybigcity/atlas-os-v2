"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
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
  pathToPolyline,
} from "@/lib/lions-den/pathfinding";
import type {
  AgentSceneSnapshot,
  AgentWorkState,
  LionsDenAgentId,
  WorkEvent,
} from "@/lib/lions-den/types";

const EVENT_DURATION_MS = 4200;

const stateLabels: Record<AgentWorkState, string> = {
  offline: "Offline",
  available: "Available",
  thinking: "Thinking",
  walking: "Walking",
  working: "Working",
  waiting_for_input: "Needs input",
  waiting_for_approval: "Awaiting approval",
  in_meeting: "In meeting",
  handing_off: "Handing off",
  blocked: "Blocked",
  completed: "Completed",
  error: "Needs attention",
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
    <section className="lions-shell" aria-label="Atlas Lion's Den live office demo">
      <div className="lions-copy">
        <span className="tiny-tag">Event-driven office preview</span>
        <h1>Watch Atlas and the team move the work.</h1>
        <p>
          This is the sales-safe version of the Lion&apos;s Den. The room is
          powered by assignment events, approval gates, and handoffs, not random
          walking.
        </p>
        <div className="lions-actions">
          <a href="/assessment" className="primary-cta">
            Start assessment
          </a>
          <a href="/login" className="secondary-cta">
            Client login
          </a>
        </div>
        <p className="lions-note">
          Public mode uses demo data. Private client work stays behind login and
          approval.
        </p>
      </div>

      <div className="office-wrap">
        <div className="office-label">The Lion&apos;s Den — event floor</div>
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
              <span>{zone.name}</span>
            </div>
          ))}

          <svg className="path-layer" viewBox="0 0 100 100" aria-hidden="true">
            {navigationEdges.map((edge) => {
              const start = navigationNodes.find((node) => node.id === edge.from);
              const end = navigationNodes.find((node) => node.id === edge.to);
              if (!start || !end) return null;
              return (
                <line
                  key={`${edge.from}-${edge.to}`}
                  x1={start.x}
                  y1={start.y}
                  x2={end.x}
                  y2={end.y}
                  className="path-edge"
                />
              );
            })}
            <polyline
              points={pathToPolyline(activePath, navigationNodes)}
              className="active-path"
            />
            {navigationNodes.map((node) => (
              <circle
                key={node.id}
                cx={node.x}
                cy={node.y}
                r={activePath.includes(node.id) ? 1.25 : 0.65}
                className={activePath.includes(node.id) ? "node active-node" : "node"}
              />
            ))}
          </svg>

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
            const selected = selectedAgentId === agent.id;

            return (
              <button
                key={agent.id}
                type="button"
                className={`agent-sprite ${selected ? "selected" : ""}`}
                style={{
                  left: `${position.x}%`,
                  top: `${position.y}%`,
                  ["--agent-accent" as string]: agent.accent,
                }}
                onClick={() => setSelectedAgentId(agent.id)}
                aria-label={`Inspect ${agent.name}`}
              >
                <Image
                  src={agent.sprite}
                  alt=""
                  width={92}
                  height={124}
                  sizes="92px"
                />
                <span className={`agent-state agent-state-${statusTone(snapshot.state)}`}>
                  {stateLabels[snapshot.state]}
                </span>
              </button>
            );
          })}

          <div className="mission-board">
            <span>Mission</span>
            <strong>Stop losing revenue between inquiry and follow-up.</strong>
            <small>Stage: {activeEvent.eventType.replaceAll("_", " ")}</small>
          </div>

          <div className="command-board">
            <span>Command board</span>
            <div>
              <strong>17</strong>
              <small>lead signals</small>
            </div>
            <div>
              <strong>5</strong>
              <small>drafts waiting</small>
            </div>
            <div>
              <strong>3</strong>
              <small>follow-ups due</small>
            </div>
            <div>
              <strong>2</strong>
              <small>approvals</small>
            </div>
          </div>
        </div>

        <div className="office-controls">
          <button type="button" onClick={() => setIsPaused((value) => !value)}>
            {isPaused ? "Resume room" : "Pause room"}
          </button>
          <button
            type="button"
            onClick={() => {
              setEventIndex(0);
              setProgress(0);
              setSelectedAgentId("atlas");
            }}
          >
            Restart mission
          </button>
          <span>Event source: demo adapter now, live Supabase/WebSocket adapter next.</span>
        </div>
      </div>

      <aside className="agent-inspector">
        {selectedAgent && selectedSnapshot ? (
          <>
            <div className="inspector-head">
              <Image
                src={selectedAgent.portrait}
                alt={`${selectedAgent.name} portrait`}
                width={84}
                height={84}
              />
              <div>
                <span>{selectedAgent.animal}</span>
                <h2>{selectedAgent.name}</h2>
                <p>{selectedAgent.role}</p>
              </div>
            </div>
            <dl>
              <div>
                <dt>Status</dt>
                <dd>{stateLabels[selectedSnapshot.state]}</dd>
              </div>
              <div>
                <dt>Assignment</dt>
                <dd>{selectedSnapshot.currentAssignment}</dd>
              </div>
              <div>
                <dt>Next action</dt>
                <dd>{selectedSnapshot.nextExpectedAction}</dd>
              </div>
            </dl>
            <div className="tool-strip" aria-label={`${selectedAgent.name} indicators`}>
              {selectedAgent.tools.map((tool) => (
                <span key={tool.label} className={`tool-pill tool-${tool.state}`}>
                  {tool.label}
                </span>
              ))}
            </div>
          </>
        ) : null}
      </aside>

      <div className="activity-feed">
        <div className="feed-title">
          <span>Live work feed</span>
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
              <strong>{event.safeSummary}</strong>
              <small>{event.approvalRequired ? "Approval protected" : event.eventType.replaceAll("_", " ")}</small>
            </button>
          );
        })}
      </div>
    </section>
  );
}
