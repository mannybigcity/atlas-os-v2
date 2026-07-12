import Link from "next/link";
import { SurfaceShell } from "@/components/surface-shell";
import { formatDateTime } from "@/lib/format";
import {
  acknowledgeAttentionRequest,
  resolveAttentionRequest,
} from "@/server/attention/actions";
import { getActiveAttentionRequests } from "@/server/attention/queries";
import { signOut } from "@/server/auth/actions";
import { requireSuperAdmin } from "@/server/auth/guards";
import { getOrganizationsForSuperAdmin } from "@/server/organizations/queries";

export const dynamic = "force-dynamic";

type LionsDenPageProps = {
  searchParams?: Promise<{
    attention?: string;
  }>;
};

export default async function LionsDenPage({ searchParams }: LionsDenPageProps) {
  const user = await requireSuperAdmin("/lions-den");
  const params = await searchParams;
  const organizations = await getOrganizationsForSuperAdmin();
  const attentionRequests = await getActiveAttentionRequests();
  const openRequestCount = attentionRequests.data.filter(
    (request) => request.status === "open",
  ).length;

  return (
    <SurfaceShell
      description="The secure internal operations surface for Atlas Super Admin users, intentionally isolated from the client dashboard."
      eyebrow="Super Admin"
      title="The Lion's Den"
    >
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-sm leading-6 text-emerald-900">
        Signed in as Super Admin {user.email}. Privileged access is enforced
        server-side.
      </div>

      <div className="mt-4 space-y-4">
        {params?.attention === "acknowledged" ? (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-sm leading-6 text-emerald-900">
            Attention request acknowledged.
          </div>
        ) : null}

        {params?.attention === "resolved" ? (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-sm leading-6 text-emerald-900">
            Attention request resolved.
          </div>
        ) : null}

        {params?.attention === "error" ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-sm leading-6 text-rose-900">
            The attention request could not be updated. Confirm that the
            Attention Inbox migration has been applied.
          </div>
        ) : null}

        <section className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-blue-700">
                Client Attention
              </p>
              <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-950">
                Atlas Inbox
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Review `@Atlas` requests across every client organization from
                one secure queue.
              </p>
            </div>
            <span className="w-fit rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-blue-700">
              {openRequestCount} open
            </span>
          </div>

          {attentionRequests.setupRequired ? (
            <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-5 text-sm leading-6 text-slate-700">
              The Atlas Inbox is not ready yet. Apply the Attention Inbox
              migration in Supabase.
            </div>
          ) : null}

          {!attentionRequests.setupRequired && attentionRequests.data.length === 0 ? (
            <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-5 text-sm leading-6 text-slate-600">
              No client requests need attention.
            </div>
          ) : null}

          {!attentionRequests.setupRequired && attentionRequests.data.length > 0 ? (
            <div className="mt-5 space-y-4">
              {attentionRequests.data.map((request) => (
                <article
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-5"
                  key={request.id}
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-500">
                        {request.organizationName}
                      </p>
                      <h3 className="mt-2 text-lg font-semibold text-slate-950">
                        {request.noteTitle}
                      </h3>
                      <p className="mt-2 text-sm leading-6 text-slate-600">
                        Requested {formatDateTime(request.requestedAt)}
                      </p>
                    </div>
                    <span
                      className={`w-fit rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] ${
                        request.status === "acknowledged"
                          ? "bg-amber-100 text-amber-800"
                          : "bg-blue-100 text-blue-700"
                      }`}
                    >
                      {request.status}
                    </span>
                  </div>

                  <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                    {request.status === "open" ? (
                      <form action={acknowledgeAttentionRequest}>
                        <input name="requestId" type="hidden" value={request.id} />
                        <button
                          className="w-full rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-100 sm:w-auto"
                          type="submit"
                        >
                          Acknowledge
                        </button>
                      </form>
                    ) : null}
                    <form action={resolveAttentionRequest}>
                      <input name="requestId" type="hidden" value={request.id} />
                      <button
                        className="w-full rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 sm:w-auto"
                        type="submit"
                      >
                        Resolve
                      </button>
                    </form>
                  </div>
                </article>
              ))}
            </div>
          ) : null}
        </section>

        {organizations.setupRequired ? (
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 text-sm leading-6 text-slate-700">
            Workspace tables are not ready yet. Apply the workspace foundation
            migration in Supabase to enable the organization list shell.
          </div>
        ) : null}

        {!organizations.setupRequired && organizations.data.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 text-sm leading-6 text-slate-700">
            No organizations exist yet.
          </div>
        ) : null}

        {organizations.data.length > 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <h2 className="text-lg font-semibold text-slate-950">
              Organizations
            </h2>
            <div className="mt-4 divide-y divide-slate-200">
              {organizations.data.map((organization) => (
                <div className="py-4 first:pt-0 last:pb-0" key={organization.id}>
                  <p className="font-medium text-slate-950">
                    {organization.name}
                  </p>
                  <p className="mt-1 text-sm text-slate-600">
                    Slug: {organization.slug ?? "not set"}
                  </p>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <Link
          className="rounded-full border border-slate-300 px-5 py-3 text-center text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
          href="/"
        >
          Public site
        </Link>
        <form action={signOut}>
          <button
            className="w-full rounded-full bg-slate-950 px-5 py-3 text-center text-sm font-semibold text-white transition hover:bg-slate-800 sm:w-auto"
            type="submit"
          >
            Sign out
          </button>
        </form>
      </div>
    </SurfaceShell>
  );
}
