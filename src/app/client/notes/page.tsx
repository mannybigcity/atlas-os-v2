import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { LionsDenBoardScreen } from "@/components/lions-den/lions-den-board-screen";
import { LionsDenNotesBoard } from "@/components/lions-den/lions-den-notes";
import { isQTimeWorkspaceSlug, isSisOrganization } from "@/lib/client-portal/identity";
import { lionsDenHref } from "@/lib/lions-den/client-hub";
import { presentLiveDeskNote } from "@/lib/lions-den/live-desk";
import { noteRecordOptions, parseNoteRecord } from "@/lib/lions-den/note-links";
import { getClientWorkspaceContext } from "@/server/client-workspace/context";
import { getOrganizationNotes } from "@/server/notes/queries";
import { getOpportunityPipeline } from "@/server/opportunities/queries";
import { getSisCustomers } from "@/server/sis-workspace/queries";
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
    record?: string;
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
  const filterRecord = parseNoteRecord(params?.record);

  const [notes, pipeline, sisCustomers] = organization
    ? await Promise.all([
        getOrganizationNotes(organization.id, { recordId: filterRecord?.id ?? null }),
        isSisOrganization(organization) ? null : getOpportunityPipeline(organization.id),
        isSisOrganization(organization) ? getSisCustomers(organization.id) : null,
      ])
    : [null, null, null];

  const records = organization
    ? noteRecordOptions(
        {
          opportunities: pipeline && !pipeline.setupRequired ? pipeline.data.opportunities : [],
          sisCustomers: sisCustomers && !sisCustomers.setupRequired ? sisCustomers.data : [],
        },
        spanish,
      )
    : undefined;

  return (
    <LionsDenBoardScreen board="notes" workspace={workspace}>
      {params?.note === "created" || params?.note === "linked" ? (
        <div className="mb-5 rounded-2xl border border-[#d8c27a] bg-[#fff8e6] p-4 text-sm text-[#071b42]">
          {params.note === "linked"
            ? spanish
              ? "Nota guardada y ligada a la ficha. También aparece ahí."
              : "Note saved and pinned to the record. It shows there too."
            : spanish
              ? "Nota guardada."
              : "Note saved."}
        </div>
      ) : null}
      {params?.note === "error" ? (
        <div className="mb-5 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900">
          {spanish ? "No se pudo guardar la nota." : "The note could not be saved."}
        </div>
      ) : null}
      {organization ? (
        <LionsDenNotesBoard
          allNotesHref={lionsDenHref(
            "/client/notes",
            workspace.previewOrgSlug || undefined,
            workspace.selectedWorkspaceSlug || undefined,
          )}
          canCreate={workspace.canCreateNotes}
          filterRecord={filterRecord}
          notes={(notes && !notes.setupRequired ? notes.data : []).map((item) =>
            presentLiveDeskNote(organization, item),
          )}
          organizationId={organization.id}
          records={records}
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
