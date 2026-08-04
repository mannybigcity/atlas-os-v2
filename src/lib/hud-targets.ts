export type AtlasHudTargetId =
  | "crm-followups"
  | "sis-custom-creations"
  | "qtime-productions"
  | "obsidian-graph"
  | "missions"
  | "cash-ledger"
  | "agent-status";

export type AtlasHudTarget = {
  id: AtlasHudTargetId;
  eyebrow: string;
  title: string;
  status: string;
  description: string;
  href: string;
  linkLabel: string;
};

const targets: Record<AtlasHudTargetId, AtlasHudTarget> = {
  "crm-followups": {
    id: "crm-followups",
    eyebrow: "CRM / follow-up",
    title: "Sales Command",
    status: "Current Atlas surface",
    description: "Open the current prospect queue, next actions, approval state, and follow-up detail.",
    href: "/lions-den/sales",
    linkLabel: "Open CRM follow-ups",
  },
  "sis-custom-creations": {
    id: "sis-custom-creations",
    eyebrow: "Owned source",
    title: "SIS Custom Creations",
    status: "Obsidian graph source",
    description: "Open the focused read-only HUD for the configured SIS Custom Creations knowledge source.",
    href: "/lions-den/brain?hud=obsidian&node=owned-sis-custom-creations",
    linkLabel: "Open SIS source detail",
  },
  "qtime-productions": {
    id: "qtime-productions",
    eyebrow: "Client source",
    title: "QTime Productions",
    status: "Client workspace route",
    description: "Open the scoped QTime workspace route. Access still depends on the authenticated membership and preview guard.",
    href: "/client?previewOrg=qtime-productions",
    linkLabel: "Open QTime workspace",
  },
  "obsidian-graph": {
    id: "obsidian-graph",
    eyebrow: "Second Brain",
    title: "Obsidian relationship map",
    status: "Read-only configured vault surface",
    description: "Open the graph-first Brain canvas and select an owned, client, knowledge, or mission source.",
    href: "/lions-den/brain",
    linkLabel: "Open Obsidian graph",
  },
  missions: {
    id: "missions",
    eyebrow: "Missions / projects",
    title: "Mission workspace",
    status: "Current pilot workspace surface",
    description: "Open the read-only organization-scoped project and mission registry. Empty records remain empty until an approved workflow creates them.",
    href: "/lions-den/missions",
    linkLabel: "Open missions",
  },
  "cash-ledger": {
    id: "cash-ledger",
    eyebrow: "Cash / payments",
    title: "Verified cash ledger",
    status: "Read-only organization ledger",
    description: "Open verified cash status and payment entries. Unverified entries never count as verified cash.",
    href: "/lions-den/cash",
    linkLabel: "Open cash ledger",
  },
  "agent-status": {
    id: "agent-status",
    eyebrow: "Agent status",
    title: "Agent Command",
    status: "Current Atlas surface",
    description: "Open the agent ledger and approval-gated workflow status. Empty ledgers remain empty; no run is implied.",
    href: "/lions-den/agents",
    linkLabel: "Open agent status",
  },
};

export function getHudTarget(value: string | undefined): AtlasHudTarget | null {
  if (!value || !(value in targets)) return null;
  return targets[value as AtlasHudTargetId];
}
