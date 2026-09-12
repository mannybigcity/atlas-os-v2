import Link from "next/link";
import type { DeskClient } from "@/lib/lions-den/desk-clients";
import { sumJobValues } from "@/lib/lions-den/prospect-stages";
import { trialSampleCopy } from "@/lib/lions-den/trial-samples";
import { SampleBadge } from "@/components/lions-den/sample-badge";
import { ProspectContactActions } from "@/components/lions-den/prospect-controls";

type LionsDenClientsBoardProps = {
  customers: DeskClient[];
  setupRequired?: boolean;
  spanish: boolean;
  clientHref?: (customer: DeskClient) => string;
  organizationId?: string;
  fromEmail?: string;
  previewOrgSlug?: string;
  workspaceSlug?: string;
  sisCustomers?: boolean;
};

function formatMoney(value: number | null) {
  if (value == null) return null;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: value % 1 === 0 ? 0 : 2,
  }).format(value);
}

function formatDate(value: string | null) {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function truncateNotes(value: string | null) {
  if (!value) return null;
  const compact = value.replace(/\s+/g, " ").trim();
  if (!compact) return null;
  return compact.length > 120 ? `${compact.slice(0, 117).trimEnd()}…` : compact;
}

export function LionsDenClientsBoard({
  customers,
  setupRequired,
  spanish,
  clientHref,
  organizationId,
  fromEmail,
  previewOrgSlug,
  workspaceSlug,
  sisCustomers,
}: LionsDenClientsBoardProps) {
  const wonTotal = sumJobValues(customers.filter((customer) => !customer.sample));
  return (
    <section className="rounded-[1.6rem] border border-[#d8c27a] bg-white p-5 sm:p-6">
      <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[#f5b932]">
        {spanish ? "Clientes" : "Clients"}
      </p>
      <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-[#071b42]">
        {spanish ? "Clientes en este escritorio" : "Clients on this desk"}
      </h2>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-[#33415c]">
        {spanish
          ? "Haz clic en un cliente para editar, llamar o escribir. Atlas no contacta a nadie hasta que tú lo hagas."
          : "Click a client to edit, call, or email. Atlas does not contact anyone until you do."}
      </p>
      {wonTotal > 0 ? (
        <p className="mt-3 inline-flex items-baseline gap-2 rounded-full bg-[#fff8e6] px-3 py-1 text-sm text-[#071b42]" data-won-total>
          <span className="text-[10px] font-black uppercase tracking-[0.12em] text-[#8a6a12]">
            {spanish ? "Trabajos ganados" : "Jobs won"}
          </span>
          <span className="font-semibold">{formatMoney(wonTotal)}</span>
        </p>
      ) : null}

      {setupRequired ? (
        <p className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 p-5 text-sm leading-6 text-rose-900">
          {spanish
            ? "No pudimos cargar los clientes."
            : "We could not load clients."}
        </p>
      ) : customers.length === 0 ? (
        <p className="mt-5 rounded-2xl border border-dashed border-[#d8c27a] bg-[#fff8e6] p-5 text-sm font-semibold leading-6 text-[#071b42]">
          {spanish ? "Aún no hay clientes." : "No clients yet."}
        </p>
      ) : (
        <div className="mt-5 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-[#ece7d8] text-[10px] font-black uppercase tracking-[0.12em] text-[#5c6578]">
                <th className="py-2 pr-3 font-black">{spanish ? "Nombre" : "Name"}</th>
                <th className="py-2 pr-3 font-black">{spanish ? "Negocio" : "Business"}</th>
                <th className="py-2 pr-3 font-black">Email</th>
                <th className="py-2 pr-3 font-black">{spanish ? "Origen" : "Source"}</th>
                <th className="py-2 pr-3 font-black">{spanish ? "Valor" : "Job value"}</th>
                <th className="py-2 pr-3 font-black">{spanish ? "PayPal" : "PayPal"}</th>
                <th className="py-2 font-black">{spanish ? "Notas" : "Notes"}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#ece7d8]">
              {customers.map((customer) => {
                const invoice = formatMoney(customer.invoiceTotal);
                const payment = formatMoney(customer.paymentTotal);
                const lastDate = formatDate(customer.lastDate);
                const notes = truncateNotes(customer.notes);
                const paypalBits = [
                  lastDate,
                  invoice ? (spanish ? `Facturas ${invoice}` : `Invoices ${invoice}`) : null,
                  payment ? (spanish ? `Pagos ${payment}` : `Paid ${payment}`) : null,
                ].filter(Boolean);

                const href = clientHref?.(customer);
                return (
                  <tr className={href ? "cursor-pointer hover:bg-[#fff8e6]" : undefined} data-client-row key={customer.id}>
                    <td className="py-3 pr-3 align-top">
                      <p className="flex flex-wrap items-center gap-2 font-semibold text-[#071b42]">
                        {href ? (
                          <Link className="cursor-pointer underline decoration-[#d8c27a] underline-offset-2 hover:text-[#1246a0]" href={href}>
                            {customer.displayName}
                          </Link>
                        ) : (
                          <span>{customer.displayName}</span>
                        )}
                        {customer.sample ? <SampleBadge label={trialSampleCopy(spanish).badge} /> : null}
                      </p>
                      {customer.contactName ? (
                        <p className="mt-0.5 text-[11px] text-[#5c6578]">{customer.contactName}</p>
                      ) : null}
                      {customer.phone ? (
                        <p className="mt-0.5 text-[11px] text-[#5c6578]">{customer.phone}</p>
                      ) : null}
                      {organizationId && href ? (
                        <div className="relative z-10 mt-2">
                          <ProspectContactActions
                            compact
                            compose={{
                              customerId: sisCustomers ? customer.id : undefined,
                              detailHref: href,
                              fromEmail: fromEmail ?? "",
                              opportunityId: sisCustomers ? undefined : customer.id,
                              organizationId,
                              previewOrgSlug,
                              returnTo: `/client/clients/${customer.id}`,
                              workspaceSlug,
                            }}
                            prospect={{
                              name: customer.displayName,
                              contactEmail: customer.email,
                              contactPhone: customer.phone,
                              contactSocial: null,
                              metadata: {},
                            }}
                            spanish={spanish}
                          />
                        </div>
                      ) : null}
                    </td>
                    <td className="py-3 pr-3 align-top text-[#33415c]">{customer.businessName || "—"}</td>
                    <td className="py-3 pr-3 align-top text-[#33415c]">{customer.email || "—"}</td>
                    <td className="py-3 pr-3 align-top text-[#33415c]">{customer.sourceLabel || "—"}</td>
                    <td className="py-3 pr-3 align-top font-semibold text-[#071b42]">{formatMoney(customer.jobValue ?? null) || "—"}</td>
                    <td className="py-3 pr-3 align-top text-[#33415c]">
                      {paypalBits.length > 0 ? paypalBits.join(" · ") : "—"}
                    </td>
                    <td className="py-3 align-top text-[#5c6578]">{notes || "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
