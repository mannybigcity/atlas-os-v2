export type LedgerDraft = {
  stripeObjectId: string;
  recordType: "charge" | "refund" | "fee" | "payout" | "invoice" | "adjustment" | "other";
  stripeType: string;
  description: string;
  amountMinor: number;
  feeMinor: number;
  netMinor: number;
  currency: string;
  customerStripeId: string;
  customerName: string;
  customerEmail: string;
  invoiceId: string;
  status: string;
  occurredAt: string;
  countsInCashTotals: boolean;
  livemode: boolean;
};

type StripeRecord = Record<string, unknown>;

export function mapBalanceTransaction(value: unknown, fallbackLivemode: boolean): LedgerDraft | null {
  const txn = asRecord(value);

  if (!txn || typeof txn.id !== "string") {
    return null;
  }

  const stripeType = typeof txn.type === "string" && txn.type ? txn.type : "other";
  const source = asRecord(txn.source);
  const customer = customerFrom(source);
  const created = unixToIso(txn.created);

  if (!created) {
    return null;
  }

  return {
    stripeObjectId: txn.id,
    recordType: recordTypeForStripeType(stripeType),
    stripeType: stripeType.slice(0, 80),
    description: clip(typeof txn.description === "string" ? txn.description : "", 1000),
    amountMinor: integer(txn.amount),
    feeMinor: integer(txn.fee),
    netMinor: integer(txn.net),
    currency: currencyCode(txn.currency),
    customerStripeId: customer.id,
    customerName: customer.name,
    customerEmail: customer.email,
    invoiceId: invoiceIdFrom(source),
    status: clip(typeof txn.status === "string" ? txn.status : "", 40),
    occurredAt: created,
    countsInCashTotals: true,
    livemode: typeof txn.livemode === "boolean" ? txn.livemode : fallbackLivemode,
  };
}

export function mapInvoice(value: unknown, fallbackLivemode: boolean): LedgerDraft | null {
  const invoice = asRecord(value);

  if (!invoice || typeof invoice.id !== "string" || !invoice.id.startsWith("in_")) {
    return null;
  }

  const created = unixToIso(invoice.created);

  if (!created) {
    return null;
  }

  const customer = customerFrom(invoice);
  const number = typeof invoice.number === "string" ? invoice.number : "";
  const status = typeof invoice.status === "string" ? invoice.status : "";

  return {
    stripeObjectId: invoice.id,
    recordType: "invoice",
    stripeType: "invoice",
    description: clip(number ? `Invoice ${number}` : "Invoice", 1000),
    amountMinor: integer(invoice.total),
    feeMinor: 0,
    netMinor: integer(invoice.amount_paid),
    currency: currencyCode(invoice.currency),
    customerStripeId: customer.id,
    customerName: customer.name,
    customerEmail: customer.email,
    invoiceId: invoice.id,
    status: clip(status, 40),
    occurredAt: created,
    countsInCashTotals: false,
    livemode: typeof invoice.livemode === "boolean" ? invoice.livemode : fallbackLivemode,
  };
}

export function recordTypeForStripeType(stripeType: string): LedgerDraft["recordType"] {
  const type = stripeType.toLowerCase();

  if (type === "charge" || type === "payment") return "charge";
  if (type === "refund" || type === "payment_refund") return "refund";
  if (type.includes("fee")) return "fee";
  if (type.startsWith("payout")) return "payout";
  if (type === "adjustment") return "adjustment";

  return "other";
}

function customerFrom(source: StripeRecord | null) {
  const empty = { id: "", name: "", email: "" };

  if (!source) {
    return empty;
  }

  const billing = asRecord(source.billing_details);
  const customer = source.customer;

  if (customer && typeof customer === "object") {
    const record = asRecord(customer);

    return {
      id: clip(typeof record?.id === "string" ? record.id : "", 255),
      name: clip(stringValue(record?.name) || stringValue(billing?.name) || stringValue(source.customer_name), 200),
      email: clip(stringValue(record?.email) || stringValue(billing?.email) || stringValue(source.customer_email), 320),
    };
  }

  return {
    id: clip(typeof customer === "string" ? customer : "", 255),
    name: clip(stringValue(billing?.name) || stringValue(source.customer_name), 200),
    email: clip(stringValue(billing?.email) || stringValue(source.customer_email), 320),
  };
}

function invoiceIdFrom(source: StripeRecord | null) {
  if (!source) {
    return "";
  }

  if (typeof source.invoice === "string") {
    return clip(source.invoice, 255);
  }

  const invoice = asRecord(source.invoice);
  return clip(typeof invoice?.id === "string" ? invoice.id : "", 255);
}

function asRecord(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  return value as StripeRecord;
}

function integer(value: unknown) {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? Math.trunc(parsed) : 0;
}

function currencyCode(value: unknown) {
  const code = typeof value === "string" ? value.toUpperCase() : "USD";
  return /^[A-Z]{3}$/.test(code) ? code : "USD";
}

function unixToIso(value: unknown) {
  const seconds = typeof value === "number" ? value : Number(value);

  if (!Number.isFinite(seconds) || seconds <= 0) {
    return null;
  }

  return new Date(seconds * 1000).toISOString();
}

function stringValue(value: unknown) {
  return typeof value === "string" ? value : "";
}

function clip(value: string, max: number) {
  return value.trim().slice(0, max);
}
