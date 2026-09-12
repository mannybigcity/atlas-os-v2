import type { OrganizationOpportunity } from "@/server/opportunities/queries";
import {
  prospectContactLinks,
  prospectNoticeCopy,
  prospectStageActions,
  readJobValue,
} from "@/lib/lions-den/prospect-stages";
import { DeskEmailCompose } from "@/components/lions-den/desk-email-compose";
import {
  createProspect,
  deleteProspect,
  setProspectStage,
  updateProspect,
} from "@/server/opportunities/prospect-actions";

type Scope = {
  organizationId: string;
  previewOrgSlug?: string;
  workspaceSlug?: string;
};

function ScopeFields({ organizationId, previewOrgSlug, workspaceSlug }: Scope) {
  return (
    <>
      <input name="organizationId" type="hidden" value={organizationId} />
      {previewOrgSlug ? <input name="previewOrg" type="hidden" value={previewOrgSlug} /> : null}
      {workspaceSlug ? <input name="workspace" type="hidden" value={workspaceSlug} /> : null}
    </>
  );
}

export function ProspectNotice({ status, spanish }: { status?: string; spanish: boolean }) {
  const copy = prospectNoticeCopy(status, spanish);
  if (!copy) return null;
  const tone = status === "invalid" || status === "failed" || status === "missing";
  return (
    <p
      className={`mt-4 rounded-xl border px-3 py-2 text-sm font-semibold ${
        tone ? "border-rose-200 bg-rose-50 text-rose-900" : "border-[#d8c27a] bg-[#fff8e6] text-[#071b42]"
      }`}
      role="status"
    >
      {copy}
    </p>
  );
}

/**
 * Call / Text stay on the owner's phone. Email opens an Atlas compose box
 * next to Text so the owner can write and keep the follow-up.
 */
export function ProspectContactActions({
  prospect,
  spanish,
  compact = false,
  compose,
}: {
  prospect: Pick<OrganizationOpportunity, "name" | "contactPhone" | "contactEmail" | "metadata" | "contactSocial">;
  spanish: boolean;
  compact?: boolean;
  compose?: {
    fromEmail: string;
    organizationId: string;
    opportunityId?: string;
    customerId?: string;
    previewOrgSlug?: string;
    workspaceSlug?: string;
    returnTo?: string;
    detailHref?: string;
    initialOpen?: boolean;
  };
}) {
  const links = prospectContactLinks(prospect);
  const website =
    (typeof prospect.metadata?.website_url === "string" ? prospect.metadata.website_url : null) ||
    prospect.contactSocial;
  const base = compact
    ? "inline-flex cursor-pointer items-center rounded-full bg-[#1246a0] px-3 py-1 text-xs font-semibold !text-white transition hover:bg-[#0a2f78] hover:!text-white"
    : "inline-flex cursor-pointer items-center rounded-full bg-[#1246a0] px-4 py-2 text-sm font-semibold !text-white transition hover:bg-[#0a2f78] hover:!text-white";
  return (
    <div className="flex flex-wrap items-start gap-2" data-prospect-contact>
      {links.tel ? (
        <a className={base} href={links.tel}>
          {spanish ? "Llamar" : "Call"}
          {compact ? null : <span className="ml-2 font-normal text-white/80">{links.phone}</span>}
        </a>
      ) : null}
      {links.sms ? (
        <a className={base} href={links.sms}>
          {spanish ? "Mensaje" : "Text"}
        </a>
      ) : null}
      {compose ? (
        <DeskEmailCompose
          compact={compact}
          customerId={compose.customerId}
          fromEmail={compose.fromEmail}
          opportunityId={compose.opportunityId}
          organizationId={compose.organizationId}
          previewOrgSlug={compose.previewOrgSlug}
          prospectName={prospect.name}
          returnTo={compose.returnTo}
          spanish={spanish}
          toEmail={prospect.contactEmail}
          website={website}
          workspaceSlug={compose.workspaceSlug}
          detailHref={compose.detailHref}
          initialOpen={compose.initialOpen}
        />
      ) : links.mailto ? (
        <a className={base} href={links.mailto}>
          {spanish ? "Correo" : "Email"}
        </a>
      ) : (
        <span className={`${base} cursor-default opacity-70`}>
          {spanish ? "Correo" : "Email"}
        </span>
      )}
    </div>
  );
}

export function ProspectStageButtons({
  prospect,
  spanish,
  returnTo = "detail",
  ...scope
}: Scope & {
  prospect: Pick<OrganizationOpportunity, "id" | "stage" | "metadata">;
  spanish: boolean;
  returnTo?: "detail" | "list";
}) {
  const actions = prospectStageActions(prospect.stage, spanish);
  const jobValue = readJobValue(prospect.metadata);
  return (
    <div className="space-y-3" data-prospect-stages>
      <div className="flex flex-wrap gap-2">
        {actions
          .filter((action) => action.stage !== "won")
          .map((action) => (
            <form action={setProspectStage} key={action.stage}>
              <ScopeFields {...scope} />
              <input name="opportunityId" type="hidden" value={prospect.id} />
              <input name="stage" type="hidden" value={action.stage} />
              <input name="returnTo" type="hidden" value={returnTo} />
              <button
                className="rounded-full border border-[#d5d0c4] bg-white px-4 py-2 text-sm font-semibold text-[#071b42] transition hover:border-[#071b42]"
                type="submit"
              >
                {action.label}
              </button>
            </form>
          ))}
      </div>
      {actions.some((action) => action.stage === "won") ? (
        <form action={setProspectStage} className="flex flex-wrap items-end gap-2 rounded-2xl border border-[#d8c27a] bg-[#fff8e6] p-3">
          <ScopeFields {...scope} />
          <input name="opportunityId" type="hidden" value={prospect.id} />
          <input name="stage" type="hidden" value="won" />
          <input name="returnTo" type="hidden" value={returnTo} />
          <label className="block text-xs font-semibold text-[#5c4a12]">
            {spanish ? "Valor del trabajo (opcional)" : "Job value (optional)"}
            <input
              className="mt-1 block w-40 rounded-md border border-[#d8c27a] bg-white px-3 py-2 text-sm text-[#071b42]"
              inputMode="decimal"
              name="jobValue"
              placeholder="$1,200"
              type="text"
            />
          </label>
          <button
            className="rounded-full bg-[#f5b932] px-4 py-2 text-sm font-semibold text-[#071b42] transition hover:bg-[#ffd266]"
            type="submit"
          >
            {spanish ? "Ganado · convertir en cliente" : "Won · make them a client"}
          </button>
        </form>
      ) : jobValue != null ? (
        <p className="text-sm text-[#5c6578]">
          {spanish ? "Valor del trabajo: " : "Job value: "}
          <span className="font-semibold text-[#071b42]">
            {new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(jobValue)}
          </span>
        </p>
      ) : null}
    </div>
  );
}

const fieldClass =
  "mt-1 block w-full rounded-md border border-[#d5d0c4] bg-white px-3 py-2 text-sm text-[#071b42] placeholder:text-[#8a93a3] focus:border-[#071b42] focus:outline-none";

export function ProspectEditorForm({
  prospect,
  spanish,
  ...scope
}: Scope & {
  prospect?: OrganizationOpportunity;
  spanish: boolean;
}) {
  const editing = Boolean(prospect);
  const metadata = prospect?.metadata ?? {};
  const address = typeof metadata.formatted_address === "string" ? metadata.formatted_address : "";
  const website = typeof metadata.website_url === "string" ? metadata.website_url : prospect?.contactSocial ?? "";
  const notes = typeof metadata.owner_notes === "string" ? metadata.owner_notes : "";
  const label = (en: string, es: string) => (spanish ? es : en);

  return (
    <form action={editing ? updateProspect : createProspect} className="grid gap-3 sm:grid-cols-2" data-prospect-editor={editing ? "edit" : "create"}>
      <ScopeFields {...scope} />
      {prospect ? <input name="opportunityId" type="hidden" value={prospect.id} /> : null}
      <label className="block text-xs font-semibold text-[#5c6578] sm:col-span-2">
        {label("Business name", "Nombre del negocio")} *
        <input className={fieldClass} defaultValue={prospect?.name ?? ""} maxLength={220} minLength={2} name="name" required type="text" />
      </label>
      <label className="block text-xs font-semibold text-[#5c6578]">
        {label("Contact person", "Persona de contacto")}
        <input className={fieldClass} defaultValue={prospect?.contactName ?? ""} maxLength={180} name="contactName" type="text" />
      </label>
      <label className="block text-xs font-semibold text-[#5c6578]">
        {label("Phone", "Teléfono")}
        <input
          className={fieldClass}
          defaultValue={prospect?.contactPhone ?? ""}
          inputMode="tel"
          maxLength={80}
          name="phone"
          placeholder="(713) 555-0100"
          type="tel"
        />
      </label>
      <label className="block text-xs font-semibold text-[#5c6578]">
        Email
        <input className={fieldClass} defaultValue={prospect?.contactEmail ?? ""} maxLength={320} name="email" type="email" />
      </label>
      <label className="block text-xs font-semibold text-[#5c6578]">
        {label("Website", "Sitio web")}
        <input className={fieldClass} defaultValue={website} maxLength={2000} name="website" placeholder="example.com" type="text" />
      </label>
      <label className="block text-xs font-semibold text-[#5c6578] sm:col-span-2">
        {label("Address", "Dirección")}
        <input className={fieldClass} defaultValue={address} maxLength={500} name="address" type="text" />
      </label>
      <label className="block text-xs font-semibold text-[#5c6578] sm:col-span-2">
        {label("Notes", "Notas")}
        <textarea className={fieldClass} defaultValue={notes} maxLength={2500} name="notes" rows={3} />
      </label>
      <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
        <button className="rounded-full bg-[#071b42] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#0a2a5c]" type="submit">
          {editing ? label("Save changes", "Guardar cambios") : label("Add prospect", "Agregar prospecto")}
        </button>
        <p className="text-xs text-[#5c6578]">
          {label(
            "Saving does not contact anyone. You make the call.",
            "Guardar no contacta a nadie. Tú haces la llamada.",
          )}
        </p>
      </div>
    </form>
  );
}

export function ProspectDeleteForm({
  prospect,
  spanish,
  ...scope
}: Scope & {
  prospect: Pick<OrganizationOpportunity, "id" | "name">;
  spanish: boolean;
}) {
  return (
    <details className="rounded-2xl border border-rose-200 bg-rose-50/60 p-4" data-prospect-delete>
      <summary className="cursor-pointer text-sm font-semibold text-rose-900">
        {spanish ? "Eliminar este prospecto" : "Delete this prospect"}
      </summary>
      <p className="mt-2 text-sm text-rose-900">
        {spanish
          ? `Se borra ${prospect.name} y su historial de este escritorio. No se puede deshacer.`
          : `This removes ${prospect.name} and its history from this desk. It cannot be undone.`}
      </p>
      <form action={deleteProspect} className="mt-3">
        <ScopeFields {...scope} />
        <input name="opportunityId" type="hidden" value={prospect.id} />
        <button className="rounded-full bg-rose-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-800" type="submit">
          {spanish ? "Sí, eliminar" : "Yes, delete"}
        </button>
      </form>
    </details>
  );
}
