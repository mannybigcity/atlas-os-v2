import type { Metadata } from "next";
import { SurfaceShell } from "@/components/surface-shell";
import { ProjectsMissionsSurface } from "@/components/operations-surface";
import { getSiteLanguage } from "@/lib/site-language-server";
import { requireSuperAdmin } from "@/server/auth/guards";
import { getOperationsSnapshot } from "@/server/operations/queries";
import { getOrganizationsForSuperAdmin } from "@/server/organizations/queries";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Projects & Missions | ATLAS OS",
  robots: { index: false, follow: false },
};

export default async function MissionsPage() {
  await requireSuperAdmin("/lions-den/missions");
  const [language, operations, organizations] = await Promise.all([
    getSiteLanguage(),
    getOperationsSnapshot(),
    getOrganizationsForSuperAdmin(),
  ]);
  const organizationNames = new Map(
    organizations.data.map((organization) => [organization.id, organization.name]),
  );

  return (
    <SurfaceShell
      description={language === "es" ? "Una vista de solo lectura de proyectos y misiones por organización. Los registros aparecen únicamente cuando un flujo aprobado los crea." : "A read-only view of organization-scoped projects and missions. Records appear only when an approved workflow creates them."}
      eyebrow={language === "es" ? "Operaciones de Atlas" : "Atlas Operations"}
      title={language === "es" ? "Proyectos y misiones" : "Projects & Missions"}
    >
      <ProjectsMissionsSurface
        language={language}
        operations={operations}
        organizationNames={organizationNames}
      />
    </SurfaceShell>
  );
}
