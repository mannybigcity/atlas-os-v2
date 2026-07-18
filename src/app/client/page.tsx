import Link from "next/link";
import type { Metadata } from "next";
import { SurfaceShell } from "@/components/surface-shell";
import { WorkspaceSectionCard } from "@/components/workspace-section-card";
import { ClientPilotWorkspace } from "@/components/client-pilot-workspace";
import { ClientContentStudio } from "@/components/client-content-studio";
import { isSuperAdminEmail } from "@/lib/env";
import { getOrganizationActivity } from "@/server/activity/queries";
import { signOut } from "@/server/auth/actions";
import { saveDisplayName } from "@/server/auth/profile-actions";
import { getBusinessProfile } from "@/server/business-profile/queries";
import { saveBusinessProfile } from "@/server/business-profile/actions";
import { requireUser } from "@/server/auth/guards";
import {
  createClientNoteMessage,
  createOrganizationNote,
} from "@/server/notes/actions";
import { getNoteMessages } from "@/server/notes/messages";
import { getOrganizationNotes } from "@/server/notes/queries";
import {
  getOrganizationBySlugForSuperAdmin,
  getUserMemberships,
} from "@/server/organizations/queries";
import { getPilotWorkspace } from "@/server/pilot/queries";
import { getContentStudio } from "@/server/content-studio/queries";
import { formatDateTime } from "@/lib/format";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Client Workspace | Atlas For Entrepreneurs",
  robots: { index: false, follow: false },
};

type ClientDashboardPageProps = {
  searchParams?: Promise<{
    access?: string;
    content?: string;
    identity?: string;
    message?: string;
    note?: string;
    pilot?: string;
    previewOrg?: string;
    profile?: string;
    status?: string;
  }>;
};

const workspaceSections = [
  {
    title: "Daily Briefing",
    description:
      "A short summary of what matters now, what is waiting, and what comes next.",
    status: "Coming soon",
  },
  {
    title: "Priorities",
    description:
      "Your focused plan, active priorities, owners, and due dates in one place.",
    status: "Ready",
  },
  {
    title: "General messages",
    description:
      "Use this for questions or conversations that are not tied to a specific work item.",
    status: "Ready",
  },
  {
    title: "History",
    description:
      "Open a read-only record of workspace changes when you need it.",
    status: "Ready",
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
  description: string;
  placeholder: string;
  value: string | null | undefined;
};

export default async function ClientDashboardPage({
  searchParams,
}: ClientDashboardPageProps) {
  const user = await requireUser("/client");
  const params = await searchParams;
  const isSuperAdmin = isSuperAdminEmail(user.email);
  const previewOrgSlug = isSuperAdmin
    ? String(params?.previewOrg ?? "").trim().toLowerCase()
    : "";
  const previewOrganization = previewOrgSlug
    ? await getOrganizationBySlugForSuperAdmin(previewOrgSlug)
    : null;
  const personalMemberships = await getUserMemberships(user.id);
  const isClientPreview = Boolean(
    previewOrganization &&
      !previewOrganization.setupRequired &&
      previewOrganization.data,
  );
  const memberships = isClientPreview
    ? {
        data: [
          {
            id: `preview-${previewOrganization?.data?.id}`,
            role: "owner" as const,
            organization: previewOrganization?.data ?? null,
          },
        ],
        setupRequired: false as const,
        error: null,
      }
    : personalMemberships;
  const primaryMembership = memberships.data.find((membership) => membership.organization);
  const primaryOrganization = primaryMembership?.organization;
  const canEditBusinessProfile =
    !isClientPreview &&
    (primaryMembership?.role === "owner" || primaryMembership?.role === "admin");
  const canCreateNotes = Boolean(primaryMembership) && !isClientPreview;
  const displayName = String(user.user_metadata.display_name ?? "").trim();
  const businessProfile = primaryOrganization
    ? await getBusinessProfile(primaryOrganization.id)
    : null;
  const notes = primaryOrganization
    ? await getOrganizationNotes(primaryOrganization.id)
    : null;
  const messages = primaryOrganization
    ? await getNoteMessages(primaryOrganization.id)
    : null;
  const activity = primaryOrganization
    ? await getOrganizationActivity(primaryOrganization.id)
    : null;
  const pilot = primaryOrganization
    ? await getPilotWorkspace(primaryOrganization.id)
    : null;
  const contentStudio = primaryOrganization
    ? await getContentStudio(primaryOrganization.id)
    : null;
  const businessProfileFields: BusinessProfileField[] = [
    {
      name: "offer",
      label: "What you offer",
      description: "What does this business sell, and what result does it create?",
      placeholder:
        "Example: AI-powered operating system for entrepreneurs and small businesses.",
      value: businessProfile?.data?.offer,
    },
    {
      name: "targetCustomer",
      label: "Target customer",
      description: "Who is the business built to serve first?",
      placeholder:
        "Example: Solo founders and service businesses doing $5k-$100k/month.",
      value: businessProfile?.data?.targetCustomer,
    },
    {
      name: "positioning",
      label: "Why customers choose you",
      description: "How should customers understand why this business is different?",
      placeholder:
        "Example: A practical AI chief of staff that helps owners focus and execute.",
      value: businessProfile?.data?.positioning,
    },
    {
      name: "currentGoals",
      label: "Current goals",
      description: "What outcomes matter most right now?",
      placeholder:
        "Example: Validate the command center, onboard first users, and protect costs.",
      value: businessProfile?.data?.currentGoals,
    },
    {
      name: "constraints",
      label: "Challenges and limits",
      description: "What could get in the way, or what should Atlas respect?",
      placeholder:
        "Example: Minimal budget, no uncontrolled AI spend, and no premature complexity.",
      value: businessProfile?.data?.constraints,
    },
  ];
  const completedProfileFields = businessProfileFields.filter((field) => field.value);

  return (
    <SurfaceShell
      description="This is the beginning of the Atlas Command Center: a secure workspace home scoped to your organization."
      eyebrow="Client access"
      title={primaryOrganization?.name ?? "Client Workspace Home"}
    >
      <div className="space-y-4">
        {params?.status === "welcome" ? (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-sm leading-6 text-emerald-900">
            Welcome to Atlas. Your password is set, and this is your private
            business workspace.
          </div>
        ) : null}

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

        {params?.pilot === "review_saved" ? (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-sm leading-6 text-emerald-900">
            Your review was saved.
          </div>
        ) : null}

        {params?.pilot === "review_denied" ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-900">
            Only organization owners and admins can review this work.
          </div>
        ) : null}

        {params?.pilot === "review_error" ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-sm leading-6 text-rose-900">
            Your review could not be saved.
          </div>
        ) : null}

        {params?.content === "review_saved" ? (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-sm leading-6 text-emerald-900">
            Your content review was saved. Atlas and MICAH can now see your decision.
          </div>
        ) : null}

        {params?.content === "review_error" ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-sm leading-6 text-rose-900">
            The content review could not be saved. Please try once more or message Atlas.
          </div>
        ) : null}

        {params?.profile === "denied" ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-900">
            Only organization owners and admins can update business context.
          </div>
        ) : null}

        {params?.profile === "error" ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-sm leading-6 text-rose-900">
            Business context could not be saved right now. Please try once
            more or send Atlas a message for help.
          </div>
        ) : null}

        {params?.note === "created" || params?.note === "updated" ? (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-sm leading-6 text-emerald-900">
            Note {params.note === "created" ? "created" : "updated"}.
          </div>
        ) : null}

        {params?.note === "denied" ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-900">
            You can only update notes you created unless you are an organization
            owner or admin.
          </div>
        ) : null}

        {params?.note === "missing_title" ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-900">
            Add a note title before saving.
          </div>
        ) : null}

        {params?.note === "error" ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-sm leading-6 text-rose-900">
            The note could not be saved right now. Please try once more or send
            Atlas a message for help.
          </div>
        ) : null}

        {params?.message === "created" ? (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-sm leading-6 text-emerald-900">
            Conversation reply added.
          </div>
        ) : null}

        {params?.message === "missing_body" ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-900">
            Add a message before sending.
          </div>
        ) : null}

        {params?.message === "error" || params?.message === "denied" ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-sm leading-6 text-rose-900">
            The conversation reply could not be added.
          </div>
        ) : null}

        {params?.identity === "saved" ? (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-sm leading-6 text-emerald-900">
            Conversation display name saved.
          </div>
        ) : null}

        {params?.identity && params.identity !== "saved" ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-900">
            Use a display name between 2 and 80 characters. “Atlas Admin” is
            reserved for authorized Atlas staff.
          </div>
        ) : null}

        {previewOrganization?.setupRequired ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-sm leading-6 text-rose-900">
            Atlas could not load the requested client preview. Confirm the
            organization slug and workspace access.
          </div>
        ) : null}

        {previewOrgSlug && previewOrganization && !previewOrganization.data ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-900">
            No organization was found for preview slug "{previewOrgSlug}".
          </div>
        ) : null}

        {isClientPreview ? (
          <div className="rounded-2xl border border-blue-200 bg-blue-50 p-5 text-sm leading-6 text-blue-950">
            <p className="font-semibold">Client preview mode</p>
            <p className="mt-1">
              You are viewing {primaryOrganization?.name} through the client
              workspace layout while signed in as Super Admin {user.email}.
              Review controls are disabled here so you can audit the experience
              without acting as the client.
            </p>
          </div>
        ) : null}

        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-sm leading-6 text-emerald-900">
          {isClientPreview
            ? `The ${primaryOrganization?.name ?? "client"} workspace is ready for review. The information shown here is limited to that organization.`
            : `Your private ${primaryOrganization?.name ?? "Atlas"} workspace is ready. You are signed in as ${user.email}, and the information shown here is limited to your organization.`}
        </div>

        {memberships.data.length > 0 ? (
          <section className="rounded-2xl border border-blue-200 bg-blue-50 p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-700">
              Start here
            </p>
            <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-950">
              Three steps to put Atlas to work
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-700">
              Give Atlas the business context it needs, review the current plan,
              and keep questions or decisions inside this private workspace.
            </p>
            <div className="mt-5 grid gap-3 md:grid-cols-3">
              <Link
                className="rounded-2xl border border-blue-200 bg-white p-4 transition hover:border-blue-400 hover:shadow-sm"
                href="#business-profile"
              >
                <span className="text-xs font-semibold uppercase tracking-[0.12em] text-blue-700">
                  Step 1
                </span>
                <span className="mt-2 block font-semibold text-slate-950">
                  Complete your business profile
                </span>
                <span className="mt-1 block text-sm leading-6 text-slate-600">
                  Tell Atlas what {primaryOrganization?.name ?? "your business"} offers,
                  who it serves, and what matters now.
                </span>
              </Link>
              <Link
                className="rounded-2xl border border-blue-200 bg-white p-4 transition hover:border-blue-400 hover:shadow-sm"
                href="#work-messages"
              >
                <span className="text-xs font-semibold uppercase tracking-[0.12em] text-blue-700">
                  Step 2
                </span>
                <span className="mt-2 block font-semibold text-slate-950">
                  Review your 30-day plan
                </span>
                <span className="mt-1 block text-sm leading-6 text-slate-600">
                  See priorities, next actions, check-ins, and work awaiting approval.
                </span>
              </Link>
              <Link
                className="rounded-2xl border border-blue-200 bg-white p-4 transition hover:border-blue-400 hover:shadow-sm"
                href="#general-messages"
              >
                <span className="text-xs font-semibold uppercase tracking-[0.12em] text-blue-700">
                  Step 3
                </span>
                <span className="mt-2 block font-semibold text-slate-950">
                  Keep the conversation together
                </span>
                <span className="mt-1 block text-sm leading-6 text-slate-600">
                  Ask questions, record decisions, and mention @Atlas when you need help.
                </span>
              </Link>
            </div>
          </section>
        ) : null}

        {!isSuperAdmin ? (
          <form
            action={saveDisplayName}
            className="rounded-2xl border border-slate-200 bg-white p-5"
          >
            <label className="block">
              <span className="text-sm font-semibold text-slate-950">
                Your conversation name
              </span>
              <span className="mt-1 block text-sm leading-6 text-slate-600">
                This name appears beside your timestamped messages.
              </span>
              <input
                className="mt-3 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
                defaultValue={displayName}
                name="displayName"
                placeholder="Example: Manny Ramirez"
              />
            </label>
            <button
              className="mt-4 rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
              type="submit"
            >
              Save display name
            </button>
          </form>
        ) : null}

        {memberships.setupRequired ? (
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 text-sm leading-6 text-slate-700">
            Atlas could not load your workspace access. Contact Atlas so we can
            restore it before you continue.
          </div>
        ) : null}

        {!memberships.setupRequired && memberships.data.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 text-sm leading-6 text-slate-700">
            Your login is active, but a business workspace has not been assigned
            yet. Contact Atlas and we will connect it.
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
                  Your private business workspace
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
                  {isClientPreview
                    ? "Read-only owner preview. Q can update business context and review work from his own login."
                    : "You can update business context and review work for this organization."}
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
                  Start with your plan, review work that needs a decision, or
                  message Atlas when you need help.
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

            <div id="work-messages">
              {pilot?.setupRequired ? (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 text-sm leading-6 text-slate-700">
                  Atlas is preparing your plan and review workspace. You can still
                  complete your business profile and send a message below.
                </div>
              ) : null}

              {!pilot?.setupRequired && pilot && primaryOrganization ? (
                <ClientPilotWorkspace
                  canReview={canEditBusinessProfile}
                  organizationId={primaryOrganization.id}
                  workspace={pilot.data}
                />
              ) : null}
            </div>

            {contentStudio?.setupRequired ? (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 text-sm leading-6 text-slate-700">
                Atlas is preparing your Content Studio. Your plan and messages remain available.
              </div>
            ) : null}

            {!contentStudio?.setupRequired && contentStudio && primaryOrganization ? (
              <ClientContentStudio
                canReview={canEditBusinessProfile}
                organizationId={primaryOrganization.id}
                studio={contentStudio.data}
              />
            ) : null}

            <details className="rounded-2xl border border-slate-200 bg-white p-5">
              <summary className="flex cursor-pointer list-none flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.16em] text-blue-700">
                    Workspace history
                  </p>
                  <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-950">
                    Activity
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    A read-only record of meaningful workspace changes. No AI,
                    email, or notification costs are triggered.
                  </p>
                </div>
                <span className="w-fit rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                  View history
                </span>
              </summary>

              {activity?.setupRequired ? (
                <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-5 text-sm leading-6 text-slate-700">
                  Workspace history is being prepared. Your current work and
                  messages remain available.
                </div>
              ) : null}

              {!activity?.setupRequired ? (
                <div className="mt-5 divide-y divide-slate-200 rounded-2xl border border-slate-200 bg-slate-50 px-5">
                  {activity?.data.length === 0 ? (
                    <p className="py-5 text-sm leading-6 text-slate-600">
                      No activity has been recorded yet. New note and business
                      profile changes will appear here.
                    </p>
                  ) : null}

                  {activity?.data.map((event) => (
                    <article className="py-5" key={event.id}>
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <h3 className="font-semibold text-slate-950">
                            {event.title}
                          </h3>
                          <p className="mt-1 text-sm leading-6 text-slate-500">
                            {formatDateTime(event.occurredAt)}
                          </p>
                        </div>
                        <span className="w-fit rounded-full bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500 ring-1 ring-slate-200">
                          {event.eventType.replaceAll(".", " ")}
                        </span>
                      </div>
                    </article>
                  ))}
                </div>
              ) : null}
            </details>

            <details
              className="rounded-2xl border border-slate-200 bg-white p-5"
              id="general-messages"
            >
              <summary className="flex cursor-pointer list-none flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.16em] text-blue-700">
                    General messages
                  </p>
                  <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-950">
                    Messages not tied to work
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    Use this for a conversation that does not belong to a specific
                    item in Work &amp; Messages above.
                  </p>
                </div>
                <span className="w-fit rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                  Open messages
                </span>
              </summary>

              {notes?.setupRequired ? (
                <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-5 text-sm leading-6 text-slate-700">
                  General messages are being prepared. Contact Atlas directly if
                  you need help before this section is available.
                </div>
              ) : null}

              {messages?.setupRequired && !notes?.setupRequired ? (
                <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-5 text-sm leading-6 text-slate-700">
                  Conversation history is being prepared. Your existing notes
                  remain safe.
                </div>
              ) : null}

              {!notes?.setupRequired && !messages?.setupRequired && canCreateNotes ? (
                <form
                  action={createOrganizationNote}
                  className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-5"
                >
                  <input
                    name="organizationId"
                    type="hidden"
                    value={primaryOrganization?.id ?? ""}
                  />
                  <div className="grid gap-4">
                    <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4 text-sm leading-6 text-blue-950">
                      Mention <span className="font-semibold">@Atlas</span> in
                      a message to place the conversation in the Atlas Inbox.
                      No external notification or AI runs.
                    </div>
                    <label className="block">
                      <span className="text-sm font-medium text-slate-700">
                        Note title
                      </span>
                      <input
                        className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
                        name="title"
                        placeholder="Example: Website positioning feedback"
                      />
                    </label>
                    <label className="block">
                      <span className="text-sm font-medium text-slate-700">
                        First message
                      </span>
                      <textarea
                        className="mt-2 min-h-24 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm leading-6 text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
                        name="body"
                        placeholder="Start the conversation. Mention @Atlas when you need Atlas Admin attention."
                      />
                    </label>
                  </div>
                  <button
                    className="mt-4 rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
                    type="submit"
                  >
                    Start conversation
                  </button>
                </form>
              ) : null}

              {!notes?.setupRequired && !messages?.setupRequired ? (
                <div className="mt-5 space-y-4">
                  {notes?.data.length === 0 ? (
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 text-sm leading-6 text-slate-600">
                      No notes have been saved for this organization yet.
                    </div>
                  ) : null}

                  {notes?.data.map((note) => (
                    <article
                      className="rounded-2xl border border-slate-200 bg-slate-50 p-5"
                      key={note.id}
                    >
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                        <h3 className="text-lg font-semibold text-slate-950">
                          {note.title}
                        </h3>
                        {note.attentionRequested ? (
                          <span className="w-fit rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-blue-700">
                            Atlas attention requested
                          </span>
                        ) : null}
                      </div>

                      <div className="mt-4 space-y-3">
                        {messages?.data
                          .filter((message) => message.noteId === note.id)
                          .map((message) => (
                            <div
                              className={`rounded-2xl border p-4 ${
                                message.authorKind === "atlas_admin"
                                  ? "border-blue-200 bg-blue-50"
                                  : "border-slate-200 bg-white"
                              }`}
                              key={message.id}
                            >
                              <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                                <p className="text-sm font-semibold text-slate-950">
                                  {message.authorKind === "atlas_admin"
                                    ? "Atlas Admin"
                                    : message.authorDisplayName}
                                </p>
                                <p className="text-xs text-slate-500">
                                  {formatDateTime(message.createdAt)}
                                </p>
                              </div>
                              <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">
                                {message.body}
                              </p>
                            </div>
                          ))}
                      </div>

                      <form action={createClientNoteMessage} className="mt-4">
                        <input
                          name="organizationId"
                          type="hidden"
                          value={note.organizationId}
                        />
                        <input name="noteId" type="hidden" value={note.id} />
                        <label className="block">
                          <span className="text-sm font-medium text-slate-700">
                            Add a reply
                          </span>
                          <textarea
                            className="mt-2 min-h-24 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm leading-6 text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
                            name="body"
                            placeholder="Write a new message. Mention @Atlas when you need attention."
                          />
                        </label>
                        <button
                          className="mt-3 rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
                          type="submit"
                        >
                          Send reply
                        </button>
                      </form>
                    </article>
                  ))}
                </div>
              ) : null}
            </details>

            <section
              className="rounded-2xl border border-slate-200 bg-white p-5"
              id="business-profile"
            >
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.16em] text-blue-700">
                    About your business
                  </p>
                  <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-950">
                    Business profile
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    This is the structured business memory Atlas will use before
                    any AI features are allowed.
                  </p>
                </div>
                <span className="w-fit rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                  {canEditBusinessProfile ? "Editable" : "Read only"}
                </span>
              </div>

              {businessProfile?.setupRequired ? (
                <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-5 text-sm leading-6 text-slate-700">
                  Atlas is preparing your business profile. Send Atlas a message
                  with any important context you want captured now.
                </div>
              ) : null}

              {!businessProfile?.setupRequired && canEditBusinessProfile ? (
                <div className="mt-5 grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
                  <form action={saveBusinessProfile} className="space-y-4">
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
                        <span className="mt-1 block text-sm leading-6 text-slate-500">
                          {field.description}
                        </span>
                        <textarea
                          className="mt-2 min-h-24 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm leading-6 text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
                          defaultValue={field.value ?? ""}
                          name={field.name}
                          placeholder={field.placeholder}
                        />
                      </label>
                    ))}

                    <button
                      className="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
                      type="submit"
                    >
                      Save business profile
                    </button>
                  </form>

                  <aside className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                    <p className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">
                      Profile progress
                    </p>
                    <h3 className="mt-3 text-xl font-bold tracking-tight text-slate-950">
                      {completedProfileFields.length}/5 fields filled
                    </h3>
                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      Last updated: {formatDateTime(businessProfile?.data?.updatedAt)}
                    </p>
                    <div className="mt-5 space-y-4">
                      {businessProfileFields.map((field) => (
                        <div key={field.name}>
                          <p className="text-sm font-semibold text-slate-950">
                            {field.label}
                          </p>
                          <p className="mt-1 text-sm leading-6 text-slate-600">
                            {field.value || "Not filled in yet."}
                          </p>
                        </div>
                      ))}
                    </div>
                  </aside>
                </div>
              ) : null}

              {!businessProfile?.setupRequired && !canEditBusinessProfile ? (
                <div className="mt-5">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                    <p className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">
                      Profile progress
                    </p>
                    <h3 className="mt-3 text-xl font-bold tracking-tight text-slate-950">
                      {completedProfileFields.length}/5 fields filled
                    </h3>
                    <p className="mt-2 text-sm leading-6 text-slate-600">
                      Last updated: {formatDateTime(businessProfile?.data?.updatedAt)}
                    </p>
                  </div>
                  <div className="mt-4 grid gap-4 md:grid-cols-2">
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
