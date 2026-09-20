import {
  CRM_FILE_ACCEPT,
  CRM_FILE_LABELS,
  crmFileLabelCopy,
  formatCrmFileBytes,
  type CrmFileRecordTable,
} from "@/lib/lions-den/crm-record-files";
import { deleteCrmRecordFile, downloadCrmRecordFile, uploadCrmRecordFile } from "@/server/crm-files/actions";
import { getCrmRecordFiles } from "@/server/crm-files/queries";

type CrmRecordFilesProps = {
  organizationId: string;
  recordId: string;
  recordTable: CrmFileRecordTable;
  returnPath: string;
  previewOrgSlug?: string;
  workspaceSlug?: string;
  spanish: boolean;
  canWrite?: boolean;
};

function ScopeFields({
  organizationId,
  recordId,
  recordTable,
  returnPath,
  previewOrgSlug,
  workspaceSlug,
}: Omit<CrmRecordFilesProps, "spanish" | "canWrite">) {
  return (
    <>
      <input name="organizationId" type="hidden" value={organizationId} />
      <input name="recordId" type="hidden" value={recordId} />
      <input name="recordTable" type="hidden" value={recordTable} />
      <input name="returnPath" type="hidden" value={returnPath} />
      {returnPath.startsWith("/client/clients/") ? <input name="clientRecord" type="hidden" value="1" /> : null}
      {previewOrgSlug ? <input name="previewOrg" type="hidden" value={previewOrgSlug} /> : null}
      {workspaceSlug ? <input name="workspace" type="hidden" value={workspaceSlug} /> : null}
    </>
  );
}

/**
 * Files strip on a prospect or client card. Storage only — Atlas never emails these.
 */
export async function CrmRecordFiles({
  organizationId,
  recordId,
  recordTable,
  returnPath,
  previewOrgSlug,
  workspaceSlug,
  spanish,
  canWrite = true,
}: CrmRecordFilesProps) {
  const result = await getCrmRecordFiles(organizationId, recordTable, recordId);
  const files = result.setupRequired ? [] : result.data;
  const fieldClass = "mt-1 block w-full rounded-md border border-[#d5d0c4] bg-white px-3 py-2 text-sm text-[#071b42]";
  const scope = {
    organizationId,
    recordId,
    recordTable,
    returnPath,
    previewOrgSlug,
    workspaceSlug,
  };

  return (
    <section className="mt-4 rounded-2xl border border-[#ece7d8] bg-white p-4" data-crm-files>
      <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#5c6578]">
        {spanish ? "Archivos" : "Files"}
      </p>
      <p className="mt-1 text-xs text-[#5c6578]">
        {spanish
          ? "Factura, contrato, PDF o foto en esta ficha. Atlas no los envía por correo."
          : "Invoice, contract, PDF, or photo on this card. Atlas does not email them."}
      </p>

      {files.length === 0 ? (
        <p className="mt-3 text-sm text-[#5c6578]" data-crm-files-empty>
          {spanish ? "Aún no hay archivos." : "No files yet."}
        </p>
      ) : (
        <ul className="mt-3 space-y-2">
          {files.map((file) => (
            <li
              className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[#ece7d8] p-3"
              data-crm-file
              key={file.id}
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-[#071b42]">{file.fileName}</p>
                <p className="text-[11px] text-[#5c6578]">
                  {crmFileLabelCopy(file.label, spanish)}
                  {" · "}
                  {file.createdAt.slice(0, 10)}
                  {" · "}
                  {formatCrmFileBytes(file.byteSize)}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <form action={downloadCrmRecordFile}>
                  <ScopeFields {...scope} />
                  <input name="fileId" type="hidden" value={file.id} />
                  <button className="text-xs font-semibold text-[#1246a0] underline" type="submit">
                    {spanish ? "Abrir" : "Open"}
                  </button>
                </form>
                {canWrite ? (
                  <details className="text-xs" data-crm-file-delete>
                    <summary className="cursor-pointer font-semibold text-rose-800">
                      {spanish ? "Eliminar" : "Delete"}
                    </summary>
                    <form action={deleteCrmRecordFile} className="mt-2">
                      <ScopeFields {...scope} />
                      <input name="fileId" type="hidden" value={file.id} />
                      <button
                        className="rounded-full bg-rose-700 px-3 py-1 text-xs font-semibold text-white"
                        type="submit"
                      >
                        {spanish ? "Sí, eliminar" : "Yes, delete"}
                      </button>
                    </form>
                  </details>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}

      {canWrite ? (
        <form action={uploadCrmRecordFile} className="mt-4 grid gap-3 sm:grid-cols-2" data-crm-file-upload>
          <ScopeFields {...scope} />
          <label className="block text-xs font-semibold text-[#5c6578]">
            {spanish ? "Tipo" : "Type"}
            <select className={fieldClass} defaultValue="other" name="label">
              {CRM_FILE_LABELS.map((value) => (
                <option key={value} value={value}>
                  {crmFileLabelCopy(value, spanish)}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-xs font-semibold text-[#5c6578]">
            <span className="inline-flex items-center gap-1.5">
              <PaperclipIcon />
              {spanish ? "Subir archivo" : "Upload file"}
            </span>
            <input
              accept={CRM_FILE_ACCEPT}
              className={`${fieldClass} cursor-pointer`}
              name="file"
              required
              type="file"
            />
          </label>
          <button
            className="w-fit rounded-full bg-[#1246a0] px-4 py-2 text-sm font-semibold !text-white"
            type="submit"
          >
            {spanish ? "Subir" : "Upload"}
          </button>
          <p className="self-center text-[11px] text-[#5c6578] sm:col-span-1">
            PDF, PNG, JPG, WEBP, DOC, DOCX · 10 MB
          </p>
        </form>
      ) : null}
    </section>
  );
}

function PaperclipIcon() {
  return (
    <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 24 24">
      <path
        d="M21.44 11.05 12.25 20.24a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.82-2.83l8.49-8.48"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}
