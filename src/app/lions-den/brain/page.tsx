import Link from "next/link";
import type { Metadata } from "next";
import { ObsidianRelationshipGraph } from "@/components/brain/obsidian-relationship-graph";
import { requireSuperAdmin } from "@/server/auth/guards";
import {
  buildObsidianRelationshipGraph,
  discoverObsidianLinks,
} from "@/server/brain/discovery";
import { getObsidianVaultSnapshot } from "@/server/brain/obsidian";
import { getOrganizationsForSuperAdmin } from "@/server/organizations/queries";
import { getPilotWorkspace } from "@/server/pilot/queries";
import { getSalesProspects } from "@/server/sales/queries";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Second Brain | ATLAS OS",
  robots: { index: false, follow: false },
};

type SecondBrainPageProps = {
  searchParams?: Promise<{ hud?: string; node?: string }>;
};

export default async function SecondBrainPage({ searchParams }: SecondBrainPageProps) {
  await requireSuperAdmin("/lions-den/brain");
  const params = await searchParams;
  const [vault, organizations, prospects] = await Promise.all([
    getObsidianVaultSnapshot(),
    getOrganizationsForSuperAdmin(),
    getSalesProspects(),
  ]);
  const pilotWorkspaces = await Promise.all(
    organizations.data.map(async (organization) => ({
      organizationId: organization.id,
      result: await getPilotWorkspace(organization.id),
    })),
  );
  const discovery = discoverObsidianLinks(
    vault,
    organizations.data,
    prospects.data,
  );
  const graph = buildObsidianRelationshipGraph(vault, discovery);
  const actionTitlesByOrganizationId = new Map(
    pilotWorkspaces.map(({ organizationId, result }) => [
      organizationId,
      result.data.actions
        .filter((action) => ["not_started", "in_progress", "blocked"].includes(action.status))
        .map((action) => action.title),
    ]),
  );
  const enrichedGraph = {
    ...graph,
    nodes: graph.nodes.map((node) => {
      if (node.kind !== "client-source") return node;
      const organization = discovery.linkedOrganizations.find(
        (candidate) => node.id === `client-${candidate.organizationId}`,
      );
      return {
        ...node,
        actionTitles: organization
          ? actionTitlesByOrganizationId.get(organization.organizationId) ?? []
          : [],
      };
    }),
  };
  const initialNodeId = params?.node ?? (params?.hud === "obsidian" ? "owned-sis-custom-creations" : undefined);

  return (
    <main className="brain-page">
      <div className="brain-shell">
        <header className="brain-header">
          <div>
            <Link className="brain-back" href="/lions-den">← ATLAS OS command center</Link>
            <p className="brain-kicker">Personal knowledge layer</p>
            <h1>Second Brain</h1>
            <p className="brain-subtitle">
              A focused map of owned knowledge, client context, and mission trails.
              Select a source to open its detail HUD.
            </p>
          </div>
          <span className={`brain-status ${vault.exists ? "is-ready" : "is-needs-input"}`}>
            <span aria-hidden="true" /> {vault.exists ? "Vault connected" : "Needs setup"}
          </span>
        </header>

        {!vault.exists ? (
          <section className="brain-setup" aria-labelledby="brain-setup-title">
            <p className="brain-kicker">Connection required</p>
            <h2 id="brain-setup-title">Owned source needs input</h2>
            <p>{vault.error}</p>
            <code>ATLAS_OBSIDIAN_VAULT_PATH=&lt;absolute-path-to-vault&gt;</code>
            <p className="brain-help">
              Configure the server-only path and restart the app. ATLAS reads
              metadata only; it never uploads, edits, or deletes vault files.
            </p>
          </section>
        ) : (
          <>
            <ObsidianRelationshipGraph
              graph={enrichedGraph}
              initialNodeId={initialNodeId}
              notes={vault.notes}
            />
            {organizations.setupRequired || prospects.setupRequired ? (
              <p className="brain-map-status" role="status">
                Client-source linking needs input because Atlas organization or
                CRM records are not available to the authenticated server query.
              </p>
            ) : null}
          </>
        )}

        <details className="brain-technical-details">
          <summary>Source diagnostics</summary>
          <div className="brain-technical-grid">
            <span>Vault path</span><code>{vault.vaultPath ?? "Not configured"}</code>
            <span>Metadata index</span><strong>{vault.noteCount} Markdown notes</strong>
            <span>Folder index</span><strong>{vault.folderCount} folders</strong>
            <span>Latest metadata change</span><strong>{vault.updatedAt ?? "Not available"}</strong>
          </div>
        </details>
      </div>
    </main>
  );
}
