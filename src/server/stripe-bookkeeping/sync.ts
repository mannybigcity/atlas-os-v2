import type { SupabaseClient } from "@supabase/supabase-js";
import { categorize, type CategoryRule } from "./categories";
import { secretKeyForMode, type StripeBookkeepingConfig } from "./config";
import { mapBalanceTransaction, mapInvoice, type LedgerDraft } from "./map-entry";
import { refreshStripeAppToken } from "./oauth";
import { pageFromList, stripeGet } from "./stripe-api";
import {
  getSecrets,
  listCategoryRules,
  markBalanceCursor,
  markInvoiceCursor,
  readAccessToken,
  readRefreshToken,
  replaceStoredTokens,
  upsertLedgerDrafts,
  type StoredConnection,
} from "./store";

const PAGE_SIZE = 100;

export async function ensureAccessToken(input: {
  client: SupabaseClient;
  connection: StoredConnection;
  config: StripeBookkeepingConfig;
  fetchImpl?: typeof fetch;
}) {
  const secrets = await getSecrets(input.client, input.connection.id);
  const expiresAt = new Date(secrets.tokenExpiresAt).getTime();

  if (expiresAt - Date.now() > 2 * 60 * 1000) {
    return readAccessToken(secrets, input.config.encryptionKey);
  }

  const refreshed = await refreshStripeAppToken({
    secretKey: secretKeyForMode(input.config, input.connection.livemode),
    refreshToken: readRefreshToken(secrets, input.config.encryptionKey),
    fetchImpl: input.fetchImpl,
  });

  if (refreshed.stripeUserId !== input.connection.stripeAccountId) {
    throw new Error("Stripe refreshed a token for a different account.");
  }

  await replaceStoredTokens(input.client, {
    connectionId: input.connection.id,
    tokens: refreshed,
    encryptionKey: input.config.encryptionKey,
  });

  return refreshed.accessToken;
}

export async function syncConnection(input: {
  client: SupabaseClient;
  connection: StoredConnection;
  accessToken: string;
  maxPages: number;
  fetchImpl?: typeof fetch;
}) {
  const rules = await listCategoryRules(input.client, input.connection.organizationId);
  const activeRules = rules.length > 0 ? rules : [];
  const balance = await syncBalanceTransactions({ ...input, rules: activeRules });
  const invoices = await syncInvoices({ ...input, rules: activeRules });

  return { balance, invoices };
}

async function syncBalanceTransactions(input: {
  client: SupabaseClient;
  connection: StoredConnection;
  accessToken: string;
  rules: CategoryRule[];
  maxPages: number;
  fetchImpl?: typeof fetch;
}) {
  const continuingBackfill = !input.connection.balanceBackfillComplete;
  const createdGte = continuingBackfill
    ? toUnix(input.connection.backfillCreatedGte)
    : overlapUnix(input.connection.lastSyncedAt, input.connection.backfillCreatedGte);
  const result = await pullPages({
    accessToken: input.accessToken,
    path: "/v1/balance_transactions",
    createdGte,
    cursor: input.connection.balanceCursor,
    maxPages: input.maxPages,
    fetchImpl: input.fetchImpl,
    mapRow: (row) => mapBalanceTransaction(row, input.connection.livemode),
    expandSource: true,
  });
  const finishedWindow = result.complete;

  await upsertLedgerDrafts(input.client, {
    organizationId: input.connection.organizationId,
    connectionId: input.connection.id,
    rows: withCategories(result.rows, input.rules),
  });
  await markBalanceCursor(input.client, {
    connectionId: input.connection.id,
    cursor: finishedWindow ? null : result.cursor,
    backfillComplete: continuingBackfill ? finishedWindow : true,
    error: null,
    syncedAt: finishedWindow ? new Date().toISOString() : null,
  });

  return result;
}

async function syncInvoices(input: {
  client: SupabaseClient;
  connection: StoredConnection;
  accessToken: string;
  rules: CategoryRule[];
  maxPages: number;
  fetchImpl?: typeof fetch;
}) {
  const continuingBackfill = !input.connection.invoiceBackfillComplete;
  const createdGte = continuingBackfill
    ? toUnix(input.connection.backfillCreatedGte)
    : overlapUnix(input.connection.lastSyncedAt, input.connection.backfillCreatedGte);
  const result = await pullPages({
    accessToken: input.accessToken,
    path: "/v1/invoices",
    createdGte,
    cursor: input.connection.invoiceCursor,
    maxPages: input.maxPages,
    fetchImpl: input.fetchImpl,
    mapRow: (row) => mapInvoice(row, input.connection.livemode),
    expandSource: false,
  });
  const finishedWindow = result.complete;

  await upsertLedgerDrafts(input.client, {
    organizationId: input.connection.organizationId,
    connectionId: input.connection.id,
    rows: withCategories(result.rows, input.rules),
  });
  await markInvoiceCursor(input.client, {
    connectionId: input.connection.id,
    cursor: finishedWindow ? null : result.cursor,
    backfillComplete: continuingBackfill ? finishedWindow : true,
    error: null,
    syncedAt: finishedWindow ? new Date().toISOString() : null,
  });

  return result;
}

async function pullPages(input: {
  accessToken: string;
  path: string;
  createdGte: number;
  cursor: string | null;
  maxPages: number;
  fetchImpl?: typeof fetch;
  mapRow: (row: unknown) => LedgerDraft | null;
  expandSource: boolean;
}) {
  const rows: LedgerDraft[] = [];
  let cursor = input.cursor;
  let complete = false;
  let pages = 0;

  while (pages < input.maxPages) {
    const page = await listPage(
      input.accessToken,
      input.path,
      input.createdGte,
      cursor,
      input.expandSource,
      input.fetchImpl,
    );
    pages += 1;
    rows.push(...page.data.map(input.mapRow).filter((row): row is LedgerDraft => Boolean(row)));
    cursor = page.lastId ?? cursor;
    complete = !page.hasMore;

    if (!page.hasMore) {
      break;
    }
  }

  return { rows, cursor, complete, pages };
}

async function listPage(
  accessToken: string,
  path: string,
  createdGte: number,
  cursor: string | null,
  expandSource: boolean,
  fetchImpl?: typeof fetch,
) {
  const query = {
    limit: PAGE_SIZE,
    "created[gte]": createdGte,
    starting_after: cursor ?? undefined,
  };

  if (!expandSource) {
    return pageFromList(await stripeGet<{ data?: unknown[]; has_more?: boolean }>({
      accessToken,
      path,
      query,
      fetchImpl,
    }));
  }

  try {
    return pageFromList(await stripeGet<{ data?: unknown[]; has_more?: boolean }>({
      accessToken,
      path,
      query: { ...query, "expand[]": "data.source" },
      fetchImpl,
    }));
  } catch {
    return pageFromList(await stripeGet<{ data?: unknown[]; has_more?: boolean }>({
      accessToken,
      path,
      query,
      fetchImpl,
    }));
  }
}

export async function importBalanceTransaction(input: {
  client: SupabaseClient;
  connection: StoredConnection;
  accessToken: string;
  balanceTransactionId: string;
  fetchImpl?: typeof fetch;
}) {
  const payload = await stripeGet<unknown>({
    accessToken: input.accessToken,
    path: `/v1/balance_transactions/${input.balanceTransactionId}`,
    query: { "expand[]": "source" },
    fetchImpl: input.fetchImpl,
  });
  const draft = mapBalanceTransaction(payload, input.connection.livemode);

  if (!draft) {
    return;
  }

  const rules = await listCategoryRules(input.client, input.connection.organizationId);
  await upsertLedgerDrafts(input.client, {
    organizationId: input.connection.organizationId,
    connectionId: input.connection.id,
    rows: withCategories([draft], rules),
  });
}

export async function importInvoiceObject(input: {
  client: SupabaseClient;
  connection: StoredConnection;
  invoice: unknown;
}) {
  const draft = mapInvoice(input.invoice, input.connection.livemode);

  if (!draft) {
    return;
  }

  const rules = await listCategoryRules(input.client, input.connection.organizationId);
  await upsertLedgerDrafts(input.client, {
    organizationId: input.connection.organizationId,
    connectionId: input.connection.id,
    rows: withCategories([draft], rules),
  });
}

function withCategories(rows: LedgerDraft[], rules: CategoryRule[]) {
  return rows.map((row) => ({
    ...row,
    category: categorize(row, rules),
  }));
}

function toUnix(iso: string) {
  return Math.floor(new Date(iso).getTime() / 1000);
}

function overlapUnix(lastSyncedAt: string | null, backfillStart: string) {
  const overlap = lastSyncedAt
    ? new Date(lastSyncedAt).getTime() - 3 * 24 * 60 * 60 * 1000
    : new Date(backfillStart).getTime();

  return Math.floor(Math.max(overlap, new Date(backfillStart).getTime()) / 1000);
}

export function publicSyncError(error: unknown) {
  const message = error instanceof Error ? error.message : "Sync failed.";

  return message
    .replace(/sk_(live|test)_[A-Za-z0-9]+/g, "[redacted]")
    .replace(/\b(rk|whsec)_[A-Za-z0-9]+/g, "[redacted]")
    .slice(0, 300);
}
