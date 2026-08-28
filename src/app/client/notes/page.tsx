import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { LionsDenBoardScreen } from "@/components/lions-den/lions-den-board-screen";
import { LionsDenNotesBoard } from "@/components/lions-den/lions-den-notes";
import { isQTimeWorkspaceSlug } from "@/lib/client-portal/identity";
import { getClientWorkspaceContext } from "@/server/client-workspace/context";
import { getOrganizationNotes } from "@/server/notes/queries";
import { getSiteLanguage } from "@/lib/site-language-server";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Notes | The Lion’s Den",
    robots: { index: false, follow: false },
  };
}

type NotesPageProps = {
  searchParams?: Promise<{
    lang?: string;
    note?: string;
    previewOrg?: string;
    workspace?: string;
  }>;
};

export default async function NotesPage({ searchParams }: NotesPageProps) {
  const params = await searchParams;
  const language = await getSiteLanguage(params?.lang);
  const spanish = language === "es";
  const workspace = await getClientWorkspaceContext("/client/notes", params);
  if (isQTimeWorkspaceSlug(workspace.primaryOrganization?.slug)) {
    redirect("/client");
  }
  const organization = workspace.primaryOrganization;
  const notes = organization ? await getOrganizationNotes(organization.id) : null;

  return (
    <LionsDenBoardScreen board="notes" workspace={workspace}>
      {params?.note === "created" ? (
        <div className="mb-5 rounded-2xl border border-[#d8c27a] bg-[#fff8e6] p-4 text-sm text-[#071b42]">
          {spanish ? "Nota guardada." : "Note saved."}
        </div>
      ) : null}
      {params?.note === "error" ? (
        <div className="mb-5 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900">
          {spanish ? "No se pudo guardar la nota." : "The note could not be saved."}
        </div>
      ) : null}
      {organization ? (
        <LionsDenNotesBoard
          canCreate={workspace.canCreateNotes}
          notes={notes && !notes.setupRequired ? notes.data : []}
          organizationId={organization.id}
          spanish={spanish}
        />
      ) : (
        <p className="rounded-[1.6rem] border border-dashed border-[#d8c27a] bg-[#fff8e6] p-5 text-sm leading-6 text-[#071b42]">
          {spanish
            ? "Todavía no hay un espacio de trabajo asignado."
            : "No organization workspace is assigned to this account yet."}
        </p>
      )}
    </LionsDenBoardScreen>
  );
}
