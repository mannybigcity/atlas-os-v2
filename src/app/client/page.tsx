import Link from "next/link";
import { SurfaceShell } from "@/components/surface-shell";
import { WorkspaceSectionCard } from "@/components/workspace-section-card";
import { signOut } from "@/server/auth/actions";
import { getBusinessProfile } from "@/server/business-profile/queries";
import { saveBusinessProfile } from "@/server/business-profile/actions";
import { requireUser } from "@/server/auth/guards";
import { getUserMemberships } from "@/server/organizations/queries";

export const dynamic = "force-dynamic";

type ClientDashboardPageProps = {
  searchParams?: Promise<{
    access?: string;
    profile?: string;
  }>;
};

const workspaceSections = [
  {
    title: "Daily Briefing",
    description:
      "This will become the first place Atlas summarizes what matters today for this organization.",
    status: "Not connected",
  },
  {
    title: "Priorities",
    description:
      "This will hold the focused work that needs attention before Atlas grows into deeper workflows.",
    status: "Not connected",
  },
  {
    title: "Notes",
    description:
      "This will capture business context before we introduce AI retrieval or document storage.",
    status: "Not connected",
  },
  {
    title: "Activity",
    description:
      "This will become the organization timeline once real business events exist.",
    status: "Not connected",
  },
];

type BusinessProfileField = {
  name:
    | "offer"
    | "targetCustomer"
    | "positioning"
    | "currentGoals"
    | "constraints";
  label: string;
  value: string | null | undefined;
};

export default async function ClientDashboardPage({
  searchParams,
}: ClientDashboardPageProps) {
  const user = await requireUser("/client");
  const params = await searchParams;
  const memberships = await getUserMemberships(user.id);
  const primaryMembership = memberships.data.find((membership) => membership.organization);
  const primaryOrganization = primaryMembership?.organization;
  const canEditBusinessProfile =
    primaryMembership?.role === "owner" || primaryMembership?.role === "admin";
  const businessProfile = primaryOrganization
    ? await getBusinessProfile(primaryOrganization.id)
    : null;
  const businessProfileFields: BusinessProfileField[] = [
    {
      name: "offer",
      label: "Offer",
      value: businessProfile?.data?.offer,
    },
    {
      name: "targetCustomer",
      label: "Target customer",
      value: businessProfile?.data?.targetCustomer,
    },
    {
      name: "positioning",
      label: "Positioning",
      value: businessProfile?.data?.positioning,
    },
    {
      name: "currentGoals",
      label: "Current goals",
      value: businessProfile?.data?.currentGoals,
    },
    {
      name: "constraints",
      label: "Constraints",
      value: businessProfile?.data?.constraints,
    },
  ];

  return (
    <SurfaceShell
      description="This is the beginning of the Atlas Command Center: a secure workspace home scoped to your organization."
      eyebrow="Client access"
      title={primaryOrganization?.name ?? "Client Workspace Home"}
    >
      <div className="space-y-4">
        {params?.access === "denied" ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-900">
            Your account is authenticated, but it is not authorized for The
            Lion&apos;s Den.
          </div>
        ) : null}

        {params?.profile === "saved" ? (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-sm leading-6 text-emerald-900">
            Business context saved.
          </div>
        ) : null}

        {params?.profile === "denied" ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-900">
            Only organization owners and admins can update business context.
          </div>
        ) : null}

        {params?.profile === "error" ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-sm leading-6 text-rose-900">
            Business context could not be saved. Check that the Organization
            Context migration has been applied.
          </div>
        ) : null}

        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-sm leading-6 text-emerald-900">
          Signed in as {user.email}. This workspace uses real organization
          membership data. Customer records, metrics, documents, and AI are not
          connected yet.
        </div>

        {memberships.setupRequired ? (
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 text-sm leading-6 text-slate-700">
            Workspace tables are not ready yet. Apply the workspace foundation
            migration in Supabase, then add an organization membership.
          </div>
        ) : null}

        {!memberships.setupRequired && memberships.data.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 text-sm leading-6 text-slate-700">
            No organization membership is assigned to this account yet.
          </div>
        ) : null}

        {memberships.data.length > 0 ? (
          <>
            <section className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
              <div className="rounded-2xl border border-slate-200 bg-white p-5">
                <p className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Organization
                </p>
                <h2 className="mt-3 text-2xl font-bold tracking-tight text-slate-950">
                  {primaryOrganization?.name ?? "Unknown organization"}
                </h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Slug: {primaryOrganization?.slug ?? "not set"}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5">
                <p className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Access
                </p>
                <h2 className="mt-3 text-2xl font-bold tracking-tight text-slate-950">
                  {primaryMembership?.role ?? "member"}
                </h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Role is read from organization membership.
                </p>
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.16em] text-blue-700">
                    Command Center
                  </p>
                  <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-950">
                    Workspace sections
                  </h2>
                </div>
                <p className="max-w-xl text-sm leading-6 text-slate-600">
                  These are intentionally empty. We are defining the product
                  surface before adding new tables or AI.
                </p>
              </div>

              <div className="mt-5 grid gap-4 md:grid-cols-2">
                {workspaceSections.map((section) => (
                  <WorkspaceSectionCard
                    description={section.description}
                    key={section.title}
                    status={section.status}
                    title={section.title}
                  />
                ))}
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-5">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.16em] text-blue-700">
                    Organization Context
                  </p>
                  <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-950">
                    Business profile
                  </h2>
                </div>
                <span className="w-fit rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                  {canEditBusinessProfile ? "Editable" : "Read only"}
                </span>
              </div>

              {businessProfile?.setupRequired ? (
                <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-5 text-sm leading-6 text-slate-700">
                  Organization Context is not ready yet. Apply the business
                  profile migration in Supabase to enable this section.
                </div>
              ) : null}

              {!businessProfile?.setupRequired && canEditBusinessProfile ? (
                <form action={saveBusinessProfile} className="mt-5 space-y-4">
                  <input
                    name="organizationId"
                    type="hidden"
                    value={primaryOrganization?.id ?? ""}
                  />
                  {businessProfileFields.map((field) => (
                    <label className="block" key={field.name}>
                      <span className="text-sm font-medium text-slate-700">
                        {field.label}
                      </span>
                      <textarea
                        className="mt-2 min-h-24 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm leading-6 text-slate-950 outline-none transition focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
                        defaultValue={field.value ?? ""}
                        name={field.name}
                      />
                    </label>
                  ))}

                  <button
                    className="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
                    type="submit"
                  >
                    Save business context
                  </button>
                </form>
              ) : null}

              {!businessProfile?.setupRequired && !canEditBusinessProfile ? (
                <div className="mt-5 grid gap-4 md:grid-cols-2">
                  {businessProfileFields.map((field) => (
                    <div
                      className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                      key={field.name}
                    >
                      <p className="text-sm font-semibold text-slate-950">
                        {field.label}
                      </p>
                      <p className="mt-2 text-sm leading-6 text-slate-600">
                        {field.value || "Not filled in yet."}
                      </p>
                    </div>
                  ))}
                </div>
              ) : null}
            </section>

            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <h2 className="text-lg font-semibold text-slate-950">
                Your organization memberships
              </h2>
              <div className="mt-4 divide-y divide-slate-200">
                {memberships.data.map((membership) => (
                  <div className="py-4 first:pt-0 last:pb-0" key={membership.id}>
                    <p className="font-medium text-slate-950">
                      {membership.organization?.name ?? "Unknown organization"}
                    </p>
                    <p className="mt-1 text-sm text-slate-600">
                      Role: {membership.role}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </>
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
