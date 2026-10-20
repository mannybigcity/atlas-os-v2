import { createClient } from "@/lib/supabase/server";
import {
  isBookkeepingCategory,
  type BookkeepingCategory,
} from "./categories";
import type { CsvTransaction } from "./csv";

export type BookkeepingFilters = {
  from: string;
  to: string;
  category: BookkeepingCategory | "all";
};

export type BookkeepingConnectionView = {
  stripeAccountId: string;
  livemode: boolean;
  status: string;
  backfillMonths: number;
  balanceBackfillComplete: boolean;
  invoiceBackfillComplete: boolean;
  lastSyncedAt: string | null;
  lastSyncError: string | null;
};

export type BookkeepingRuleView = {
  id: string;
  priority: number;
  enabled: boolean;
  matchField: "stripe_type" | "description" | "record_type";
  matchOperator: "equals" | "contains";
  matchValue: string;
  category: BookkeepingCategory;
  isDefault: boolean;
};

export type BookkeepingView = {
  setupRequired: boolean;
  connection: BookkeepingConnectionView | null;
  transactions: CsvTransaction[];
  rules: BookkeepingRuleView[];
  truncated: boolean;
};

const ROW_LIMIT = 2000;

export function parseBookkeepingFilters(params: {
  from?: string;
  to?: string;
  category?: string;
}): BookkeepingFilters {
  const from = isDate(params.from) ? params.from : "";
  const to = isDate(params.to) ? params.to : "";

  return {
    from,
    to: to && from && to < from ? from : to,
    category: params.category && isBookkeepingCategory(params.category) ? params.category : "all",
  };
}

export async function getBookkeepingView(
  organizationId: string,
  filters: BookkeepingFilters,
): Promise<BookkeepingView> {
  const supabase = await createClient();
  const connectionResult = await supabase
    .from("stripe_bookkeeping_connections")
    .select(
      "stripe_account_id, livemode, status, backfill_months, balance_backfill_complete, invoice_backfill_complete, last_synced_at, last_sync_error",
    )
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (connectionResult.error) {
    return emptyView(true);
  }

  const rulesResult = await supabase
    .from("stripe_bookkeeping_category_rules")
    .select("id, priority, enabled, match_field, match_operator, match_value, category, is_default")
    .eq("organization_id", organizationId)
    .order("priority", { ascending: true });
  let transactionQuery = supabase
    .from("stripe_bookkeeping_transactions")
    .select(
      "occurred_at, category, record_type, stripe_type, description, customer_name, customer_email, invoice_id, amount_minor, fee_minor, net_minor, currency, stripe_object_id, counts_in_cash_totals",
    )
    .eq("organization_id", organizationId)
    .order("occurred_at", { ascending: false })
    .limit(ROW_LIMIT);

  if (filters.from) {
    transactionQuery = transactionQuery.gte("occurred_at", `${filters.from}T00:00:00.000Z`);
  }

  if (filters.to) {
    transactionQuery = transactionQuery.lte("occurred_at", `${filters.to}T23:59:59.999Z`);
  }

  if (filters.category !== "all") {
    transactionQuery = transactionQuery.eq("category", filters.category);
  }

  const transactionResult = await transactionQuery;

  if (rulesResult.error || transactionResult.error) {
    return emptyView(true);
  }

  const transactions = ((transactionResult.data ?? []) as TransactionRow[]).map(mapTransaction);
  const connection = connectionResult.data as ConnectionRow | null;

  return {
    setupRequired: false,
    connection: connection
      ? {
          stripeAccountId: connection.stripe_account_id,
          livemode: connection.livemode,
          status: connection.status,
          backfillMonths: connection.backfill_months,
          balanceBackfillComplete: connection.balance_backfill_complete,
          invoiceBackfillComplete: connection.invoice_backfill_complete,
          lastSyncedAt: connection.last_synced_at,
          lastSyncError: connection.last_sync_error,
        }
      : null,
    transactions,
    rules: ((rulesResult.data ?? []) as RuleRow[]).map((rule) => ({
      id: rule.id,
      priority: rule.priority,
      enabled: rule.enabled,
      matchField: rule.match_field,
      matchOperator: rule.match_operator,
      matchValue: rule.match_value,
      category: rule.category,
      isDefault: rule.is_default,
    })),
    truncated: transactions.length >= ROW_LIMIT,
  };
}

function emptyView(setupRequired: boolean): BookkeepingView {
  return {
    setupRequired,
    connection: null,
    transactions: [],
    rules: [],
    truncated: false,
  };
}

function isDate(value: string | undefined): value is string {
  return Boolean(value && /^\d{4}-\d{2}-\d{2}$/.test(value));
}

type ConnectionRow = {
  stripe_account_id: string;
  livemode: boolean;
  status: string;
  backfill_months: number;
  balance_backfill_complete: boolean;
  invoice_backfill_complete: boolean;
  last_synced_at: string | null;
  last_sync_error: string | null;
};

type RuleRow = {
  id: string;
  priority: number;
  enabled: boolean;
  match_field: BookkeepingRuleView["matchField"];
  match_operator: BookkeepingRuleView["matchOperator"];
  match_value: string;
  category: BookkeepingCategory;
  is_default: boolean;
};

type TransactionRow = {
  occurred_at: string;
  category: string;
  record_type: string;
  stripe_type: string;
  description: string;
  customer_name: string;
  customer_email: string;
  invoice_id: string;
  amount_minor: number;
  fee_minor: number;
  net_minor: number;
  currency: string;
  stripe_object_id: string;
  counts_in_cash_totals: boolean;
};

function mapTransaction(row: TransactionRow): CsvTransaction {
  return {
    occurredAt: row.occurred_at,
    category: row.category,
    recordType: row.record_type,
    stripeType: row.stripe_type,
    description: row.description,
    customerName: row.customer_name,
    customerEmail: row.customer_email,
    invoiceId: row.invoice_id,
    amountMinor: Number(row.amount_minor),
    feeMinor: Number(row.fee_minor),
    netMinor: Number(row.net_minor),
    currency: row.currency,
    stripeObjectId: row.stripe_object_id,
    countsInCashTotals: row.counts_in_cash_totals,
  };
}
