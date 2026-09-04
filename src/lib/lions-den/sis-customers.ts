export type SisCustomerPayPalFields = {
  lastDate: string | null;
  invoiceTotal: number | null;
  paymentTotal: number | null;
};

function readOptionalString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function readOptionalNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

export function readSisCustomerPayPalFields(metadata: unknown): SisCustomerPayPalFields {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return { lastDate: null, invoiceTotal: null, paymentTotal: null };
  }

  const record = metadata as Record<string, unknown>;
  return {
    lastDate: readOptionalString(record.last_date),
    invoiceTotal: readOptionalNumber(record.invoice_total),
    paymentTotal: readOptionalNumber(record.payment_total),
  };
}
