import {
  deskQuoteStatusActions,
  deskQuoteStatusLabel,
  deskQuoteText,
  formatUsd,
  readDeskQuotes,
  type DeskQuote,
} from "@/lib/lions-den/desk-quote";
import { prospectContactLinks } from "@/lib/lions-den/prospect-stages";
import { prospectWhatsAppHref } from "@/lib/lions-den/prospect-places";
import type { OrganizationOpportunity } from "@/server/opportunities/queries";
import { createDeskQuote, saveDeskPayLink, setDeskQuoteStatus } from "@/server/opportunities/desk-quote-actions";

type DeskQuoteCardProps = {
  prospect: Pick<OrganizationOpportunity, "id" | "name" | "contactName" | "contactPhone" | "contactEmail" | "metadata" | "stage">;
  organizationId: string;
  businessName?: string | null;
  payLink?: string | null;
  previewOrgSlug?: string;
  workspaceSlug?: string;
  clientRecord?: boolean;
  returnTo: string;
  /** The quote the owner just wrote (from ?quote=), shown open with its send links. */
  openQuoteId?: string;
  spanish: boolean;
};

const fieldClass =
  "mt-1 block w-full rounded-md border border-[#d5d0c4] bg-white px-3 py-2 text-sm text-[#071b42] placeholder:text-[#8a93a3] focus:border-[#071b42] focus:outline-none";
const pillClass =
  "rounded-full border border-[#d5d0c4] bg-white px-4 py-2 text-sm font-semibold text-[#071b42] transition hover:border-[#071b42]";

function Scope({ organizationId, previewOrgSlug, workspaceSlug, clientRecord, returnTo, spanish, prospectId }: {
  organizationId: string;
  previewOrgSlug?: string;
  workspaceSlug?: string;
  clientRecord?: boolean;
  returnTo: string;
  spanish: boolean;
  prospectId: string;
}) {
  return (
    <>
      <input name="organizationId" type="hidden" value={organizationId} />
      <input name="opportunityId" type="hidden" value={prospectId} />
      <input name="returnTo" type="hidden" value={returnTo} />
      <input name="lang" type="hidden" value={spanish ? "es" : "en"} />
      {previewOrgSlug ? <input name="previewOrg" type="hidden" value={previewOrgSlug} /> : null}
      {workspaceSlug ? <input name="workspace" type="hidden" value={workspaceSlug} /> : null}
      {clientRecord ? <input name="clientRecord" type="hidden" value="1" /> : null}
    </>
  );
}

/**
 * The money step. The owner writes one price; Atlas writes the words and opens
 * his email or WhatsApp with them. Accepting makes the prospect a won client with
 * the job value on the desk. Atlas never sends the quote or touches the money.
 */
export function DeskQuoteCard(props: DeskQuoteCardProps) {
  const { prospect, spanish, payLink, businessName, openQuoteId } = props;
  const quotes = readDeskQuotes(prospect.metadata);
  const highlighted = (openQuoteId && quotes.find((item) => item.id === openQuoteId)) || quotes.find((item) => item.status !== "declined") || null;
  const scope = {
    organizationId: props.organizationId,
    previewOrgSlug: props.previewOrgSlug,
    workspaceSlug: props.workspaceSlug,
    clientRecord: props.clientRecord,
    returnTo: props.returnTo,
    spanish,
    prospectId: prospect.id,
  };
  const phone = prospectContactLinks(prospect).phone;
  const won = prospect.stage === "won";

  return (
    <div className="rounded-2xl border border-[#d8c27a] bg-[#fffdf5] p-4" data-desk-quote>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[#8a6a12]">
          {spanish ? "Cotización" : "Quote"}
        </p>
        {quotes.length > 1 ? (
          <p className="text-xs text-[#5c6578]">
            {spanish ? `${quotes.length} cotizaciones en este registro` : `${quotes.length} quotes on this record`}
          </p>
        ) : null}
      </div>

      {highlighted ? (
        <QuoteRow
          businessName={businessName}
          highlighted
          payLink={payLink}
          phone={phone}
          prospect={prospect}
          quote={highlighted}
          scope={scope}
          spanish={spanish}
          won={won}
        />
      ) : (
        <p className="mt-2 text-sm text-[#33415c]">
          {spanish
            ? "Cuando te pidan precio, escríbelo aquí. Atlas arma el mensaje; tú lo envías."
            : "When they ask for a price, write it here. Atlas writes the message; you send it."}
        </p>
      )}

      {quotes
        .filter((item) => item.id !== highlighted?.id)
        .slice(0, 3)
        .map((quote) => (
          <QuoteRow
            businessName={businessName}
            key={quote.id}
            payLink={payLink}
            phone={phone}
            prospect={prospect}
            quote={quote}
            scope={scope}
            spanish={spanish}
            won={won}
          />
        ))}

      <details className="mt-4 rounded-2xl border border-[#ece7d8] bg-white p-4" data-desk-quote-form>
        <summary className="cursor-pointer text-sm font-semibold text-[#071b42]">
          {quotes.length === 0
            ? spanish
              ? "+ Escribir cotización"
              : "+ Write a quote"
            : spanish
              ? "+ Escribir otra cotización"
              : "+ Write another quote"}
        </summary>
        <form action={createDeskQuote} className="mt-3 grid gap-3 sm:grid-cols-3">
          <Scope {...scope} />
          <label className="block text-xs font-semibold text-[#5c6578] sm:col-span-3">
            {spanish ? "Trabajo" : "The job"} *
            <textarea
              className={fieldClass}
              maxLength={600}
              minLength={3}
              name="description"
              placeholder={
                spanish
                  ? "Ej. Cambio de calentador de 40 galones, retiro del viejo, materiales incluidos."
                  : "e.g. Replace 40-gal water heater, haul away the old one, materials included."
              }
              required
              rows={3}
            />
          </label>
          <label className="block text-xs font-semibold text-[#5c6578]">
            {spanish ? "Precio (USD)" : "Price (USD)"} *
            <input className={fieldClass} inputMode="decimal" name="amount" placeholder="1,850" required type="text" />
          </label>
          <label className="block text-xs font-semibold text-[#5c6578]">
            {spanish ? "Válido por (días)" : "Good for (days)"}
            <input className={fieldClass} defaultValue={14} inputMode="numeric" max={180} min={1} name="validDays" type="number" />
          </label>
          <div className="flex items-end">
            <button className="rounded-full bg-[#071b42] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#0a2a5c]" type="submit">
              {spanish ? "Armar cotización" : "Write the quote"}
            </button>
          </div>
          <p className="text-xs text-[#5c6578] sm:col-span-3">
            {spanish
              ? "Atlas escribe el mensaje y lo deja listo en Correo y WhatsApp. No lo envía ni cobra el dinero."
              : "Atlas writes the message and lines it up in Email and WhatsApp. Atlas does not send it or collect the money."}
          </p>
        </form>

        <form action={saveDeskPayLink} className="mt-4 border-t border-[#ece7d8] pt-4" data-desk-pay-link>
          <Scope {...scope} />
          <label className="block text-xs font-semibold text-[#5c6578]">
            {spanish ? "Cómo te pagan (va en cada cotización)" : "How customers pay you (goes in every quote)"}
            <input
              className={fieldClass}
              defaultValue={payLink ?? ""}
              maxLength={500}
              name="payLink"
              placeholder={spanish ? "Enlace de Square/Stripe, Zelle al 713-555-0100, o “efectivo o cheque el día del trabajo”" : "Square/Stripe link, Zelle to 713-555-0100, or “cash or check on the day”"}
              type="text"
            />
          </label>
          <button className={`${pillClass} mt-2`} type="submit">
            {spanish ? "Guardar forma de pago" : "Save pay link"}
          </button>
        </form>
      </details>
    </div>
  );
}

function QuoteRow({
  quote,
  prospect,
  businessName,
  payLink,
  phone,
  scope,
  spanish,
  highlighted = false,
  won,
}: {
  quote: DeskQuote;
  prospect: DeskQuoteCardProps["prospect"];
  businessName?: string | null;
  payLink?: string | null;
  phone: string | null;
  scope: Parameters<typeof Scope>[0];
  spanish: boolean;
  highlighted?: boolean;
  won: boolean;
}) {
  const text = deskQuoteText({ quote, prospectName: prospect.name, contactName: prospect.contactName, businessName, payLink, spanish });
  const whatsapp = prospectWhatsAppHref(phone, text.body);
  const actions = won ? deskQuoteStatusActions(quote.status, spanish).filter((item) => item.status !== "accepted") : deskQuoteStatusActions(quote.status, spanish);
  const validUntil = new Date(`${quote.validUntil}T12:00:00`);
  return (
    <div className={`mt-3 rounded-2xl p-4 ${highlighted ? "border border-[#d8c27a] bg-white" : "border border-[#ece7d8] bg-white/70"}`} data-desk-quote-row={quote.id}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-lg font-semibold text-[#071b42]">{formatUsd(quote.amountUsd)}</p>
        <span className="rounded-full bg-[#fff8e6] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#071b42]">
          {deskQuoteStatusLabel(quote.status, spanish)}
        </span>
      </div>
      <p className="mt-1 whitespace-pre-line text-sm text-[#33415c]">{quote.description}</p>
      <p className="mt-1 text-xs text-[#5c6578]">
        {spanish ? "Válido hasta " : "Good through "}
        {new Intl.DateTimeFormat(spanish ? "es-US" : "en-US", { month: "short", day: "numeric" }).format(validUntil)}
        {quote.by ? ` · ${quote.by}` : ""}
      </p>
      {highlighted && quote.status !== "declined" && quote.status !== "accepted" ? (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <a
            className="inline-flex items-center rounded-full bg-[#1246a0] px-4 py-2 text-sm font-semibold !text-white transition hover:bg-[#0a2f78]"
            href="#desk-email"
          >
            {spanish ? "Enviar por correo" : "Send by email"}
          </a>
          {whatsapp ? (
            <a
              className="inline-flex items-center rounded-full bg-[#1246a0] px-4 py-2 text-sm font-semibold !text-white transition hover:bg-[#0a2f78]"
              href={whatsapp}
              rel="noreferrer"
              target="_blank"
            >
              {spanish ? "Enviar por WhatsApp" : "Send by WhatsApp"}
            </a>
          ) : null}
          <p className="basis-full text-xs text-[#5c6578]">
            {spanish
              ? "Correo abre la caja de Atlas con la cotización lista. WhatsApp abre tu app. Luego toca “Ya la envié” si fue por WhatsApp."
              : "Email opens the Atlas compose box with the quote filled in. WhatsApp opens your app; tap “I sent it” after."}
          </p>
        </div>
      ) : null}
      {actions.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {actions.map((action) => (
            <form action={setDeskQuoteStatus} key={action.status}>
              <Scope {...scope} />
              <input name="quoteId" type="hidden" value={quote.id} />
              <input name="status" type="hidden" value={action.status} />
              <button
                className={
                  action.status === "accepted"
                    ? "rounded-full bg-[#f5b932] px-4 py-2 text-sm font-semibold text-[#071b42] transition hover:bg-[#ffd266]"
                    : pillClass
                }
                type="submit"
              >
                {action.label}
              </button>
            </form>
          ))}
        </div>
      ) : null}
    </div>
  );
}
