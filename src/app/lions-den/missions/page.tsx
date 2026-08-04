import type { Metadata } from "next";
import { SurfaceShell } from "@/components/surface-shell";
import { ProjectsMissionsSurface } from "@/components/operations-surface";
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
  const [operations, organizations] = await Promise.all([
    getOperationsSnapshot(),
    getOrganizationsForSuperAdmin(),
  ]);
  const organizationNames = new Map(
    organizations.data.map((organization) => [organization.id, organization.name]),
  );

  return (
    <SurfaceShell
      description="A read-only view of organization-scoped projects and missions. Records appear only when an approved workflow creates them."
      eyebrow="Atlas Operations"
      title="Projects & Missions"
    >
      <ProjectsMissionsSurface
        operations={operations}
        organizationNames={organizationNames}
      />
    </SurfaceShell>
  );
}
