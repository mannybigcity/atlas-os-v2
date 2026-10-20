import type { BookkeepingCategory } from "./categories";

export type CsvTransaction = {
  occurredAt: string;
  category: BookkeepingCategory | string;
  recordType: string;
  stripeType: string;
  description: string;
  customerName: string;
  customerEmail: string;
  invoiceId: string;
  amountMinor: number;
  feeMinor: number;
  netMinor: number;
  currency: string;
  stripeObjectId: string;
  countsInCashTotals: boolean;
};

export type CashTotals = {
  salesMinor: number;
  refundsMinor: number;
  feesMinor: number;
  payoutsMinor: number;
  netMinor: number;
  rowCount: number;
};

const CSV_HEADERS = [
  "occurred_at",
  "category",
  "record_type",
  "stripe_type",
  "description",
  "customer_name",
  "customer_email",
  "invoice_id",
  "amount",
  "fee",
  "net",
  "currency",
  "stripe_id",
] as const;

export function transactionsToCsv(rows: CsvTransaction[]) {
  const lines = [CSV_HEADERS.join(",")];

  for (const row of rows) {
    lines.push(
      [
        row.occurredAt,
        row.category,
        row.recordType,
        row.stripeType,
        row.description,
        row.customerName,
        row.customerEmail,
        row.invoiceId,
        formatMoney(row.amountMinor, row.currency),
        formatMoney(row.feeMinor, row.currency),
        formatMoney(row.netMinor, row.currency),
        row.currency,
        row.stripeObjectId,
      ]
        .map(escapeCsv)
        .join(","),
    );
  }

  return `${lines.join("\n")}\n`;
}

export function summarizeCash(rows: CsvTransaction[]): CashTotals {
  const totals: CashTotals = {
    salesMinor: 0,
    refundsMinor: 0,
    feesMinor: 0,
    payoutsMinor: 0,
    netMinor: 0,
    rowCount: 0,
  };

  for (const row of rows) {
    if (!row.countsInCashTotals) {
      continue;
    }

    totals.rowCount += 1;
    totals.netMinor += row.netMinor;

    if (row.category === "sales") {
      totals.salesMinor += row.amountMinor;
    } else if (row.category === "refunds") {
      totals.refundsMinor += row.amountMinor;
    } else if (row.category === "payouts") {
      totals.payoutsMinor += row.amountMinor;
    }

    if (row.category === "fees") {
      totals.feesMinor += row.amountMinor;
    } else {
      totals.feesMinor += row.feeMinor;
    }
  }

  return totals;
}

export function formatMoney(amountMinor: number, currency: string) {
  const code = /^[A-Z]{3}$/.test(currency) ? currency : "USD";

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: code,
  }).format(amountMinor / 100);
}

function escapeCsv(value: string) {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replaceAll('"', '""')}"`;
  }

  return value;
}
