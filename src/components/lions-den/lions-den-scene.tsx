"use client";

import Image from "next/image";
import Link from "next/link";
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
    <section className="lions-shell" aria-label="Atlas Client Dashboard public playback">
      <div className="lions-copy">
        <span className="tiny-tag">Public workflow playback</span>
        <h1>Watch Atlas and the team move the work.</h1>
        <p>
          This is the sales-safe version of the Client Dashboard. The room is
          powered by assignment events, approval gates, and handoffs, not random
          walking.
        </p>
        <div className="lions-actions">
          <Link href="/assessment" className="primary-cta">
            Start assessment
          </Link>
          <Link href="/login" className="secondary-cta">
            Client login
          </Link>
        </div>
        <p className="lions-note">
          Public mode uses sample data. Private client work stays behind login and
          approval.
        </p>
      </div>

      <div className="office-wrap">
        <div className="office-label">Client Dashboard event floor</div>
        <div className="office-live-badge" aria-live="polite">
          <span className="demo-dot" />
          <strong>PUBLIC PLAYBACK</strong>
          <small>telemetry not connected</small>
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
              <span>{zone.name}</span>
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
                aria-label={`Inspect ${agent.name}`}
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
                  {stateLabels[snapshot.state]}
                </span>
              </button>
            );
          })}

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
          <span>Public playback only. No private client telemetry is exposed here.</span>
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
          <span>Demo event feed</span>
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
