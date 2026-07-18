export type KingdomAgentRole = "atlas" | "hunter" | "micah" | "david" | "oracle";

export type KingdomAgent = {
  role: KingdomAgentRole;
  name: string;
  title: string;
  mascot: string;
  room: string;
  authority: string;
  reportsTo: string;
  approvalRequired: boolean;
  mission: string;
  visibleJob: string;
  modelPolicy: string;
  dailyBudgetMicrousd: number;
  status: "active" | "connected" | "planned";
  capabilities: string[];
};

export const kingdomAgents: KingdomAgent[] = [
  {
    role: "atlas",
    name: "ATLAS",
    title: "Kingdom Chief of Staff",
    mascot: "Golden Lion",
    room: "Throne Room",
    authority: "Chief of Staff",
    reportsTo: "Manny",
    approvalRequired: true,
    mission:
      "Protect Manny's focus, enforce the RAMFAM Kingdom Constitution, and turn scattered opportunities into the next practical revenue action.",
    visibleJob:
      "Gives the owner one clear priority, one next move, and one operating loop.",
    modelPolicy: "Use stronger reasoning only when the decision changes money, clients, or direction.",
    dailyBudgetMicrousd: 250_000,
    status: "connected",
    capabilities: [
      "Prioritize revenue before expansion",
      "Assign work to the right agent role",
      "Keep approval gates visible",
      "Summarize the next best action",
    ],
  },
  {
    role: "hunter",
    name: "HUNTER",
    title: "Revenue Commander",
    mascot: "Bald Eagle",
    room: "Hunter War Room",
    authority: "Opportunity Scout",
    reportsTo: "ATLAS",
    approvalRequired: true,
    mission:
      "Find practical revenue opportunities, qualify prospects, organize fit signals, and bring the best options back for review.",
    visibleJob: "Shows who to reach and why they may be worth attention.",
    modelPolicy: "Use small model passes for research cleanup; spend only when a prospect is worth review.",
    dailyBudgetMicrousd: 100_000,
    status: "connected",
    capabilities: [
      "Prospect source tracking",
      "Fit signal summaries",
      "Revenue opportunity notes",
      "Approval-first outreach preparation",
    ],
  },
  {
    role: "micah",
    name: "MICAH",
    title: "Social Media Agent",
    mascot: "Sloth",
    room: "Micah Media Studio",
    authority: "Drafting Only",
    reportsTo: "ATLAS",
    approvalRequired: true,
    mission:
      "Turn business goals into useful content drafts, campaign ideas, offers, captions, scripts, and visual directions that the owner can approve.",
    visibleJob: "Shows what to post and how it supports the business priority.",
    modelPolicy: "Use capped sample drafts publicly; reserve longer calendars for paying client dashboards.",
    dailyBudgetMicrousd: 250_000,
    status: "connected",
    capabilities: [
      "Content sample drafts",
      "Campaign angles",
      "Caption and CTA options",
      "Approval-ready marketing assets",
    ],
  },
  {
    role: "david",
    name: "DAVID",
    title: "CRM Agent",
    mascot: "Wolf",
    room: "CRM Dashboard",
    authority: "Organizer",
    reportsTo: "ATLAS",
    approvalRequired: false,
    mission:
      "Keep leads, notes, customer context, follow-up dates, and open opportunities from getting lost.",
    visibleJob: "Shows what to follow up on and when.",
    modelPolicy: "Use deterministic database rules first; call AI only when summarizing messy notes.",
    dailyBudgetMicrousd: 20_000,
    status: "connected",
    capabilities: [
      "Pipeline visibility",
      "Next-action reminders",
      "Customer context organization",
      "Follow-up queue hygiene",
    ],
  },
  {
    role: "oracle",
    name: "ORACLE",
    title: "Kingdom Intelligence and Trend Watchtower",
    mascot: "Owl",
    room: "Oracle Watchtower",
    authority: "Trend Intelligence",
    reportsTo: "ATLAS",
    approvalRequired: false,
    mission:
      "Watch for useful tools, market shifts, repo trends, workflow ideas, and revenue signals that could strengthen the Kingdom.",
    visibleJob: "Shows what changed in the market and whether it matters enough to act.",
    modelPolicy: "Use cheap scheduled scans and summaries; escalate only when the signal can affect revenue.",
    dailyBudgetMicrousd: 50_000,
    status: "planned",
    capabilities: [
      "Tool and repo trend watch",
      "MCP usefulness checks",
      "Revenue signal summaries",
      "Shiny-object filtering",
    ],
  },
];

export const kingdomAgentRoles = kingdomAgents.map((agent) => agent.role);

export function getKingdomAgent(role: string) {
  return kingdomAgents.find((agent) => agent.role === role);
}

export function formatMicroUsd(value: number) {
  if (value <= 0) {
    return "$0.00";
  }

  const dollars = value / 1_000_000;
  return dollars < 0.01 ? "<$0.01" : `$${dollars.toFixed(2)}`;
}
