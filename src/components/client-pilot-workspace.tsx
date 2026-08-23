import { ClientAiConsole } from "@/components/client-ai-console";
import { formatDateTime } from "@/lib/format";
import type { ClientAiDailyUsage, ClientAiRequest } from "@/server/client-ai/queries";
import type { PilotWorkspace } from "@/server/pilot/queries";
import { getSiteLanguage } from "@/lib/site-language-server";

type ClientPilotWorkspaceProps = {
  organizationId: string;
  aiRequests: ClientAiRequest[];
  aiUsage: ClientAiDailyUsage;
  workspace: PilotWorkspace;
};

function label(value: string, spanish: boolean) {
  if (!spanish) return value.replaceAll("_", " ");
  const labels: Record<string, string> = {
    approved: "aprobado",
    changes_requested: "cambios solicitados",
    completed: "completado",
    in_progress: "en progreso",
    not_started: "sin iniciar",
    ready_for_review: "listo para revisión",
  };
  return labels[value] ?? value.replaceAll("_", " ");
}

function isLegacyFollowUpText(value: string | null | undefined) {
  return /pilot|test|review workflow|draft deliverable/i.test(String(value ?? ""));
}

function workMessageTitle(
  messageKind: "work_sent" | "approved" | "changes_requested",
  authorDisplayName: string,
  spanish: boolean,
) {
  if (messageKind === "work_sent") {
    return spanish ? `${authorDisplayName} envió una actualización` : `${authorDisplayName} sent an update`;
  }

  return messageKind === "approved"
    ? spanish ? `Aprobado por ${authorDisplayName}` : `Approved by ${authorDisplayName}`
    : spanish ? `Cambios solicitados por ${authorDisplayName}` : `Changes requested by ${authorDisplayName}`;
}

export async function ClientPilotWorkspace({
  organizationId,
  aiRequests,
  aiUsage,
  workspace,
}: ClientPilotWorkspaceProps) {
  const language = await getSiteLanguage();
  const spanish = language === "es";
  const nextCheckIn = workspace.plan?.nextCheckInAt
    ? formatDateTime(workspace.plan.nextCheckInAt)
    : spanish ? "Aún no programado" : "Not scheduled yet";
  const followUpActions = workspace.actions.filter(
    (action) => !isLegacyFollowUpText(action.title) && !isLegacyFollowUpText(action.description),
  );
  const visibleDeliverables = workspace.deliverables.filter(
    (deliverable) =>
      !isLegacyFollowUpText(deliverable.title) &&
      !isLegacyFollowUpText(deliverable.summary) &&
      !isLegacyFollowUpText(deliverable.body),
  );
  const followUpCount = followUpActions.length;
  const noteCount = visibleDeliverables.reduce(
    (total, deliverable) => total + deliverable.messages.length,
    0,
  );

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-blue-700">
            {spanish ? "Centro de Seguimiento" : "Follow-up Desk"}
          </p>
          <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-950">
            {spanish ? "Trabajo y mensajes" : <>Work &amp; Messages</>}
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            {spanish
              ? "Notas de seguimiento, próximas revisiones y mensajes comerciales vinculados al CRM, sin el desorden de las revisiones."
              : "Follow-up notes, next check-ins, and business messages tied to the CRM, without the review clutter."}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="w-fit rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-blue-700">
            {label(workspace.plan?.status ?? "not_started", spanish)}
          </span>
          <span className="w-fit rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-slate-700">
            {followUpCount} {spanish ? "seguimientos" : "follow-ups"}
          </span>
          <span className="w-fit rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-slate-700">
            {noteCount} {spanish ? "notas" : "notes"}
          </span>
        </div>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
            {spanish ? "Notas de seguimiento" : "Follow-up notes"}
          </p>
          <div className="mt-3 space-y-3">
            {followUpActions.slice(0, 3).map((action) => (
              <article className="rounded-2xl border border-slate-200 bg-white p-4" key={action.id}>
                <p className="text-sm font-semibold text-slate-950">{action.title}</p>
                <p className="mt-1 text-sm leading-6 text-slate-600">
                  {action.description ?? (spanish ? "Todavía no se ha agregado una nota." : "No note added yet.")}
                </p>
                <p className="mt-2 text-xs font-medium text-slate-500">
                  {action.ownerLabel ? `${spanish ? "Responsable" : "Owner"}: ${action.ownerLabel}` : spanish ? "Sin responsable" : "No owner"}
                  {action.dueDate ? ` · ${spanish ? "Fecha límite" : "Due"} ${action.dueDate}` : ""}
                </p>
              </article>
            ))}
            {followUpActions.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-slate-300 bg-white p-4 text-sm leading-6 text-slate-600">
                {spanish ? "Todavía no se han agregado notas de seguimiento." : "No follow-up notes have been added yet."}
              </p>
            ) : null}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
            {spanish ? "Próxima revisión" : "Next check-in"}
          </p>
          <p className="mt-3 text-lg font-semibold text-slate-950">{nextCheckIn}</p>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            {spanish
              ? "Usa esto como recordatorio para la próxima revisión o conversación de seguimiento."
              : "Use this as the reminder for the next review, check-in, or follow-up conversation."}
          </p>
        </div>
      </div>

      <div className="mt-6">
        <h3 className="text-lg font-semibold text-slate-950">{spanish ? "Prospectos por contactar" : "Prospects to contact"}</h3>
        {followUpActions.length === 0 ? (
          <p className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-600">
            {spanish ? "Todavía no se ha publicado trabajo de seguimiento." : "No follow-up work has been published yet."}
          </p>
        ) : (
          <div className="mt-3 grid gap-3 md:grid-cols-3">
            {followUpActions.map((action) => (
              <article
                className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                key={action.id}
              >
                <div className="flex items-start justify-between gap-3">
                  <span className="text-xs font-semibold uppercase tracking-[0.12em] text-blue-700">
                    {spanish ? "Seguimiento" : "Follow-up"}
                  </span>
                  <span className="rounded-full bg-white px-2 py-1 text-xs font-semibold uppercase tracking-[0.1em] text-slate-500 ring-1 ring-slate-200">
                    {label(action.status, spanish)}
                  </span>
                </div>
                <h4 className="mt-3 font-semibold text-slate-950">{action.title}</h4>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  {action.description ?? (spanish ? "No se proporcionó una nota de seguimiento." : "No follow-up note provided.")}
                </p>
                <p className="mt-3 text-xs leading-5 text-slate-500">
                  {action.ownerLabel ? `${spanish ? "Responsable" : "Owner"}: ${action.ownerLabel}` : spanish ? "Sin responsable" : "No owner"}
                  {action.dueDate ? ` · ${spanish ? "Revisión" : "Check-in"} ${action.dueDate}` : ""}
                </p>
              </article>
            ))}
          </div>
        )}
      </div>

      <div className="mt-6">
        <h3 className="text-lg font-semibold text-slate-950">{spanish ? "Mensajes" : "Messages"}</h3>
        {visibleDeliverables.length === 0 ? (
          <p className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-600">
            {spanish ? "Todavía no se han registrado mensajes." : "No messages have been logged yet."}
          </p>
        ) : (
          <div className="mt-3 space-y-4">
            {visibleDeliverables.map((deliverable) => (
              <article
                className="rounded-2xl border border-slate-200 bg-slate-50 p-5"
                key={deliverable.id}
              >
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h4 className="font-semibold text-slate-950">{deliverable.title}</h4>
                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      {deliverable.summary ?? (spanish ? "No se proporcionó un resumen." : "No summary provided.")}
                    </p>
                  </div>
                  <span className="w-fit rounded-full bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500 ring-1 ring-slate-200">
                    {label(deliverable.status, spanish)}
                  </span>
                </div>

                {deliverable.body ? (
                  <div className="mt-4 whitespace-pre-wrap rounded-2xl border border-slate-200 bg-white p-4 text-sm leading-6 text-slate-700">
                    {deliverable.body}
                  </div>
                ) : null}

                {deliverable.review ? (
                  <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-950">
                    <p className="font-semibold">{spanish ? "Nota de revisión" : "Review note"}</p>
                    <p className="mt-1">
                      {deliverable.review.note ?? (spanish ? "No se proporcionó una nota de revisión." : "No review note provided.")}
                    </p>
                  </div>
                ) : null}

                {deliverable.messages.length > 0 ? (
                  <div className="mt-4 space-y-3" aria-label={spanish ? "Historial de mensajes de trabajo" : "Work message history"}>
                    {deliverable.messages.map((message) => (
                      <div
                        className={`rounded-2xl border p-4 text-sm leading-6 ${
                          message.authorKind === "atlas_admin"
                            ? "border-slate-200 bg-white text-slate-800"
                            : "border-blue-200 bg-blue-50 text-blue-950"
                        }`}
                        key={message.id}
                      >
                        <p className="font-semibold">
                          {workMessageTitle(
                            message.messageKind,
                            message.authorDisplayName,
                            spanish,
                          )}
                        </p>
                        {message.message ? <p className="mt-1">{message.message}</p> : null}
                        <p
                          className={`mt-1 text-xs ${
                            message.authorKind === "atlas_admin"
                              ? "text-slate-500"
                              : "text-blue-700"
                          }`}
                        >
                          {formatDateTime(message.createdAt)}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : null}
              </article>
            ))}
          </div>
        )}
      </div>

      <div className="mt-6">
        <ClientAiConsole
          businessOnly
          defaultRole="david"
          fixedRole="david"
          organizationId={organizationId}
          previewMode={false}
          requests={aiRequests}
          dailyUsage={aiUsage}
          title={spanish ? "IA empresarial" : "Business AI"}
          description={spanish
            ? "Pide ayuda con el seguimiento, mensajes a clientes u orientación sobre el CRM."
            : "Ask for follow-up help, customer messaging, or CRM guidance."}
        />
      </div>
    </section>
  );
}
