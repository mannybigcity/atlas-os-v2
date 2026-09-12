import {
  PREFERRED_CONTACTS,
  clientProfileFieldLabels,
  clientProfileSummary,
  preferredContactLabel,
  readClientProfile,
} from "@/lib/lions-den/client-profile";
import { saveClientProfile } from "@/server/opportunities/client-profile-actions";

type ClientProfileFormProps = {
  organizationId: string;
  recordId: string;
  recordTable: "opportunity" | "sis_customer";
  metadata: unknown;
  returnPath: string;
  previewOrgSlug?: string;
  workspaceSlug?: string;
  spanish: boolean;
};

/** The extra fields every prospect and client record carries. Same form for both record tables. */
export function ClientProfileForm({
  organizationId,
  recordId,
  recordTable,
  metadata,
  returnPath,
  previewOrgSlug,
  workspaceSlug,
  spanish,
}: ClientProfileFormProps) {
  const profile = readClientProfile(metadata);
  const labels = clientProfileFieldLabels(spanish);
  const summary = clientProfileSummary(profile, spanish);
  const fieldClass = "mt-1 block w-full rounded-md border border-[#d5d0c4] bg-white px-3 py-2 text-sm text-[#071b42]";

  return (
    <section className="mt-4 rounded-2xl border border-[#ece7d8] bg-white p-4" data-client-profile>
      <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#5c6578]">
        {spanish ? "Datos del cliente" : "Client details"}
      </p>
      {summary.length > 0 ? (
        <dl className="mt-2 grid gap-x-4 gap-y-1 text-sm sm:grid-cols-2" data-client-profile-summary>
          {summary.map((line) => (
            <div key={line.label}>
              <dt className="text-[11px] font-semibold text-[#5c6578]">{line.label}</dt>
              <dd className="text-[#071b42]">{line.value}</dd>
            </div>
          ))}
        </dl>
      ) : (
        <p className="mt-1 text-xs text-[#5c6578]">
          {spanish
            ? "Guarda lo que necesitas saber antes de llamar: dirección, cómo prefieren que les contacten, qué hacemos para ellos."
            : "Keep what you need before you call: address, how they like to be reached, what you do for them."}
        </p>
      )}

      <details className="mt-3">
        <summary className="cursor-pointer text-xs font-semibold text-[#071b42]">
          {summary.length > 0 ? (spanish ? "Editar datos" : "Edit details") : spanish ? "Agregar datos" : "Add details"}
        </summary>
        <form action={saveClientProfile} className="mt-3 grid gap-3 sm:grid-cols-2">
          <input name="organizationId" type="hidden" value={organizationId} />
          <input name="recordId" type="hidden" value={recordId} />
          <input name="recordTable" type="hidden" value={recordTable} />
          <input name="returnPath" type="hidden" value={returnPath} />
          {recordTable === "opportunity" && returnPath.startsWith("/client/clients/") ? (
            <input name="clientRecord" type="hidden" value="1" />
          ) : null}
          {previewOrgSlug ? <input name="previewOrg" type="hidden" value={previewOrgSlug} /> : null}
          {workspaceSlug ? <input name="workspace" type="hidden" value={workspaceSlug} /> : null}
          <label className="block text-xs font-semibold text-[#5c6578] sm:col-span-2">
            {labels.service}
            <input className={fieldClass} defaultValue={profile.service} name="service" type="text" />
          </label>
          <label className="block text-xs font-semibold text-[#5c6578]">
            {labels.preferredContact}
            <select className={fieldClass} defaultValue={profile.preferredContact} name="preferredContact">
              <option value="">{preferredContactLabel("", spanish)}</option>
              {PREFERRED_CONTACTS.map((value) => (
                <option key={value} value={value}>
                  {preferredContactLabel(value, spanish)}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-xs font-semibold text-[#5c6578]">
            {labels.bestTime}
            <input className={fieldClass} defaultValue={profile.bestTime} name="bestTime" type="text" />
          </label>
          <label className="block text-xs font-semibold text-[#5c6578] sm:col-span-2">
            {labels.address}
            <input className={fieldClass} defaultValue={profile.address} name="address" type="text" />
          </label>
          <label className="block text-xs font-semibold text-[#5c6578]">
            {labels.referredBy}
            <input className={fieldClass} defaultValue={profile.referredBy} name="referredBy" type="text" />
          </label>
          <label className="block text-xs font-semibold text-[#5c6578]">
            {labels.tags}
            <input className={fieldClass} defaultValue={profile.tags} name="tags" type="text" />
          </label>
          <button
            className="w-fit rounded-full bg-[#1246a0] px-4 py-2 text-sm font-semibold !text-white"
            type="submit"
          >
            {spanish ? "Guardar datos" : "Save details"}
          </button>
        </form>
      </details>
    </section>
  );
}
