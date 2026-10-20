import Link from "next/link";
import {
  beginStripeConnect,
  deleteCategoryRule,
  disconnectStripeBookkeeping,
  saveCategoryRule,
  setCategoryRuleEnabled,
  syncStripeBookkeepingNow,
} from "@/server/stripe-bookkeeping/actions";
import { BOOKKEEPING_CATEGORIES } from "@/server/stripe-bookkeeping/categories";
import { RECORD_KEEPING_DISCLAIMER, STRIPE_BOOKKEEPING_SUMMARY } from "@/server/stripe-bookkeeping/compliance";
import { formatMoney, summarizeCash, type CsvTransaction } from "@/server/stripe-bookkeeping/csv";
import type { BookkeepingFilters, BookkeepingRuleView, BookkeepingView } from "@/server/stripe-bookkeeping/queries";

type BookkeepingDeskProps = {
  enabled: boolean;
  canManage: boolean;
  previewMode: boolean;
  filters: BookkeepingFilters;
  view: BookkeepingView | null;
  notice: string | null;
  exportHref: string;
  previewOrgSlug?: string;
};

export function BookkeepingDesk({
  enabled,
  canManage,
  previewMode,
  filters,
  view,
  notice,
  exportHref,
  previewOrgSlug,
}: BookkeepingDeskProps) {
  const totals = summarizeCash(view?.transactions ?? []);
  const currency = view?.transactions.find((row) => row.currency)?.currency ?? "USD";

  return (
    <div className="space-y-5">
      <section className="rounded-3xl border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-950">
        <p className="font-semibold">{RECORD_KEEPING_DISCLAIMER}</p>
        <p className="mt-2">{STRIPE_BOOKKEEPING_SUMMARY}</p>
        <p className="mt-2">
          Disconnect deletes this workspace&apos;s copied Stripe records. Atlas stores charges,
          refunds, fees, payouts, invoices, and the customer name and email already on those
          records. OAuth tokens stay encrypted on the server.
        </p>
      </section>

      {notice ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm leading-6 text-slate-700">
          {notice}
        </div>
      ) : null}

      {!enabled ? (
        <section className="rounded-3xl border border-dashed border-slate-300 bg-white p-6">
          <h2 className="text-xl font-semibold text-slate-950">Stripe bookkeeping is off</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
            This workspace can connect a Stripe account only after the owner turns on
            STRIPE_BOOKKEEPING_ENABLED and supplies the Atlas Stripe App credentials.
            No Stripe data is read while the switch is off.
          </p>
        </section>
      ) : null}

      {enabled && view?.setupRequired ? (
        <section className="rounded-3xl border border-rose-200 bg-rose-50 p-6 text-sm leading-6 text-rose-950">
          Bookkeeping storage is not ready yet. Apply the Stripe bookkeeping migration before connecting an account.
        </section>
      ) : null}

      {enabled && view && !view.setupRequired && !view.connection ? (
        <section className="rounded-3xl border border-slate-200 bg-white p-6">
          <h2 className="text-xl font-semibold text-slate-950">Connect Stripe, read only</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
            You will approve read access in Stripe. Atlas copies the ledger into this workspace
            and does not create charges, refunds, or payouts.
          </p>
          {canManage ? (
            <form action={beginStripeConnect} className="mt-5">
              <button className="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white" type="submit">
                Connect Stripe
              </button>
            </form>
          ) : (
            <p className="mt-4 text-sm text-slate-500">
              {previewMode
                ? "Viewer mode cannot connect a Stripe account."
                : "A workspace owner or admin connects Stripe."}
            </p>
          )}
        </section>
      ) : null}

      {enabled && view?.connection ? (
        <>
          <section className="rounded-3xl border border-slate-200 bg-white p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.16em] text-[#5672f0]">
                  {view.connection.livemode ? "Live Stripe account" : "Test Stripe account"}
                </p>
                <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
                  {view.connection.stripeAccountId}
                </h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  History window: {view.connection.backfillMonths} months.
                  Balance backfill {view.connection.balanceBackfillComplete ? "finished" : "still running"}.
                  Invoice backfill {view.connection.invoiceBackfillComplete ? "finished" : "still running"}.
                  {view.connection.lastSyncedAt
                    ? ` Last sync ${new Date(view.connection.lastSyncedAt).toLocaleString("en-US")}.`
                    : " Waiting for the first sync."}
                </p>
                {view.connection.lastSyncError ? (
                  <p className="mt-2 text-sm text-rose-700">{view.connection.lastSyncError}</p>
                ) : null}
              </div>
              {canManage ? (
                <div className="flex flex-col gap-3">
                  <form action={syncStripeBookkeepingNow}>
                    <button className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-800" type="submit">
                      Sync now
                    </button>
                  </form>
                  <form action={disconnectStripeBookkeeping} className="space-y-2">
                    <label className="flex items-start gap-2 text-sm text-slate-700">
                      <input className="mt-1" name="confirm" required type="checkbox" value="delete" />
                      <span>Delete this workspace&apos;s Stripe records and disconnect.</span>
                    </label>
                    <button className="rounded-full bg-rose-700 px-4 py-2 text-sm font-semibold text-white" type="submit">
                      Disconnect and delete
                    </button>
                  </form>
                </div>
              ) : null}
            </div>
          </section>

          <form className="grid gap-3 rounded-3xl border border-slate-200 bg-white p-5 md:grid-cols-4" method="get">
            {previewOrgSlug ? <input name="previewOrg" type="hidden" value={previewOrgSlug} /> : null}
            <label className="text-sm font-semibold text-slate-700">
              From
              <input className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 font-normal" defaultValue={filters.from} name="from" type="date" />
            </label>
            <label className="text-sm font-semibold text-slate-700">
              To
              <input className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 font-normal" defaultValue={filters.to} name="to" type="date" />
            </label>
            <label className="text-sm font-semibold text-slate-700">
              Category
              <select className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 font-normal" defaultValue={filters.category} name="category">
                <option value="all">All</option>
                {BOOKKEEPING_CATEGORIES.map((category) => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </label>
            <div className="flex items-end gap-2">
              <button className="rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white" type="submit">
                Filter
              </button>
              <Link className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-800" href={exportHref}>
                Export CSV
              </Link>
            </div>
          </form>

          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <Total label="Sales" value={formatMoney(totals.salesMinor, currency)} />
            <Total label="Refunds" value={formatMoney(totals.refundsMinor, currency)} />
            <Total label="Fees" value={formatMoney(totals.feesMinor, currency)} />
            <Total label="Payouts" value={formatMoney(totals.payoutsMinor, currency)} />
            <Total label="Net" value={formatMoney(totals.netMinor, currency)} />
          </section>
          <p className="text-sm leading-6 text-slate-500">
            Totals use balance transactions in this filter. Refunds, fees, and payouts are usually negative, matching Stripe. Invoices are listed and are not added into these cash totals.
            {view.truncated ? " This view stopped at 2,000 rows. Narrow the dates for the rest." : ""}
          </p>

          <div className="overflow-x-auto rounded-3xl border border-slate-200 bg-white">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Description</th>
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3">Amount</th>
                  <th className="px-4 py-3">Fee</th>
                  <th className="px-4 py-3">Net</th>
                </tr>
              </thead>
              <tbody>
                {view.transactions.slice(0, 100).map((row) => (
                  <TransactionRow key={row.stripeObjectId} row={row} />
                ))}
                {view.transactions.length === 0 ? (
                  <tr>
                    <td className="px-4 py-6 text-slate-500" colSpan={8}>
                      No Stripe records in this filter yet.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>

          <section className="rounded-3xl border border-slate-200 bg-white p-6">
            <h2 className="text-xl font-semibold text-slate-950">Category rules</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Defaults cover sales, refunds, fees, and payouts. The lowest priority number wins. You can turn a rule off or add your own.
            </p>
            <ul className="mt-4 space-y-3">
              {view.rules.map((rule) => (
                <RuleRow canManage={canManage} key={rule.id} rule={rule} />
              ))}
            </ul>
            {canManage ? (
              <form action={saveCategoryRule} className="mt-5 grid gap-3 md:grid-cols-5">
                <select className="rounded-xl border border-slate-300 px-3 py-2 text-sm" name="matchField">
                  <option value="stripe_type">Stripe type</option>
                  <option value="description">Description</option>
                  <option value="record_type">Record type</option>
                </select>
                <select className="rounded-xl border border-slate-300 px-3 py-2 text-sm" name="matchOperator">
                  <option value="equals">equals</option>
                  <option value="contains">contains</option>
                </select>
                <input className="rounded-xl border border-slate-300 px-3 py-2 text-sm" maxLength={200} name="matchValue" placeholder="charge" required />
                <select className="rounded-xl border border-slate-300 px-3 py-2 text-sm" name="category">
                  {BOOKKEEPING_CATEGORIES.map((category) => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
                <div className="flex gap-2">
                  <input className="w-20 rounded-xl border border-slate-300 px-3 py-2 text-sm" defaultValue={5} max={1000} min={1} name="priority" type="number" />
                  <button className="rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white" type="submit">
                    Add rule
                  </button>
                </div>
              </form>
            ) : null}
          </section>
        </>
      ) : null}
    </div>
  );
}

function Total({ label, value }: { label: string; value: string }) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-4">
      <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">{label}</p>
      <p className="mt-2 text-xl font-semibold text-slate-950">{value}</p>
    </article>
  );
}

function TransactionRow({ row }: { row: CsvTransaction }) {
  return (
    <tr className="border-b border-slate-100">
      <td className="px-4 py-3 whitespace-nowrap">{new Date(row.occurredAt).toLocaleDateString("en-US")}</td>
      <td className="px-4 py-3">{row.category}</td>
      <td className="px-4 py-3">{row.recordType}</td>
      <td className="px-4 py-3">{row.description || row.stripeType}</td>
      <td className="px-4 py-3">{row.customerName || row.customerEmail}</td>
      <td className="px-4 py-3 whitespace-nowrap">{formatMoney(row.amountMinor, row.currency)}</td>
      <td className="px-4 py-3 whitespace-nowrap">{formatMoney(row.feeMinor, row.currency)}</td>
      <td className="px-4 py-3 whitespace-nowrap">{formatMoney(row.netMinor, row.currency)}</td>
    </tr>
  );
}

function RuleRow({ canManage, rule }: { canManage: boolean; rule: BookkeepingRuleView }) {
  return (
    <li className="flex flex-col gap-2 rounded-2xl border border-slate-200 px-4 py-3 text-sm md:flex-row md:items-center md:justify-between">
      <p>
        <span className="font-semibold">{rule.priority}.</span> {rule.matchField} {rule.matchOperator} &ldquo;{rule.matchValue}&rdquo; → {rule.category}
        {rule.isDefault ? " · default" : ""}
        {rule.enabled ? "" : " · off"}
      </p>
      {canManage ? (
        <div className="flex gap-2">
          <form action={setCategoryRuleEnabled}>
            <input name="id" type="hidden" value={rule.id} />
            <input name="enabled" type="hidden" value={rule.enabled ? "false" : "true"} />
            <button className="rounded-full border border-slate-300 px-3 py-1.5 font-semibold" type="submit">
              {rule.enabled ? "Turn off" : "Turn on"}
            </button>
          </form>
          <form action={deleteCategoryRule}>
            <input name="id" type="hidden" value={rule.id} />
            <button className="rounded-full border border-slate-300 px-3 py-1.5 font-semibold" type="submit">
              Delete
            </button>
          </form>
        </div>
      ) : null}
    </li>
  );
}
