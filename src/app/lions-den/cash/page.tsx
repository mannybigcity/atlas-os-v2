import type { Metadata } from "next";
import { CashLedgerSurface } from "@/components/operations-surface";
import { SurfaceShell } from "@/components/surface-shell";
import { getSiteLanguage } from "@/lib/site-language-server";
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
      description={language === "es" ? "Un registro de pagos y efectivo de solo lectura. Solo las entradas verificadas, liquidadas o reembolsadas cuentan en los totales verificados." : "A read-only payment and cash ledger. Only verified settled or refunded entries count toward verified totals."}
      eyebrow={language === "es" ? "Operaciones de ingresos de Atlas" : "Atlas Revenue Operations"}
      title={language === "es" ? "Registro de efectivo" : "Cash Ledger"}
    >
      <CashLedgerSurface
        language={language}
        operations={operations}
        organizationNames={organizationNames}
      />
    </SurfaceShell>
  );
}
