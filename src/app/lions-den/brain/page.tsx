import Link from "next/link";
import type { Metadata } from "next";
import { ObsidianRelationshipGraph } from "@/components/brain/obsidian-relationship-graph";
import { getSiteLanguage } from "@/lib/site-language-server";
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
  const [language, vault, organizations, prospects] = await Promise.all([
    getSiteLanguage(),
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
            <Link className="brain-back" href="/lions-den">← {language === "es" ? "Centro de mando de ATLAS OS" : "ATLAS OS command center"}</Link>
            <p className="brain-kicker">{language === "es" ? "Capa de conocimiento personal" : "Personal knowledge layer"}</p>
            <h1>{language === "es" ? "Segundo cerebro" : "Second Brain"}</h1>
            <p className="brain-subtitle">
              {language === "es" ? "Un mapa enfocado de conocimiento propio, contexto del cliente y rutas de misión. Selecciona una fuente para abrir su HUD de detalle." : "A focused map of owned knowledge, client context, and mission trails. Select a source to open its detail HUD."}
            </p>
          </div>
          <span className={`brain-status ${vault.exists ? "is-ready" : "is-needs-input"}`}>
            <span aria-hidden="true" /> {vault.exists ? language === "es" ? "Bóveda conectada" : "Vault connected" : language === "es" ? "Requiere configuración" : "Needs setup"}
          </span>
        </header>

        {!vault.exists ? (
          <section className="brain-setup" aria-labelledby="brain-setup-title">
            <p className="brain-kicker">{language === "es" ? "Se requiere conexión" : "Connection required"}</p>
            <h2 id="brain-setup-title">{language === "es" ? "La fuente propia requiere información" : "Owned source needs input"}</h2>
            <p>{vault.error}</p>
            <code>ATLAS_OBSIDIAN_VAULT_PATH=&lt;absolute-path-to-vault&gt;</code>
            <p className="brain-help">
              {language === "es" ? "Configura la ruta exclusiva del servidor y reinicia la aplicación. ATLAS solo lee metadatos; nunca sube, edita ni elimina archivos de la bóveda." : "Configure the server-only path and restart the app. ATLAS reads metadata only; it never uploads, edits, or deletes vault files."}
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
                {language === "es" ? "La vinculación de fuentes del cliente requiere información porque los registros de organizaciones o del CRM no están disponibles para la consulta autenticada del servidor." : "Client-source linking needs input because Atlas organization or CRM records are not available to the authenticated server query."}
              </p>
            ) : null}
          </>
        )}

        <details className="brain-technical-details">
          <summary>{language === "es" ? "Diagnóstico de fuentes" : "Source diagnostics"}</summary>
          <div className="brain-technical-grid">
            <span>{language === "es" ? "Ruta de la bóveda" : "Vault path"}</span><code>{vault.vaultPath ?? (language === "es" ? "No configurada" : "Not configured")}</code>
            <span>{language === "es" ? "Índice de metadatos" : "Metadata index"}</span><strong>{vault.noteCount} {language === "es" ? "notas Markdown" : "Markdown notes"}</strong>
            <span>{language === "es" ? "Índice de carpetas" : "Folder index"}</span><strong>{vault.folderCount} {language === "es" ? "carpetas" : "folders"}</strong>
            <span>{language === "es" ? "Último cambio de metadatos" : "Latest metadata change"}</span><strong>{vault.updatedAt ?? (language === "es" ? "No disponible" : "Not available")}</strong>
          </div>
        </details>
      </div>
    </main>
  );
}
