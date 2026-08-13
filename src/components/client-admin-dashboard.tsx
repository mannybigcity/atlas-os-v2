import Link from "next/link";
import type { OrganizationSummary } from "@/server/organizations/queries";

export function ClientAdminDashboard({
  organizations,
}: {
  organizations: OrganizationSummary[];
}) {
  return (
    <section className="rounded-[2rem] border border-slate-200 bg-[radial-gradient(circle_at_top_left,rgba(86,114,240,0.18),transparent_34%),linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] p-6 shadow-[0_18px_50px_rgba(15,23,42,0.06)]">
      <p className="text-[11px] font-black uppercase tracking-[0.22em] text-[#5672f0]">
        Atlas-only access
      </p>
      <h2 className="mt-3 text-4xl font-semibold tracking-[-0.06em] text-slate-950 sm:text-5xl">
        Client Admin
      </h2>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
        Choose a client workspace to review its private dashboard. Client data stays scoped to the selected organization.
      </p>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {organizations.map((organization) => (
          <article
            className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-[0_10px_28px_rgba(15,23,42,0.04)]"
            key={organization.id}
          >
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
              Client
            </p>
            <h3 className="mt-2 text-xl font-semibold tracking-[-0.04em] text-slate-950">
              {organization.name}
            </h3>
            {organization.slug ? (
              <Link
                className="mt-5 inline-flex rounded-full bg-[#123f8b] px-4 py-2.5 text-sm font-semibold !text-white transition hover:bg-[#0f356f]"
                href={`/client?previewOrg=${encodeURIComponent(organization.slug)}`}
                style={{ color: "#ffffff" }}
              >
                Open client dashboard
              </Link>
            ) : (
              <p className="mt-5 text-sm leading-6 text-slate-500">
                This client needs a workspace slug before it can be opened.
              </p>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}
