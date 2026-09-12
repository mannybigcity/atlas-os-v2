"use client";

import { logDeskContact } from "@/server/opportunities/desk-contact-actions";

type DeskContactButtonProps = {
  className: string;
  label: string;
  extra?: string | null;
  href: string;
  channel: "call" | "whatsapp";
  spanish: boolean;
  organizationId: string;
  opportunityId?: string;
  customerId?: string;
  previewOrgSlug?: string;
  workspaceSlug?: string;
  returnTo?: string;
};

/**
 * Logs the attempt on the record, then opens the owner's phone or WhatsApp.
 * Atlas does not dial or send.
 */
export function DeskContactButton({
  className,
  label,
  extra,
  href,
  channel,
  spanish,
  organizationId,
  opportunityId,
  customerId,
  previewOrgSlug,
  workspaceSlug,
  returnTo,
}: DeskContactButtonProps) {
  return (
    <form
      action={async (formData) => {
        await logDeskContact(formData);
        if (channel === "whatsapp") {
          window.open(href, "_blank", "noopener,noreferrer");
          return;
        }
        window.location.assign(href);
      }}
    >
      <input name="organizationId" type="hidden" value={organizationId} />
      {opportunityId ? <input name="opportunityId" type="hidden" value={opportunityId} /> : null}
      {customerId ? <input name="customerId" type="hidden" value={customerId} /> : null}
      {previewOrgSlug ? <input name="previewOrg" type="hidden" value={previewOrgSlug} /> : null}
      {workspaceSlug ? <input name="workspace" type="hidden" value={workspaceSlug} /> : null}
      {returnTo ? <input name="returnTo" type="hidden" value={returnTo} /> : null}
      <input name="channel" type="hidden" value={channel} />
      <input name="lang" type="hidden" value={spanish ? "es" : "en"} />
      <button className={className} type="submit">
        {label}
        {extra ? <span className="ml-2 font-normal text-white/80">{extra}</span> : null}
      </button>
    </form>
  );
}
