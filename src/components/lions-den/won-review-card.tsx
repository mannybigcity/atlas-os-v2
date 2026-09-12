import { wonReviewAsk, wonReviewAskHint } from "@/lib/lions-den/won-follow-through";
import { createClient } from "@/lib/supabase/server";
import { saveDeskReviewLink } from "@/server/opportunities/desk-review-actions";
import { getDeskReviewLink } from "@/server/trials/desk-review-link";
import type { OrganizationOpportunity } from "@/server/opportunities/queries";

type WonReviewCardProps = {
  businessName: string;
  organizationId: string;
  previewOrgSlug?: string;
  prospect: Pick<OrganizationOpportunity, "id" | "name" | "contactName" | "nextActionDue" | "metadata">;
  spanish: boolean;
  workspaceSlug?: string;
};

/** After a win: the owner's review link (saved once) and a preview of the review ask the queue will surface. */
export async function WonReviewCard({
  businessName,
  organizationId,
  previewOrgSlug,
  prospect,
  spanish,
  workspaceSlug,
}: WonReviewCardProps) {
  const supabase = await createClient();
  const reviewLink = await getDeskReviewLink(supabase, organizationId);
  const wonAt = prospect.metadata?.won_at ? new Date(String(prospect.metadata.won_at)) : new Date();
  const ask = wonReviewAsk({
    prospectName: prospect.name,
    contactName: prospect.contactName,
    businessName,
    reviewLink,
    spanish,
    wonAt: Number.isNaN(wonAt.getTime()) ? new Date() : wonAt,
  });
  const dueLabel = prospect.nextActionDue ?? ask.nextActionDue;

  return (
    <section className="mt-4 rounded-2xl border border-[#d8c27a] bg-[#fffaf0] p-4" data-won-review>
      <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#5c4a12]">
        {spanish ? "Reseña y referencia" : "Review and referral"}
      </p>
      <p className="mt-1 text-xs text-[#5c4a12]">{wonReviewAskHint(spanish, Boolean(reviewLink))}</p>
      <p className="mt-2 text-xs font-semibold text-[#1246a0]" data-review-ask-due>
        {spanish ? `Pedir la reseña el ${dueLabel}` : `Ask for the review on ${dueLabel}`}
      </p>

      <form action={saveDeskReviewLink} className="mt-3 flex flex-wrap items-end gap-2" data-desk-review-link>
        <input name="organizationId" type="hidden" value={organizationId} />
        <input name="opportunityId" type="hidden" value={prospect.id} />
        <input name="lang" type="hidden" value={spanish ? "es" : "en"} />
        {previewOrgSlug ? <input name="previewOrg" type="hidden" value={previewOrgSlug} /> : null}
        {workspaceSlug ? <input name="workspace" type="hidden" value={workspaceSlug} /> : null}
        <label className="block min-w-[16rem] flex-1 text-xs font-semibold text-[#5c4a12]">
          {spanish ? "Tu enlace de reseñas de Google" : "Your Google review link"}
          <input
            className="mt-1 block w-full rounded-md border border-[#d8c27a] bg-white px-3 py-2 text-sm text-[#071b42]"
            defaultValue={reviewLink}
            inputMode="url"
            name="reviewLink"
            placeholder="https://g.page/r/.../review"
            type="text"
          />
        </label>
        <button
          className="rounded-full bg-[#071b42] px-4 py-2 text-sm font-semibold !text-white"
          type="submit"
        >
          {spanish ? "Guardar enlace" : "Save link"}
        </button>
      </form>

      <details className="mt-3">
        <summary className="cursor-pointer text-xs font-semibold text-[#071b42]">
          {spanish ? "Ver el mensaje que vas a mandar" : "See the message you will send"}
        </summary>
        <p className="mt-2 whitespace-pre-wrap text-sm text-[#33415c]" data-review-ask-preview>
          {ask.nextAction}
        </p>
      </details>
    </section>
  );
}
