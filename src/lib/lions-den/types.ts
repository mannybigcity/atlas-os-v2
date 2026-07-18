export type LionsDenAgentId = "atlas" | "hunter" | "micah" | "david";

export type AgentWorkState =
  | "offline"
  | "available"
  | "thinking"
  | "walking"
  | "working"
  | "waiting_for_input"
  | "waiting_for_approval"
  | "in_meeting"
  | "handing_off"
  | "blocked"
  | "completed"
  | "error";

export type WorkEventType =
  | "mission_received"
  | "assignment_created"
  | "agent_departed"
  | "work_started"
  | "deliverable_created"
  | "meeting_started"
  | "approval_requested"
  | "approval_granted"
  | "handoff_started"
  | "handoff_completed"
  | "follow_up_queued"
  | "mission_updated";

export type OfficeZoneKind =
  | "command"
  | "research"
  | "creative"
  | "crm"
  | "meeting"
  | "approval"
  | "mission"
  | "revenue"
  | "hall";

export interface OfficeZone {
  id: string;
  name: string;
  kind: OfficeZoneKind;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface NavigationNode {
  id: string;
  label: string;
  zoneId: string;
  x: number;
  y: number;
  meaning: string;
}

export interface NavigationEdge {
  from: string;
  to: string;
  weight?: number;
}

export interface AgentToolIndicator {
  label: string;
  state: "ready" | "watching" | "queued" | "approval" | "planned";
}

export interface LionsDenAgent {
  id: LionsDenAgentId;
  name: string;
  role: string;
  animal: string;
  homeNodeId: string;
  sprite: string;
  portrait: string;
  accent: string;
  tools: AgentToolIndicator[];
}

export interface WorkEvent {
  id: string;
  organizationId: string;
  missionId: string;
  workItemId: string;
  agentId: LionsDenAgentId;
  eventType: WorkEventType;
  state: AgentWorkState;
  fromNodeId: string;
  toNodeId: string;
  safeSummary: string;
  targetAgentId?: LionsDenAgentId;
  targetZoneId?: string;
  deliverableId?: string;
  nextExpectedAction: string;
  approvalRequired?: boolean;
  occurredAt: string;
}

export interface AgentSceneSnapshot {
  agentId: LionsDenAgentId;
  state: AgentWorkState;
  nodeId: string;
  targetNodeId: string;
  currentAssignment: string;
  lastEvent: string;
  nextExpectedAction: string;
}
