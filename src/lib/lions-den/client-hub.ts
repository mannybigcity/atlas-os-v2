import {
  isAfeCrmDemoOrganization,
  isAfeOperatorDeskOrganization,
  isQTimeWorkspaceSlug,
  isSisOrganization,
} from "../client-portal/identity.ts";

export type LionsDenBoard =
  | "overview"
  | "prospects"
  | "clients"
  | "follow-up"
  | "calendar"
  | "notes"
  | "hunter"
  | "micah"
  | "trial-inbox";

export const LIONS_DEN_NAVY = "#071b42";
export const LIONS_DEN_GOLD = "#f5b932";

export const lionsDenBoards: Array<{
  id: LionsDenBoard;
  href: string;
  label: string;
  labelEs: string;
}> = [
  { id: "overview", href: "/client", label: "Summary", labelEs: "Resumen" },
  { id: "prospects", href: "/client/prospects", label: "Prospects", labelEs: "Prospectos" },
  { id: "clients", href: "/client/clients", label: "Clients", labelEs: "Clientes" },
  { id: "follow-up", href: "/client/david", label: "Follow-up", labelEs: "Seguimiento" },
  { id: "calendar", href: "/client/calendar", label: "Calendar", labelEs: "Calendario" },
  { id: "notes", href: "/client/notes", label: "Notes", labelEs: "Notas" },
  { id: "hunter", href: "/client/hunter", label: "HUNTER", labelEs: "HUNTER" },
  { id: "micah", href: "/client/micah", label: "MICAH", labelEs: "MICAH" },
];

export const lionsDenOperatorBoards: Array<{
  id: Extract<LionsDenBoard, "trial-inbox">;
  href: string;
  label: string;
  labelEs: string;
}> = [
  { id: "trial-inbox", href: "/client/trial-inbox", label: "7 Day Trial", labelEs: "Prueba 7 días" },
];

export function visibleLionsDenBoards(
  organization?: { name?: string | null; slug?: string | null } | null,
) {
  if (isQTimeWorkspaceSlug(organization?.slug)) {
    return lionsDenBoards.filter((board) => board.id !== "clients");
  }
  return lionsDenBoards;
}

export function usesLionsDenHub(
  slugOrOrganization?: string | { name?: string | null; slug?: string | null } | null,
) {
  if (!slugOrOrganization) return false;
  if (typeof slugOrOrganization === "string") {
    return !isQTimeWorkspaceSlug(slugOrOrganization);
  }
  if (isQTimeWorkspaceSlug(slugOrOrganization.slug)) return false;
  return (
    Boolean(slugOrOrganization.slug) ||
    isSisOrganization(slugOrOrganization) ||
    isAfeCrmDemoOrganization(slugOrOrganization) ||
    isAfeOperatorDeskOrganization(slugOrOrganization)
  );
}

export function clientOverviewRendersLionsDen(
  organization?: string | { name?: string | null; slug?: string | null } | null,
  options?: { showSuperAdminCrm?: boolean },
) {
  if (options?.showSuperAdminCrm) return false;
  const slug = typeof organization === "string" ? organization : organization?.slug;
  return !isQTimeWorkspaceSlug(slug);
}

export function lionsDenHref(path: string, previewOrgSlug?: string, workspaceSlug?: string) {
  const params = new URLSearchParams();
  if (previewOrgSlug && !isAfeCrmDemoOrganization({ slug: previewOrgSlug })) {
    params.set("previewOrg", previewOrgSlug);
  }
  if (workspaceSlug && !isAfeCrmDemoOrganization({ slug: workspaceSlug })) {
    params.set("workspace", workspaceSlug);
  }
  const query = params.toString();
  return query ? `${path}?${query}` : path;
}
