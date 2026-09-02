import {
  isAfeCrmDemoOrganization,
  isQTimeWorkspaceSlug,
  isSisOrganization,
} from "../client-portal/identity.ts";

export type LionsDenBoard =
  | "overview"
  | "prospects"
  | "follow-up"
  | "calendar"
  | "notes"
  | "hunter"
  | "micah";

export const LIONS_DEN_NAVY = "#071b42";
export const LIONS_DEN_GOLD = "#f5b932";

export const lionsDenBoards: Array<{
  id: LionsDenBoard;
  href: string;
  label: string;
  labelEs: string;
}> = [
  { id: "overview", href: "/client", label: "Overview", labelEs: "Resumen" },
  { id: "prospects", href: "/client/prospects", label: "Prospects", labelEs: "Prospectos" },
  { id: "follow-up", href: "/client/david", label: "Follow-up", labelEs: "Seguimiento" },
  { id: "calendar", href: "/client/calendar", label: "Calendar", labelEs: "Calendario" },
  { id: "notes", href: "/client/notes", label: "Notes", labelEs: "Notas" },
  { id: "hunter", href: "/client/hunter", label: "HUNTER", labelEs: "HUNTER" },
  { id: "micah", href: "/client/micah", label: "MICAH", labelEs: "MICAH" },
];

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
    isAfeCrmDemoOrganization(slugOrOrganization)
  );
}

export function lionsDenHref(path: string, previewOrgSlug?: string, workspaceSlug?: string) {
  const params = new URLSearchParams();
  if (previewOrgSlug) params.set("previewOrg", previewOrgSlug);
  if (workspaceSlug) params.set("workspace", workspaceSlug);
  const query = params.toString();
  return query ? `${path}?${query}` : path;
}
