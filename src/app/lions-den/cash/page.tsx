import type { Metadata } from "next";
import { CashLedgerSurface } from "@/components/operations-surface";
import { SurfaceShell } from "@/components/surface-shell";
import { requireSuperAdmin } from "@/server/auth/guards";
import { getOperationsSnapshot } from "@/server/operations/queries";
import { getOrganizationsForSuperAdmin } from "@/server/organizations/queries";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Cash Ledger | ATLAS OS",
  robots: { index: false, follow: false },
};

export default async function CashPage() {
  await requireSuperAdmin("/lions-den/cash");
  const [operations, organizations] = await Promise.all([
    getOperationsSnapshot(),
    getOrganizationsForSuperAdmin(),
  ]);
  const organizationNames = new Map(
    organizations.data.map((organization) => [organization.id, organization.name]),
  );

  return (
    <SurfaceShell
      description="A read-only payment and cash ledger. Only verified settled or refunded entries count toward verified totals."
      eyebrow="Atlas Revenue Operations"
      title="Cash Ledger"
    >
      <CashLedgerSurface
        operations={operations}
        organizationNames={organizationNames}
      />
    </SurfaceShell>
  );
}
