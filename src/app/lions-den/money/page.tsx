import type { Metadata } from "next";
import { SurfaceShell } from "@/components/surface-shell";
import { getSiteLanguage } from "@/lib/site-language-server";
import type { SiteLanguage } from "@/lib/site-language";
import { requireSuperAdmin } from "@/server/auth/guards";
import {
  getAtlasMoneySnapshot,
  type AtlasMoneySnapshot,
  type StripeDataSection,
  type StripeInvoiceSummary,
  type StripePaymentSummary,
  type StripeSubscriptionSummary,
} from "@/server/stripe/queries";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Money | Atlas For Entrepreneurs",
  robots: { index: false, follow: false },
};

type MoneyPageProps = {
  searchParams?: Promise<{ lang?: string | string[] }>;
};

const copy = {
  en: {
    eyebrow: "Atlas Billing Operations",
    title: "Money",
    description:
      "A secure, read-only view of Atlas billing health. Values come directly from Atlas's own Stripe account and never include client-connected accounts.",
    readOnly: "Read only",
    setupBadge: "Setup required",
    setupTitle: "Connect Atlas billing safely",
    setupBody:
      "Add a server-only restricted Stripe API key to the deployment environment as STRIPE_SECRET_KEY. Grant read access to Balance, PaymentIntents, Subscriptions, and Invoices, then redeploy.",
    setupBoundary:
      "No secret is stored in the browser, source code, or database. This page never creates, refunds, cancels, or transfers money.",
    liveMode: "Live Stripe data",
    testMode: "Test Stripe data",
    unknownMode: "Stripe mode unverified",
    updated: "Updated",
    available: "Available",
    unavailable: "Unavailable",
    balance: "Account balance",
    balanceDescription:
      "Available and pending balances by settlement currency. Different currencies are never combined.",
    availableBalance: "Available",
    pendingBalance: "Pending",
    noBalance: "Stripe returned no balance entries for this account.",
    payments: "Recent payments",
    paymentsDescription: "The eight most recent payment intents.",
    subscriptions: "Recent subscriptions",
    subscriptionsDescription: "The eight most recently created subscriptions.",
    invoices: "Recent invoices",
    invoicesDescription: "The eight most recently created invoices.",
    noPayments: "No payment intents are available in this Stripe mode.",
    noSubscriptions: "No subscriptions are available in this Stripe mode.",
    noInvoices: "No invoices are available in this Stripe mode.",
    unavailableBody:
      "Stripe could not provide this section. Verify the restricted key's read permissions and try again.",
    id: "Stripe ID",
    amount: "Amount",
    total: "Total",
    paid: "Paid",
    status: "Status",
    created: "Created",
    billingAnchor: "Billing anchor",
  },
  es: {
    eyebrow: "Operaciones de facturación de Atlas",
    title: "Dinero",
    description:
      "Una vista segura y de solo lectura de la salud de facturación de Atlas. Los valores provienen directamente de la cuenta propia de Stripe de Atlas y nunca incluyen cuentas conectadas de clientes.",
    readOnly: "Solo lectura",
    setupBadge: "Configuración requerida",
    setupTitle: "Conecta la facturación de Atlas de forma segura",
    setupBody:
      "Agrega una clave restringida de Stripe solo para servidor al entorno de implementación como STRIPE_SECRET_KEY. Otorga acceso de lectura a Balance, PaymentIntents, Subscriptions e Invoices y luego vuelve a implementar.",
    setupBoundary:
      "Ningún secreto se guarda en el navegador, el código fuente ni la base de datos. Esta página nunca crea, reembolsa, cancela ni transfiere dinero.",
    liveMode: "Datos reales de Stripe",
    testMode: "Datos de prueba de Stripe",
    unknownMode: "Modo de Stripe sin verificar",
    updated: "Actualizado",
    available: "Disponible",
    unavailable: "No disponible",
    balance: "Saldo de la cuenta",
    balanceDescription:
      "Saldos disponibles y pendientes por moneda de liquidación. Las monedas diferentes nunca se combinan.",
    availableBalance: "Disponible",
    pendingBalance: "Pendiente",
    noBalance: "Stripe no devolvió saldos para esta cuenta.",
    payments: "Pagos recientes",
    paymentsDescription: "Los ocho intentos de pago más recientes.",
    subscriptions: "Suscripciones recientes",
    subscriptionsDescription: "Las ocho suscripciones creadas más recientemente.",
    invoices: "Facturas recientes",
    invoicesDescription: "Las ocho facturas creadas más recientemente.",
    noPayments: "No hay intentos de pago disponibles en este modo de Stripe.",
    noSubscriptions: "No hay suscripciones disponibles en este modo de Stripe.",
    noInvoices: "No hay facturas disponibles en este modo de Stripe.",
    unavailableBody:
      "Stripe no pudo proporcionar esta sección. Verifica los permisos de lectura de la clave restringida e inténtalo de nuevo.",
    id: "ID de Stripe",
    amount: "Monto",
    total: "Total",
    paid: "Pagado",
    status: "Estado",
    created: "Creada",
    billingAnchor: "Inicio del ciclo",
  },
} as const;

export default async function MoneyPage({ searchParams }: MoneyPageProps) {
  await requireSuperAdmin("/lions-den/money");

  const params = await searchParams;
  const requestedLanguage = Array.isArray(params?.lang)
    ? params.lang[0]
    : params?.lang;
  const [language, snapshot] = await Promise.all([
    getSiteLanguage(requestedLanguage),
    getAtlasMoneySnapshot(),
  ]);
  const text = copy[language];

  return (
    <SurfaceShell
      description={text.description}
      eyebrow={text.eyebrow}
      title={text.title}
    >
      {!snapshot.configured ? (
        <SetupState language={language} />
      ) : (
        <MoneyDashboard language={language} snapshot={snapshot} />
      )}
    </SurfaceShell>
  );
}

function SetupState({ language }: { language: SiteLanguage }) {
  const text = copy[language];

  return (
    <section className="overflow-hidden rounded-3xl border border-amber-200 bg-gradient-to-br from-amber-50 via-white to-blue-50 shadow-sm">
      <div className="border-b border-amber-100 px-5 py-4 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold uppercase tracking-[0.14em] text-amber-900">
            {text.setupBadge}
          </span>
          <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700">
            {text.readOnly}
          </span>
        </div>
      </div>
      <div className="grid gap-6 p-5 sm:p-6 lg:grid-cols-[1.35fr_0.65fr] lg:items-start">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-950">
            {text.setupTitle}
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-700">
            {text.setupBody}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-slate-950 p-4 text-sm text-slate-100 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-blue-300">
            Server environment
          </p>
          <code className="mt-3 block break-all font-mono text-sm text-white">
            STRIPE_SECRET_KEY
          </code>
        </div>
      </div>
      <div className="border-t border-slate-200 bg-white/80 px-5 py-4 text-sm leading-6 text-slate-600 sm:px-6">
        {text.setupBoundary}
      </div>
    </section>
  );
}

function MoneyDashboard({
  language,
  snapshot,
}: {
  language: SiteLanguage;
  snapshot: Extract<AtlasMoneySnapshot, { configured: true }>;
}) {
  const text = copy[language];
  const modeLabel =
    snapshot.mode === "live"
      ? text.liveMode
      : snapshot.mode === "test"
        ? text.testMode
        : text.unknownMode;

  return (
    <div className="space-y-5">
      <section className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-950 px-5 py-4 text-white shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <span
            className={`rounded-full px-3 py-1 text-xs font-bold uppercase tracking-[0.14em] ${
              snapshot.mode === "live"
                ? "bg-emerald-400/20 text-emerald-200"
                : snapshot.mode === "test"
                  ? "bg-blue-400/20 text-blue-200"
                  : "bg-amber-400/20 text-amber-200"
            }`}
          >
            {modeLabel}
          </span>
          <span className="rounded-full border border-white/15 px-3 py-1 text-xs font-semibold text-slate-200">
            {text.readOnly}
          </span>
        </div>
        <p className="text-xs text-slate-300">
          {text.updated}{" "}
          <time dateTime={snapshot.fetchedAt}>
            {formatDateTime(snapshot.fetchedAt, language)}
          </time>
        </p>
      </section>

      <DataCard
        description={text.balanceDescription}
        language={language}
        section={snapshot.balance}
        title={text.balance}
      >
        {(balance) => {
          const entries = [
            ...balance.available.map((entry) => ({
              ...entry,
              label: text.availableBalance,
              tone: "emerald" as const,
            })),
            ...balance.pending.map((entry) => ({
              ...entry,
              label: text.pendingBalance,
              tone: "amber" as const,
            })),
          ];

          if (entries.length === 0) {
            return <EmptyState>{text.noBalance}</EmptyState>;
          }

          return (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {entries.map((entry, index) => (
                <div
                  className={`rounded-2xl border p-4 ${
                    entry.tone === "emerald"
                      ? "border-emerald-200 bg-emerald-50"
                      : "border-amber-200 bg-amber-50"
                  }`}
                  key={`${entry.label}-${entry.currency}-${index}`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-600">
                      {entry.label}
                    </p>
                    <span className="rounded-full bg-white/80 px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.1em] text-slate-700">
                      {entry.currency}
                    </span>
                  </div>
                  <p className="mt-3 text-2xl font-bold tracking-tight text-slate-950">
                    {formatMoney(entry.amount, entry.currency, language)}
                  </p>
                </div>
              ))}
            </div>
          );
        }}
      </DataCard>

      <div className="grid gap-5 xl:grid-cols-2">
        <DataCard
          description={text.paymentsDescription}
          language={language}
          section={snapshot.payments}
          title={text.payments}
        >
          {(payments) => (
            <PaymentTable language={language} payments={payments} />
          )}
        </DataCard>

        <DataCard
          description={text.subscriptionsDescription}
          language={language}
          section={snapshot.subscriptions}
          title={text.subscriptions}
        >
          {(subscriptions) => (
            <SubscriptionTable
              language={language}
              subscriptions={subscriptions}
            />
          )}
        </DataCard>
      </div>

      <DataCard
        description={text.invoicesDescription}
        language={language}
        section={snapshot.invoices}
        title={text.invoices}
      >
        {(invoices) => (
          <InvoiceTable invoices={invoices} language={language} />
        )}
      </DataCard>
    </div>
  );
}

function DataCard<T>({
  children,
  description,
  language,
  section,
  title,
}: {
  children: (data: T) => React.ReactNode;
  description: string;
  language: SiteLanguage;
  section: StripeDataSection<T>;
  title: string;
}) {
  const text = copy[language];
  const ready = section.status === "ready";

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-950">
            {title}
          </h2>
          <p className="mt-1 text-sm leading-6 text-slate-600">{description}</p>
        </div>
        <span
          className={`w-fit shrink-0 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-[0.12em] ${
            ready
              ? "bg-emerald-100 text-emerald-800"
              : "bg-rose-100 text-rose-800"
          }`}
        >
          {ready ? text.available : text.unavailable}
        </span>
      </div>
      <div className="mt-5">
        {ready ? (
          children(section.data)
        ) : (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm leading-6 text-rose-900">
            {text.unavailableBody}
          </div>
        )}
      </div>
    </section>
  );
}

function PaymentTable({
  language,
  payments,
}: {
  language: SiteLanguage;
  payments: StripePaymentSummary[];
}) {
  const text = copy[language];

  if (payments.length === 0) {
    return <EmptyState>{text.noPayments}</EmptyState>;
  }

  return (
    <TableFrame>
      <table className="w-full min-w-[560px] text-left text-sm">
        <thead className="text-xs uppercase tracking-[0.1em] text-slate-500">
          <tr>
            <TableHeader>{text.id}</TableHeader>
            <TableHeader>{text.amount}</TableHeader>
            <TableHeader>{text.status}</TableHeader>
            <TableHeader>{text.created}</TableHeader>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {payments.map((payment) => (
            <tr key={payment.id}>
              <TableCell mono>{payment.id}</TableCell>
              <TableCell>
                {formatMoney(payment.amount, payment.currency, language)}
              </TableCell>
              <TableCell>
                <StatusBadge status={payment.status} language={language} />
              </TableCell>
              <TableCell>{formatDate(payment.createdAt, language)}</TableCell>
            </tr>
          ))}
        </tbody>
      </table>
    </TableFrame>
  );
}

function SubscriptionTable({
  language,
  subscriptions,
}: {
  language: SiteLanguage;
  subscriptions: StripeSubscriptionSummary[];
}) {
  const text = copy[language];

  if (subscriptions.length === 0) {
    return <EmptyState>{text.noSubscriptions}</EmptyState>;
  }

  return (
    <TableFrame>
      <table className="w-full min-w-[560px] text-left text-sm">
        <thead className="text-xs uppercase tracking-[0.1em] text-slate-500">
          <tr>
            <TableHeader>{text.id}</TableHeader>
            <TableHeader>{text.status}</TableHeader>
            <TableHeader>{text.created}</TableHeader>
            <TableHeader>{text.billingAnchor}</TableHeader>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {subscriptions.map((subscription) => (
            <tr key={subscription.id}>
              <TableCell mono>{subscription.id}</TableCell>
              <TableCell>
                <StatusBadge status={subscription.status} language={language} />
              </TableCell>
              <TableCell>{formatDate(subscription.createdAt, language)}</TableCell>
              <TableCell>
                {formatDate(subscription.billingCycleAnchor, language)}
              </TableCell>
            </tr>
          ))}
        </tbody>
      </table>
    </TableFrame>
  );
}

function InvoiceTable({
  invoices,
  language,
}: {
  invoices: StripeInvoiceSummary[];
  language: SiteLanguage;
}) {
  const text = copy[language];

  if (invoices.length === 0) {
    return <EmptyState>{text.noInvoices}</EmptyState>;
  }

  return (
    <TableFrame>
      <table className="w-full min-w-[720px] text-left text-sm">
        <thead className="text-xs uppercase tracking-[0.1em] text-slate-500">
          <tr>
            <TableHeader>{text.id}</TableHeader>
            <TableHeader>{text.total}</TableHeader>
            <TableHeader>{text.paid}</TableHeader>
            <TableHeader>{text.status}</TableHeader>
            <TableHeader>{text.created}</TableHeader>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {invoices.map((invoice) => (
            <tr key={invoice.id}>
              <TableCell mono>{invoice.id}</TableCell>
              <TableCell>
                {formatMoney(invoice.total, invoice.currency, language)}
              </TableCell>
              <TableCell>
                {formatMoney(invoice.amountPaid, invoice.currency, language)}
              </TableCell>
              <TableCell>
                <StatusBadge status={invoice.status} language={language} />
              </TableCell>
              <TableCell>{formatDate(invoice.createdAt, language)}</TableCell>
            </tr>
          ))}
        </tbody>
      </table>
    </TableFrame>
  );
}

function TableFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-200">
      {children}
    </div>
  );
}

function TableHeader({ children }: { children: React.ReactNode }) {
  return (
    <th className="bg-slate-50 px-4 py-3 font-bold" scope="col">
      {children}
    </th>
  );
}

function TableCell({
  children,
  mono = false,
}: {
  children: React.ReactNode;
  mono?: boolean;
}) {
  return (
    <td
      className={`whitespace-nowrap px-4 py-3 text-slate-700 ${mono ? "font-mono text-xs" : ""}`}
    >
      {children}
    </td>
  );
}

function StatusBadge({
  language,
  status,
}: {
  language: SiteLanguage;
  status: string;
}) {
  const positive = ["active", "paid", "succeeded", "trialing"].includes(status);
  const attention = ["open", "past_due", "requires_action", "unpaid"].includes(
    status,
  );

  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.08em] ${
        positive
          ? "bg-emerald-100 text-emerald-800"
          : attention
            ? "bg-amber-100 text-amber-900"
            : "bg-slate-100 text-slate-700"
      }`}
    >
      {translateStatus(status, language)}
    </span>
  );
}

function EmptyState({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm leading-6 text-slate-600">
      {children}
    </div>
  );
}

function formatMoney(
  amountInMinorUnits: number,
  currency: string,
  language: SiteLanguage,
) {
  const formatter = new Intl.NumberFormat(localeFor(language), {
    style: "currency",
    currency: currency.toUpperCase(),
  });
  const fractionDigits =
    formatter.resolvedOptions().maximumFractionDigits ?? 2;

  return formatter.format(amountInMinorUnits / 10 ** fractionDigits);
}

function formatDate(value: string, language: SiteLanguage) {
  return new Intl.DateTimeFormat(localeFor(language), {
    dateStyle: "medium",
  }).format(new Date(value));
}

function formatDateTime(value: string, language: SiteLanguage) {
  return new Intl.DateTimeFormat(localeFor(language), {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function localeFor(language: SiteLanguage) {
  return language === "es" ? "es-US" : "en-US";
}

function translateStatus(status: string, language: SiteLanguage) {
  const english: Record<string, string> = {
    active: "Active",
    canceled: "Canceled",
    draft: "Draft",
    incomplete: "Incomplete",
    incomplete_expired: "Expired",
    open: "Open",
    paid: "Paid",
    past_due: "Past due",
    processing: "Processing",
    requires_action: "Action required",
    requires_capture: "Capture required",
    requires_confirmation: "Confirmation required",
    requires_payment_method: "Payment method required",
    succeeded: "Succeeded",
    trialing: "Trialing",
    uncollectible: "Uncollectible",
    unknown: "Unknown",
    unpaid: "Unpaid",
    void: "Void",
  };
  const spanish: Record<string, string> = {
    active: "Activa",
    canceled: "Cancelada",
    draft: "Borrador",
    incomplete: "Incompleta",
    incomplete_expired: "Vencida",
    open: "Abierta",
    paid: "Pagada",
    past_due: "Vencida",
    processing: "Procesando",
    requires_action: "Requiere acción",
    requires_capture: "Requiere captura",
    requires_confirmation: "Requiere confirmación",
    requires_payment_method: "Requiere método de pago",
    succeeded: "Completado",
    trialing: "En prueba",
    uncollectible: "Incobrable",
    unknown: "Desconocido",
    unpaid: "Sin pagar",
    void: "Anulada",
  };

  return (language === "es" ? spanish : english)[status] ?? humanize(status);
}

function humanize(value: string) {
  const words = value.replaceAll("_", " ");
  return words.charAt(0).toUpperCase() + words.slice(1);
}
