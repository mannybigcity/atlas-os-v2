import assert from "node:assert/strict";
import test from "node:test";
import {
  buildObsidianRelationshipGraph,
  discoverObsidianLinks,
} from "./discovery";
import type { OrganizationSummary } from "@/server/organizations/queries";
import type { SalesProspect } from "@/server/sales/queries";

const organization = {
  id: "org-qtime",
  name: "QTime Productions",
  slug: "qtime-productions",
  createdAt: "2026-07-01T00:00:00.000Z",
} as OrganizationSummary;

const prospect = {
  id: "prospect-1",
  assessmentSubmissionId: null,
  convertedOrganizationId: null,
  businessName: "North Star HVAC",
  status: "new",
  assignedRole: "hunter",
  industry: null,
  addressLine1: null,
  city: null,
  region: null,
  postalCode: null,
  countryCode: "US",
  website: null,
  websiteDomain: null,
  contactName: null,
  contactEmail: null,
  contactPhone: null,
  socialMedia: null,
  contactBasis: "unknown",
  fitScore: null,
  fitReason: null,
  researchSummary: null,
  nextAction: null,
  nextActionAt: null,
  lastContactedAt: null,
  outreachApprovedAt: null,
  approvedChannels: [],
  duplicateOf: null,
  createdAt: "2026-07-01T00:00:00.000Z",
  updatedAt: "2026-07-01T00:00:00.000Z",
} as SalesProspect;

test("links exact client folders and counts mission notes", () => {
  const result = discoverObsidianLinks(
    {
      configured: true,
      vaultPath: null,
      exists: true,
      noteCount: 3,
      folderCount: 2,
      updatedAt: "2026-07-02T00:00:00.000Z",
      notes: [
        note("CLIENTS/QTIME PRODUCTIONS/Business Assessment.md"),
        note("RAMFAM_KINGDOM_BRAIN/06_MISSIONS/mission.md"),
        note("North Star HVAC.md"),
      ],
      error: null,
    },
    [organization],
    [prospect],
  );

  assert.equal(result.state, "connected");
  assert.equal(result.linkedOrganizations[0]?.organizationId, "org-qtime");
  assert.equal(result.linkedOrganizations[0]?.noteCount, 1);
  assert.equal(result.missionNoteCount, 1);
  assert.equal(result.prospectCandidates[0]?.prospectId, "prospect-1");
});

test("does not infer a relationship from a similar name", () => {
  const result = discoverObsidianLinks(
    {
      configured: true,
      vaultPath: null,
      exists: true,
      noteCount: 1,
      folderCount: 0,
      updatedAt: null,
      notes: [note("CLIENTS/QTime Events/notes.md")],
      error: null,
    },
    [organization],
    [],
  );

  assert.equal(result.linkedOrganizations.length, 0);
  assert.deepEqual(result.unmatchedClientFolders, ["qtime events"]);
});

test("keeps unconfigured vaults in a needs-input state", () => {
  const result = discoverObsidianLinks(
    {
      configured: false,
      vaultPath: null,
      exists: false,
      noteCount: 0,
      folderCount: 0,
      updatedAt: null,
      notes: [],
      error: "ATLAS_OBSIDIAN_VAULT_PATH is not configured.",
    },
    [],
    [],
  );

  assert.equal(result.state, "needs-input");
  assert.deepEqual(result.linkedOrganizations, []);
});

test("builds a small graph from exact owned, client, and mission paths", () => {
  const vault = {
    configured: true,
    vaultPath: null,
    exists: true,
    noteCount: 5,
    folderCount: 4,
    updatedAt: "2026-07-02T00:00:00.000Z",
    notes: [
      note("RAMFAM_KINGDOM_BRAIN/02_SIS_CUSTOM_CREATIONS/QUOTE_PROCESS.md"),
      note("SIS_30_DAY_REVENUE_LAUNCH.md"),
      note("CLIENTS/QTIME PRODUCTIONS/PROJECT_MEMORY.md"),
      note("RAMFAM_KINGDOM_BRAIN/06_MISSIONS/commerce_pipeline_runner/summary.md"),
      note("RAMFAM_KINGDOM_BRAIN/06_MISSIONS/seasonal_opportunity_analysis/report.md"),
    ],
    error: null,
  };
  const discovery = discoverObsidianLinks(vault, [organization], []);
  const graph = buildObsidianRelationshipGraph(vault, discovery);

  assert.equal(graph.state, "connected");
  assert.equal(graph.nodes[0]?.label, "SIS Custom Creations");
  assert.equal(graph.nodes.find((node) => node.label === "QTime Productions")?.semanticLabel, "Client source");
  assert.equal(graph.nodes.filter((node) => node.kind === "mission-source").length, 2);
  assert.equal(graph.edges.length, graph.nodes.length - 1);
});

function note(path: string) {
  return {
    path,
    title: path.split("/").at(-1)!.replace(/\.md$/i, ""),
    folder: "Root",
    updatedAt: "2026-07-02T00:00:00.000Z",
    size: 100,
  };
}

