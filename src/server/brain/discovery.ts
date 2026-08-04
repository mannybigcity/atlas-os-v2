import type { OrganizationSummary } from "@/server/organizations/queries";
import type { SalesProspect } from "@/server/sales/queries";
import type { ObsidianNote, ObsidianVaultSnapshot } from "@/server/brain/obsidian";

export type ObsidianOrganizationLink = {
  organizationId: string;
  organizationName: string;
  organizationSlug: string | null;
  noteCount: number;
  notePaths: string[];
  basis: "exact-client-folder";
};

export type ObsidianProspectCandidate = {
  prospectId: string;
  businessName: string;
  notePaths: string[];
  basis: "exact-note-name";
};

export type ObsidianDiscovery = {
  state: "connected" | "empty" | "needs-input";
  linkedOrganizations: ObsidianOrganizationLink[];
  prospectCandidates: ObsidianProspectCandidate[];
  missionNoteCount: number;
  missionNotePaths: string[];
  unmatchedClientFolders: string[];
};

export type ObsidianRelationshipNode = {
  id: string;
  label: string;
  kind: "owned-source" | "client-source" | "knowledge-source" | "mission-source";
  semanticLabel: "Owned source" | "Client source" | "Knowledge source" | "Mission trail";
  sourcePath: string;
  notePaths: string[];
  actionTitles: string[];
  position: { x: number; y: number };
  basis: "exact-path" | "exact-client-folder" | "exact-mission-folder";
};

export type ObsidianRelationshipEdge = {
  id: string;
  from: string;
  to: string;
  label: string;
  basis: ObsidianRelationshipNode["basis"];
};

export type ObsidianRelationshipGraph = {
  state: ObsidianDiscovery["state"];
  nodes: ObsidianRelationshipNode[];
  edges: ObsidianRelationshipEdge[];
};

const clientRoot = "clients";
const missionRoot = "ramfam_kingdom_brain/06_missions";
const ownedRoot = "ramfam_kingdom_brain/02_sis_custom_creations";
const revenueLaunchNote = "sis_30_day_revenue_launch.md";

export function discoverObsidianLinks(
  vault: ObsidianVaultSnapshot,
  organizations: OrganizationSummary[],
  prospects: SalesProspect[],
): ObsidianDiscovery {
  if (!vault.exists) {
    return emptyDiscovery("needs-input");
  }

  if (vault.notes.length === 0) {
    return emptyDiscovery("empty");
  }

  const clientFolders = new Map<string, ObsidianNote[]>();
  const missionNotes: ObsidianNote[] = [];

  for (const note of vault.notes) {
    const normalizedPath = normalizePath(note.path);
    const segments = normalizedPath.split("/");

    if (segments[0] === clientRoot && segments[1]) {
      const folderName = segments[1];
      clientFolders.set(folderName, [
        ...(clientFolders.get(folderName) ?? []),
        note,
      ]);
    }

    if (
      normalizedPath === missionRoot ||
      normalizedPath.startsWith(`${missionRoot}/`)
    ) {
      missionNotes.push(note);
    }
  }

  const linkedOrganizations: ObsidianOrganizationLink[] = [];
  const matchedClientFolders = new Set<string>();

  for (const organization of organizations) {
    const organizationKeys = new Set(
      [organization.name, organization.slug]
        .filter((value): value is string => Boolean(value))
        .map(normalizeName),
    );
    const matchingFolder = [...clientFolders.entries()].find(([folder]) =>
      organizationKeys.has(normalizeName(folder)),
    );

    if (!matchingFolder) {
      continue;
    }

    const [folder, notes] = matchingFolder;
    matchedClientFolders.add(folder);
    linkedOrganizations.push({
      organizationId: organization.id,
      organizationName: organization.name,
      organizationSlug: organization.slug,
      noteCount: notes.length,
      notePaths: notes
        .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
        .slice(0, 8)
        .map((note) => note.path),
      basis: "exact-client-folder",
    });
  }

  const prospectCandidates = prospects.flatMap((prospect) => {
    const matchingNotes = vault.notes.filter((note) => {
      const noteName = normalizeName(note.title);
      const pathNames = normalizePath(note.path)
        .split("/")
        .map(normalizeName);
      const prospectName = normalizeName(prospect.businessName);
      return noteName === prospectName || pathNames.includes(prospectName);
    });

    return matchingNotes.length > 0
      ? [{
          prospectId: prospect.id,
          businessName: prospect.businessName,
          notePaths: matchingNotes.slice(0, 8).map((note) => note.path),
          basis: "exact-note-name" as const,
        }]
      : [];
  });

  return {
    state: "connected",
    linkedOrganizations: linkedOrganizations.sort((left, right) =>
      left.organizationName.localeCompare(right.organizationName),
    ),
    prospectCandidates,
    missionNoteCount: missionNotes.length,
    missionNotePaths: missionNotes
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
      .slice(0, 8)
      .map((note) => note.path),
    unmatchedClientFolders: [...clientFolders.keys()]
      .filter((folder) => !matchedClientFolders.has(folder))
      .sort((left, right) => left.localeCompare(right))
      .slice(0, 20),
  };
}

export function buildObsidianRelationshipGraph(
  vault: ObsidianVaultSnapshot,
  discovery: ObsidianDiscovery,
): ObsidianRelationshipGraph {
  if (!vault.exists) {
    return { state: "needs-input", nodes: [], edges: [] };
  }

  const notesByPath = new Map(
    vault.notes.map((note) => [normalizePath(note.path), note]),
  );
  const ownedNotes = notesUnder(vault.notes, ownedRoot);
  if (ownedNotes.length === 0) {
    return { state: "needs-input", nodes: [], edges: [] };
  }

  const nodes: ObsidianRelationshipNode[] = [
    {
      id: "owned-sis-custom-creations",
      label: "SIS Custom Creations",
      kind: "owned-source",
      semanticLabel: "Owned source",
      sourcePath: ownedRoot,
      notePaths: recentPaths(ownedNotes, 8),
      actionTitles: [],
      position: { x: 50, y: 50 },
      basis: "exact-path",
    },
  ];

  const launchNote = notesByPath.get(revenueLaunchNote);
  if (launchNote) {
    nodes.push({
      id: "owned-revenue-launch",
      label: "30-day revenue launch",
      kind: "knowledge-source",
      semanticLabel: "Knowledge source",
      sourcePath: launchNote.path,
      notePaths: [launchNote.path],
      actionTitles: [],
      position: { x: 18, y: 22 },
      basis: "exact-path",
    });
  }

  const missionGroups = new Map<string, ObsidianNote[]>();
  for (const note of vault.notes) {
    const segments = normalizePath(note.path).split("/");
    if (segments[0] !== "ramfam_kingdom_brain" || segments[1] !== "06_missions" || !segments[2]) {
      continue;
    }

    missionGroups.set(segments[2], [
      ...(missionGroups.get(segments[2]) ?? []),
      note,
    ]);
  }

  [...missionGroups.entries()]
    .sort((left, right) => latestNote(right[1]).localeCompare(latestNote(left[1])))
    .slice(0, 2)
    .forEach(([folder, notes], index) => {
      const nodeId = `mission-${folder}`;
      nodes.push({
        id: nodeId,
        label: humanizeFolder(folder),
        kind: "mission-source",
        semanticLabel: "Mission trail",
        sourcePath: `${missionRoot}/${folder}`,
        notePaths: recentPaths(notes, 8),
        actionTitles: [],
        position: { x: 18, y: index === 0 ? 76 : 90 },
        basis: "exact-mission-folder",
      });
    });

  discovery.linkedOrganizations.slice(0, 3).forEach((organization, index) => {
    nodes.push({
      id: `client-${organization.organizationId}`,
      label: organization.organizationName,
      kind: "client-source",
      semanticLabel: "Client source",
      sourcePath: `CLIENTS/${organization.organizationName}`,
      notePaths: organization.notePaths,
      actionTitles: [],
      position: { x: 82, y: index === 0 ? 50 : 26 + index * 32 },
      basis: "exact-client-folder",
    });
  });

  const hub = nodes[0];
  const edges: ObsidianRelationshipEdge[] = nodes.slice(1).map((node) => ({
    id: `${hub.id}-${node.id}`,
    from: hub.id,
    to: node.id,
    label:
      node.kind === "client-source"
        ? "client source"
        : node.kind === "mission-source"
          ? "mission trail"
          : "owned knowledge",
    basis: node.basis,
  }));

  return {
    state: nodes.length > 1 ? "connected" : "empty",
    nodes,
    edges,
  };
}

function normalizePath(value: string) {
  return value.replaceAll("\\", "/").replace(/^\/+|\/+$/g, "").toLowerCase();
}

function normalizeName(value: string) {
  return value
    .toLowerCase()
    .replaceAll("&", " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function notesUnder(notes: ObsidianNote[], root: string) {
  const normalizedRoot = normalizePath(root);
  return notes.filter((note) => {
    const normalized = normalizePath(note.path);
    return normalized === normalizedRoot || normalized.startsWith(`${normalizedRoot}/`);
  });
}

function recentPaths(notes: ObsidianNote[], limit: number) {
  return [...notes]
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
    .slice(0, limit)
    .map((note) => note.path);
}

function latestNote(notes: ObsidianNote[]) {
  return [...notes].sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))[0]?.updatedAt ?? "";
}

function humanizeFolder(value: string) {
  return value
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function emptyDiscovery(
  state: ObsidianDiscovery["state"],
): ObsidianDiscovery {
  return {
    state,
    linkedOrganizations: [],
    prospectCandidates: [],
    missionNoteCount: 0,
    missionNotePaths: [],
    unmatchedClientFolders: [],
  };
}
