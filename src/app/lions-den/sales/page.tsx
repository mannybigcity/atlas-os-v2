import Link from "next/link";
import { HunterSearch } from "@/components/hunter-search";
import { SurfaceShell } from "@/components/surface-shell";
import { formatDateTime } from "@/lib/format";
import { requireSuperAdmin } from "@/server/auth/guards";
import { createSalesProspect } from "@/server/sales/actions";
import {
  getSalesProspects,
  type SalesProspectStatus,
} from "@/server/sales/queries";

export const dynamic = "force-dynamic";

type SalesPageProps = {
  searchParams?: Promise<{ crm?: string }>;
};

const errorMessages: Record<string, string> = {
  business_name_required: "Enter the prospect's business name.",
  invalid_website: "Enter a valid business website, such as example.com.",
  invalid_source: "Enter a valid public source URL beginning with a real domain.",
  invalid_email: "Enter a valid business contact email or leave it blank.",
  invalid_contact_basis: "Choose a valid contact basis.",
  create_failed: "The prospect could not be created. Apply the Atlas Sales CRM migration first.",
};

const openStatuses = new Set<SalesProspectStatus>([
  "new",
  "researching",
  "review_ready",
  "approved_for_outreach",
  "contacted",
  "replied",
  "qualified",
  "proposal_sent",
]);

export default async function SalesPage({ searchParams }: SalesPageProps) {
  await requireSuperAdmin("/lions-den/sales");
  const params = await searchParams;
  const prospects = await getSalesProspects();
  const error = params?.crm ? errorMessages[params.crm] : null;
  const openCount = prospects.data.filter((prospect) =>
    openStatuses.has(prospect.status),
  ).length;
  const scheduledCount = prospects.data.filter(
    (prospect) =>
      prospect.nextActionAt &&
      openStatuses.has(prospect.status),
  ).length;
  const approvedCount = prospects.data.filter(
    (prospect) => prospect.outreachApprovedAt,
  ).length;

  return (
    <SurfaceShell
      description="The private Atlas sales system. HUNTER researches, DAVID keeps every next step visible, MICAH prepares approved drafts, and ATLAS coordinates the handoffs."
      eyebrow="Atlas Revenue Operations"
      title="Sales Command"
    >
      <div className="grid gap-3 sm:grid-cols-3">
        <Metric label="Open prospects" value={openCount} />
        <Metric label="Follow-ups scheduled" value={scheduledCount} tone={scheduledCount ? "amber" : "slate"} />
        <Metric label="Outreach approved" value={approvedCount} tone="blue" />
      </div>

      {error ? (
        <div className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm leading-6 text-rose-900">
          {error}
        </div>
      ) : null}

      <section className="mt-6 rounded-2xl border border-blue-200 bg-blue-50 p-5">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-700">
          Launch boundary
        </p>
        <h2 className="mt-2 text-xl font-bold text-slate-950">
          Research first. Human approval before contact.
        </h2>
        <p className="mt-2 text-sm leading-6 text-slate-700">
          Adding a prospect does not send email, text, social messages, or calls.
          Outreach is locked until a destination is verified, suppression is
          checked, and Manny approves the specific channel.
        </p>
      </section>

      <HunterSearch />

      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-700">
              HUNTER intake
            </p>
            <h2 className="mt-2 text-2xl font-bold text-slate-950">
              Add a researched prospect
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
              Start with facts you verified on the business&apos;s own public site,
              a referral, or another permitted source. Save the source so we can
              always explain where the record came from.
            </p>
          </div>
          <span className="w-fit rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-amber-800">
            No auto-send
          </span>
        </div>

        <form action={createSalesProspect} className="mt-5 grid gap-4 sm:grid-cols-2">
          <Field label="Business name" name="businessName" required />
          <Field label="Industry" name="industry" placeholder="HVAC, plumbing, electrical..." />
          <Field label="City" name="city" />
          <Field label="State / region" name="region" placeholder="TX" />
          <Field label="Business website" name="website" placeholder="example.com" type="text" />
          <Field label="Public source URL" name="sourceUrl" placeholder="https://example.com/contact" type="url" />
          <Field label="Contact name (if public)" name="contactName" />
          <Field label="Business email (if public)" name="contactEmail" type="email" />
          <Field label="Business phone (if public)" name="contactPhone" type="tel" />
          <Field label="Social profile or handle" name="socialMedia" />
          <label className="sm:col-span-2">
            <span className="text-sm font-medium text-slate-700">Contact basis</span>
            <select
              className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-950"
              defaultValue="public_business_contact"
              name="contactBasis"
            >
              <option value="public_business_contact">Public business contact</option>
              <option value="referral">Referral</option>
              <option value="prior_relationship">Prior relationship</option>
              <option value="inbound_consent">Inbound consent</option>
              <option value="customer">Current customer</option>
              <option value="unknown">Not verified yet</option>
            </select>
          </label>
          <button
            className="rounded-full bg-blue-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-800 sm:col-span-2"
            type="submit"
          >
            Add to HUNTER research queue
          </button>
        </form>
      </section>

      <section className="mt-6">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-700">
              DAVID pipeline
            </p>
            <h2 className="mt-2 text-2xl font-bold text-slate-950">Prospects and next actions</h2>
          </div>
          <span className="text-sm text-slate-500">{prospects.data.length} total</span>
        </div>

        {prospects.setupRequired ? (
          <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-900">
            Apply migration <code>20260715100000_atlas_sales_crm.sql</code> in
            Supabase before using Sales Command.
          </div>
        ) : null}

        {!prospects.setupRequired && prospects.data.length === 0 ? (
          <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-5 text-sm leading-6 text-slate-600">
            The pipeline is empty. Add the first researched business above; new
            website assessments will also enter this CRM automatically.
          </div>
        ) : null}

        <div className="mt-4 space-y-3">
          {prospects.data.map((prospect) => (
            <Link
              className="block rounded-2xl border border-slate-200 bg-white p-5 transition hover:border-blue-300 hover:shadow-sm"
              href={`/lions-den/sales/${prospect.id}`}
              key={prospect.id}
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-lg font-semibold text-slate-950">{prospect.businessName}</h3>
                    <StageBadge status={prospect.status} />
                  </div>
                  <p className="mt-1 text-sm text-slate-600">
                    {prospect.industry ?? "Industry not set"}
                    {prospect.city ? ` · ${prospect.city}${prospect.region ? `, ${prospect.region}` : ""}` : ""}
                  </p>
                  <p className="mt-2 text-sm text-slate-700">
                    Next: {prospect.nextAction ?? "Research and choose the next step"}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {prospect.nextActionAt
                      ? formatDateTime(prospect.nextActionAt)
                      : "No due date"}
                  </p>
                </div>
                <div className="text-left sm:text-right">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-blue-700">
                    Owner
                  </p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">
                    {prospect.assignedRole.toUpperCase()}
                  </p>
                  <p className="mt-2 text-xs text-slate-500">
                    Fit {prospect.fitScore ?? "—"}/100
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <div className="mt-6">
        <Link
          className="inline-flex rounded-full border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          href="/lions-den"
        >
          Back to the Lion&apos;s Den
        </Link>
      </div>
    </SurfaceShell>
  );
}

function Metric({ label, value, tone = "slate" }: { label: string; value: number; tone?: "slate" | "blue" | "amber" }) {
  const tones = {
    slate: "border-slate-200 bg-slate-50 text-slate-950",
    blue: "border-blue-200 bg-blue-50 text-blue-950",
    amber: "border-amber-200 bg-amber-50 text-amber-950",
  };
  return (
    <div className={`rounded-2xl border p-4 ${tones[tone]}`}>
      <p className="text-3xl font-bold">{value}</p>
      <p className="mt-1 text-xs font-semibold uppercase tracking-[0.12em] opacity-70">{label}</p>
    </div>
  );
}

function Field({ label, name, placeholder, required, type = "text" }: { label: string; name: string; placeholder?: string; required?: boolean; type?: string }) {
  return (
    <label>
      <span className="text-sm font-medium text-slate-700">{label}</span>
      <input
        className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
        name={name}
        placeholder={placeholder}
        required={required}
        type={type}
      />
    </label>
  );
}

function StageBadge({ status }: { status: SalesProspectStatus }) {
  const warm = ["new", "researching", "review_ready"].includes(status);
  return (
    <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.1em] ${warm ? "bg-amber-100 text-amber-800" : "bg-blue-100 text-blue-800"}`}>
      {humanize(status)}
    </span>
  );
}

function humanize(value: string) {
  const words = value.replaceAll("_", " ");
  return words.charAt(0).toUpperCase() + words.slice(1);
}
