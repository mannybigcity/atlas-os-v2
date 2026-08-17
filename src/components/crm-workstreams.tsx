import Link from "next/link";
import type { ContentDraft, ContentStudio } from "@/server/content-studio/queries";
import type { OrganizationOpportunityPipeline } from "@/server/opportunities/queries";
import type { OrganizationSummary, WorkspaceQueryResult } from "@/server/organizations/queries";

export type CrmWorkspace = {
  organization: OrganizationSummary;
  studio: WorkspaceQueryResult<ContentStudio>;
  pipeline: WorkspaceQueryResult<OrganizationOpportunityPipeline>;
};

export function CrmWorkstreams({ workspaces }: { workspaces: CrmWorkspace[] }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white" id="workstreams">
      <div className="flex flex-col gap-1 border-b border-slate-200 px-4 py-4 sm:flex-row sm:items-end sm:justify-between">
        <div><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-blue-700">Agent workstreams</p><h2 className="mt-1 text-xl font-bold text-slate-950">MICAH gallery + HUNTER lead finder</h2></div>
        <span className="text-xs text-slate-500">{workspaces.length} workspaces</span>
      </div>
      <div className="space-y-4 p-4">
        {!workspaces.length ? <p className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600">No organization workspaces are connected yet. The role surfaces remain available through the client workspace.</p> : workspaces.map(({ organization, studio, pipeline }) => (
          <article className="rounded-xl border border-slate-200 bg-slate-50 p-4" key={organization.id}>
            <div className="flex flex-col gap-3 border-b border-slate-200 pb-4 sm:flex-row sm:items-center sm:justify-between">
              <div><p className="text-xs font-bold uppercase tracking-[0.14em] text-blue-700">{organization.name}</p><p className="mt-1 text-sm text-slate-600">Research and creative review in one place.</p></div>
              <div className="flex flex-wrap gap-2">
                <Link className="rounded-lg bg-blue-700 px-3 py-2 text-xs font-semibold text-white" href={roleHref("/client/micah", organization.slug)}>Open MICAH gallery</Link>
                <Link className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700" href={roleHref("/client/hunter", organization.slug)}>Open HUNTER finder</Link>
              </div>
            </div>
            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              <article className="rounded-lg border border-violet-200 bg-white p-4">
                <div className="flex items-center justify-between"><div><p className="text-[10px] font-bold uppercase tracking-[0.14em] text-violet-700">MICAH gallery</p><p className="mt-1 text-lg font-bold text-slate-950">{studio.data.drafts.length} drafts</p></div><span className="rounded-full bg-violet-100 px-2.5 py-1 text-[10px] font-bold uppercase text-violet-800">{studio.data.drafts.filter((draft) => draft.status === "ready_for_review").length} review</span></div>
                <div className="mt-3 grid grid-cols-2 gap-2">{studio.data.drafts.slice(0, 4).map((draft) => <DraftTile draft={draft} key={draft.id} />)}</div>
                {!studio.data.drafts.length ? <p className="mt-3 text-sm text-slate-500">No MICAH drafts are ready.</p> : null}
              </article>
              <article className="rounded-lg border border-amber-200 bg-white p-4">
                <div className="flex items-center justify-between"><div><p className="text-[10px] font-bold uppercase tracking-[0.14em] text-amber-700">HUNTER lead finder</p><p className="mt-1 text-lg font-bold text-slate-950">{pipeline.data.opportunities.length} opportunities</p></div><span className="rounded-full bg-amber-100 px-2.5 py-1 text-[10px] font-bold uppercase text-amber-800">{pipeline.data.opportunities.filter((item) => ["ready_for_follow_up", "follow_up_queued"].includes(item.stage)).length} follow-up</span></div>
                <div className="mt-3 space-y-2">{pipeline.data.opportunities.slice(0, 4).map((item) => <Link className="block rounded-lg border border-slate-200 bg-slate-50 p-3 hover:border-amber-400" href={roleHref("/client/hunter", organization.slug)} key={item.id}><div className="flex items-center justify-between gap-2"><p className="font-semibold text-slate-950">{item.name}</p><span className="text-xs font-bold text-amber-700">{item.fitScore}/100</span></div><p className="mt-1 truncate text-xs text-slate-600">{item.nextAction ?? item.researchSummary}</p></Link>)}</div>
                {!pipeline.data.opportunities.length ? <p className="mt-3 text-sm text-slate-500">No HUNTER opportunities are published.</p> : null}
              </article>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function roleHref(path: string, slug: string | null) {
  return slug ? path + "?previewOrg=" + encodeURIComponent(slug) : path;
}

function DraftTile({ draft }: { draft: ContentDraft }) {
  const source = draft.imageUrl ?? (draft.imageSvg ? "data:image/svg+xml;charset=utf-8," + encodeURIComponent(draft.imageSvg) : null);
  return <div className="overflow-hidden rounded-lg border border-slate-200 bg-slate-50">{source ? <img alt={draft.headline} className="aspect-square w-full object-cover" src={source} /> : <div className="flex aspect-square items-center justify-center bg-slate-900 p-3 text-center text-xs font-bold text-white">{draft.headline}</div>}<div className="p-2"><p className="truncate text-xs font-semibold text-slate-950">{draft.title}</p><p className="mt-1 text-[10px] uppercase text-slate-500">{draft.status.replaceAll("_", " ")}</p></div></div>;
}
