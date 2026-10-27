import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { defaultCategoryRules, type CategoryRule } from "./categories";
import { decodeEncryptionKey, decryptSecret, encryptSecret } from "./crypto";
import { readServerEnv } from "./config";
import type { DisconnectDeletionCounts } from "./disconnect";
import type { LedgerDraft } from "./map-entry";
import type { OAuthTokenSet } from "./oauth";

export type StoredConnection = {
  id: string;
  organizationId: string;
  stripeAccountId: string;
  livemode: boolean;
  status: "active" | "error";
  backfillMonths: number;
  backfillCreatedGte: string;
  balanceCursor: string | null;
  balanceBackfillComplete: boolean;
  invoiceCursor: string | null;
  invoiceBackfillComplete: boolean;
  lastSyncedAt: string | null;
  lastSyncError: string | null;
};

export type StoredSecrets = {
  connectionId: string;
  accessTokenCiphertext: string;
  refreshTokenCiphertext: string;
  tokenExpiresAt: string;
  refreshExpiresAt: string;
};

type ConnectionRow = {
  id: string;
  organization_id: string;
  stripe_account_id: string;
  livemode: boolean;
  status: "active" | "error";
  backfill_months: number;
  backfill_created_gte: string;
  balance_cursor: string | null;
  balance_backfill_complete: boolean;
  invoice_cursor: string | null;
  invoice_backfill_complete: boolean;
  last_synced_at: string | null;
  last_sync_error: string | null;
};

type SecretRow = {
  connection_id: string;
  access_token_ciphertext: string;
  refresh_token_ciphertext: string;
  token_expires_at: string;
  refresh_expires_at: string;
};

type RuleRow = {
  priority: number;
  enabled: boolean;
  match_field: CategoryRule["matchField"];
  match_operator: CategoryRule["matchOperator"];
  match_value: string;
  category: CategoryRule["category"];
};

export function createStripeAdminClient() {
  const url = readServerEnv("NEXT_PUBLIC_SUPABASE_URL");
  const key = readServerEnv("SUPABASE_SERVICE_ROLE_KEY");

  if (!url || !key) {
    throw new Error("Supabase service credentials are missing.");
  }

  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function insertOAuthState(
  client: SupabaseClient,
  input: { organizationId: string; userId: string; stateHash: string; expiresAt: string },
) {
  const { error } = await client.from("stripe_bookkeeping_oauth_states").insert({
    organization_id: input.organizationId,
    user_id: input.userId,
    state_hash: input.stateHash,
    expires_at: input.expiresAt,
  });

  if (error) {
    throw new Error("Could not start the Stripe connection.");
  }
}

export async function consumeOAuthState(
  client: SupabaseClient,
  input: { stateHash: string; userId: string; now?: Date },
) {
  const now = input.now ?? new Date();
  const { data, error } = await client
    .from("stripe_bookkeeping_oauth_states")
    .select("id, organization_id, user_id, expires_at, consumed_at")
    .eq("state_hash", input.stateHash)
    .maybeSingle();

  if (error || !data) {
    throw new Error("The Stripe connection request was not recognized.");
  }

  const row = data as {
    id: string;
    organization_id: string;
    user_id: string;
    expires_at: string;
    consumed_at: string | null;
  };

  if (row.user_id !== input.userId || row.consumed_at || new Date(row.expires_at).getTime() <= now.getTime()) {
    throw new Error("The Stripe connection request expired. Start it again from the workspace.");
  }

  const consumedAt = now.toISOString();
  const { data: updated, error: updateError } = await client
    .from("stripe_bookkeeping_oauth_states")
    .update({ consumed_at: consumedAt })
    .eq("id", row.id)
    .is("consumed_at", null)
    .select("id")
    .maybeSingle();

  if (updateError || !updated) {
    throw new Error("The Stripe connection request was already used.");
  }

  return { organizationId: row.organization_id };
}

export async function saveConnectionTokens(
  client: SupabaseClient,
  input: {
    organizationId: string;
    installedBy: string;
    tokens: OAuthTokenSet;
    encryptionKey: string;
    backfillMonths: number;
  },
) {
  const key = decodeEncryptionKey(input.encryptionKey);
  const backfillCreatedGte = monthsAgo(input.backfillMonths);
  const tokenExpiresAt = new Date(Date.now() + input.tokens.expiresInSeconds * 1000).toISOString();
  const refreshExpiresAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();
  const secrets = {
    access_token_ciphertext: encryptSecret(input.tokens.accessToken, key),
    refresh_token_ciphertext: encryptSecret(input.tokens.refreshToken, key),
    token_expires_at: tokenExpiresAt,
    refresh_expires_at: refreshExpiresAt,
  };
  const { data: existing, error: existingError } = await client
    .from("stripe_bookkeeping_connections")
    .select("id, organization_id")
    .eq("stripe_account_id", input.tokens.stripeUserId)
    .maybeSingle();

  if (existingError) {
    throw new Error("Could not store the Stripe connection.");
  }

  const existingRow = existing as { id: string; organization_id: string } | null;

  if (existingRow && existingRow.organization_id !== input.organizationId) {
    throw new Error("That Stripe account is already connected to another workspace.");
  }

  const connectionPayload = {
    organization_id: input.organizationId,
    stripe_account_id: input.tokens.stripeUserId,
    livemode: input.tokens.livemode,
    status: "active",
    backfill_months: input.backfillMonths,
    backfill_created_gte: backfillCreatedGte,
    balance_cursor: null,
    balance_backfill_complete: false,
    invoice_cursor: null,
    invoice_backfill_complete: false,
    last_sync_error: null,
    installed_by: input.installedBy,
  };
  const { data: connection, error: connectionError } = existingRow
    ? await client
        .from("stripe_bookkeeping_connections")
        .update(connectionPayload)
        .eq("id", existingRow.id)
        .select("id")
        .single()
    : await client
        .from("stripe_bookkeeping_connections")
        .insert(connectionPayload)
        .select("id")
        .single();

  if (connectionError || !connection) {
    throw new Error("Could not store the Stripe connection.");
  }

  const connectionId = (connection as { id: string }).id;
  const { error: secretError } = await client.from("stripe_bookkeeping_secrets").upsert({
    connection_id: connectionId,
    ...secrets,
  });

  if (secretError) {
    throw new Error("Could not store the Stripe connection secrets.");
  }

  return connectionId;
}

export async function replaceStoredTokens(
  client: SupabaseClient,
  input: { connectionId: string; tokens: OAuthTokenSet; encryptionKey: string },
) {
  const key = decodeEncryptionKey(input.encryptionKey);
  const { error } = await client
    .from("stripe_bookkeeping_secrets")
    .update({
      access_token_ciphertext: encryptSecret(input.tokens.accessToken, key),
      refresh_token_ciphertext: encryptSecret(input.tokens.refreshToken, key),
      token_expires_at: new Date(Date.now() + input.tokens.expiresInSeconds * 1000).toISOString(),
      refresh_expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
    })
    .eq("connection_id", input.connectionId);

  if (error) {
    throw new Error("Could not store the refreshed Stripe token. Reconnect the workspace.");
  }
}

export async function getConnectionByOrganization(client: SupabaseClient, organizationId: string) {
  const { data, error } = await client
    .from("stripe_bookkeeping_connections")
    .select(
      "id, organization_id, stripe_account_id, livemode, status, backfill_months, backfill_created_gte, balance_cursor, balance_backfill_complete, invoice_cursor, invoice_backfill_complete, last_synced_at, last_sync_error",
    )
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (error) {
    throw new Error("Could not load the Stripe connection.");
  }

  return data ? mapConnection(data as ConnectionRow) : null;
}

export async function getConnectionByStripeAccount(client: SupabaseClient, stripeAccountId: string) {
  const { data, error } = await client
    .from("stripe_bookkeeping_connections")
    .select(
      "id, organization_id, stripe_account_id, livemode, status, backfill_months, backfill_created_gte, balance_cursor, balance_backfill_complete, invoice_cursor, invoice_backfill_complete, last_synced_at, last_sync_error",
    )
    .eq("stripe_account_id", stripeAccountId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return mapConnection(data as ConnectionRow);
}

export async function listConnectionsForSync(client: SupabaseClient, limit: number) {
  const { data, error } = await client
    .from("stripe_bookkeeping_connections")
    .select(
      "id, organization_id, stripe_account_id, livemode, status, backfill_months, backfill_created_gte, balance_cursor, balance_backfill_complete, invoice_cursor, invoice_backfill_complete, last_synced_at, last_sync_error",
    )
    .order("last_synced_at", { ascending: true, nullsFirst: true })
    .limit(limit);

  if (error) {
    throw new Error("Could not list Stripe connections.");
  }

  return ((data ?? []) as ConnectionRow[]).map(mapConnection);
}

export async function getSecrets(client: SupabaseClient, connectionId: string) {
  const { data, error } = await client
    .from("stripe_bookkeeping_secrets")
    .select("connection_id, access_token_ciphertext, refresh_token_ciphertext, token_expires_at, refresh_expires_at")
    .eq("connection_id", connectionId)
    .maybeSingle();

  if (error || !data) {
    throw new Error("Stripe connection secrets are missing.");
  }

  const row = data as SecretRow;

  return {
    connectionId: row.connection_id,
    accessTokenCiphertext: row.access_token_ciphertext,
    refreshTokenCiphertext: row.refresh_token_ciphertext,
    tokenExpiresAt: row.token_expires_at,
    refreshExpiresAt: row.refresh_expires_at,
  } satisfies StoredSecrets;
}

export function readAccessToken(secrets: StoredSecrets, encryptionKey: string) {
  return decryptSecret(secrets.accessTokenCiphertext, decodeEncryptionKey(encryptionKey));
}

export function readRefreshToken(secrets: StoredSecrets, encryptionKey: string) {
  return decryptSecret(secrets.refreshTokenCiphertext, decodeEncryptionKey(encryptionKey));
}

export async function listCategoryRules(client: SupabaseClient, organizationId: string) {
  const { data, error } = await client
    .from("stripe_bookkeeping_category_rules")
    .select("priority, enabled, match_field, match_operator, match_value, category")
    .eq("organization_id", organizationId)
    .order("priority", { ascending: true });

  if (error) {
    throw new Error("Could not load category rules.");
  }

  return ((data ?? []) as RuleRow[]).map((row) => ({
    priority: row.priority,
    enabled: row.enabled,
    matchField: row.match_field,
    matchOperator: row.match_operator,
    matchValue: row.match_value,
    category: row.category,
  }));
}

export async function seedDefaultCategoryRules(
  client: SupabaseClient,
  input: { organizationId: string; connectionId: string; userId: string },
) {
  const { count, error: countError } = await client
    .from("stripe_bookkeeping_category_rules")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", input.organizationId);

  if (countError) {
    throw new Error("Could not prepare category rules.");
  }

  if ((count ?? 0) > 0) {
    return;
  }

  const { error } = await client.from("stripe_bookkeeping_category_rules").insert(
    defaultCategoryRules().map((rule) => ({
      organization_id: input.organizationId,
      connection_id: input.connectionId,
      priority: rule.priority,
      enabled: rule.enabled,
      match_field: rule.matchField,
      match_operator: rule.matchOperator,
      match_value: rule.matchValue,
      category: rule.category,
      is_default: true,
      created_by: input.userId,
    })),
  );

  if (error) {
    throw new Error("Could not prepare category rules.");
  }
}

export async function upsertLedgerDrafts(
  client: SupabaseClient,
  input: { organizationId: string; connectionId: string; rows: Array<LedgerDraft & { category: string }> },
) {
  if (input.rows.length === 0) {
    return;
  }

  const payload = input.rows.map((row) => ({
    organization_id: input.organizationId,
    connection_id: input.connectionId,
    stripe_object_id: row.stripeObjectId,
    record_type: row.recordType,
    stripe_type: row.stripeType,
    category: row.category,
    description: row.description,
    amount_minor: row.amountMinor,
    fee_minor: row.feeMinor,
    net_minor: row.netMinor,
    currency: row.currency,
    customer_stripe_id: row.customerStripeId || null,
    customer_name: row.customerName,
    customer_email: row.customerEmail,
    invoice_id: row.invoiceId,
    status: row.status,
    occurred_at: row.occurredAt,
    counts_in_cash_totals: row.countsInCashTotals,
    livemode: row.livemode,
  }));

  const { error } = await client.from("stripe_bookkeeping_transactions").upsert(payload, {
    onConflict: "organization_id,stripe_object_id",
  });

  if (error) {
    throw new Error("Could not save Stripe ledger rows.");
  }
}

export async function markBalanceCursor(
  client: SupabaseClient,
  input: {
    connectionId: string;
    cursor: string | null;
    backfillComplete: boolean;
    error: string | null;
    syncedAt: string | null;
  },
) {
  const { error } = await client
    .from("stripe_bookkeeping_connections")
    .update({
      balance_cursor: input.cursor,
      balance_backfill_complete: input.backfillComplete,
      ...(input.syncedAt ? { last_synced_at: input.syncedAt } : {}),
      last_sync_error: input.error,
      status: input.error ? "error" : "active",
    })
    .eq("id", input.connectionId);

  if (error) {
    throw new Error("Could not save Stripe sync progress.");
  }
}

export async function markInvoiceCursor(
  client: SupabaseClient,
  input: {
    connectionId: string;
    cursor: string | null;
    backfillComplete: boolean;
    error: string | null;
    syncedAt: string | null;
  },
) {
  const { error } = await client
    .from("stripe_bookkeeping_connections")
    .update({
      invoice_cursor: input.cursor,
      invoice_backfill_complete: input.backfillComplete,
      ...(input.syncedAt ? { last_synced_at: input.syncedAt } : {}),
      last_sync_error: input.error,
      status: input.error ? "error" : "active",
    })
    .eq("id", input.connectionId);

  if (error) {
    throw new Error("Could not save Stripe sync progress.");
  }
}

export async function updateCustomerSnapshots(
  client: SupabaseClient,
  input: { organizationId: string; customerId: string; name: string; email: string },
) {
  const { error } = await client
    .from("stripe_bookkeeping_transactions")
    .update({
      customer_name: input.name.slice(0, 200),
      customer_email: input.email.slice(0, 320),
    })
    .eq("organization_id", input.organizationId)
    .eq("customer_stripe_id", input.customerId);

  if (error) {
    throw new Error("Could not update customer details on the ledger.");
  }
}

export async function claimWebhookEvent(client: SupabaseClient, eventId: string, eventType: string) {
  const { error } = await client.from("stripe_bookkeeping_webhook_receipts").insert({
    event_id: eventId,
    event_type: eventType,
  });

  if (!error) {
    return "claimed" as const;
  }

  if (error.code !== "23505") {
    throw new Error("Could not record the Stripe event.");
  }

  const { data } = await client
    .from("stripe_bookkeeping_webhook_receipts")
    .select("processed_at")
    .eq("event_id", eventId)
    .maybeSingle();
  const processedAt = (data as { processed_at: string | null } | null)?.processed_at;

  return processedAt ? ("duplicate" as const) : ("retry" as const);
}

export async function completeWebhookEvent(
  client: SupabaseClient,
  input: { eventId: string; organizationId: string | null },
) {
  await client
    .from("stripe_bookkeeping_webhook_receipts")
    .update({
      processed_at: new Date().toISOString(),
      organization_id: input.organizationId,
    })
    .eq("event_id", input.eventId);
}

export async function deleteOrganizationStripeData(
  client: SupabaseClient,
  organizationId: string,
): Promise<DisconnectDeletionCounts> {
  const [transactions, rules, secrets, states, receipts, connections] = await Promise.all([
    countRows(client, "stripe_bookkeeping_transactions", organizationId),
    countRows(client, "stripe_bookkeeping_category_rules", organizationId),
    countSecrets(client, organizationId),
    countRows(client, "stripe_bookkeeping_oauth_states", organizationId),
    countRows(client, "stripe_bookkeeping_webhook_receipts", organizationId),
    countRows(client, "stripe_bookkeeping_connections", organizationId),
  ]);

  const { error: receiptError } = await client
    .from("stripe_bookkeeping_webhook_receipts")
    .delete()
    .eq("organization_id", organizationId);
  const { error: stateError } = await client
    .from("stripe_bookkeeping_oauth_states")
    .delete()
    .eq("organization_id", organizationId);
  const { error: connectionError } = await client
    .from("stripe_bookkeeping_connections")
    .delete()
    .eq("organization_id", organizationId);

  if (receiptError || stateError || connectionError) {
    throw new Error("Could not delete this workspace's Stripe records.");
  }

  return { transactions, rules, secrets, states, receipts, connections };
}

async function countRows(client: SupabaseClient, table: string, organizationId: string) {
  const column = table === "stripe_bookkeeping_webhook_receipts" ? "event_id" : "id";
  const { count, error } = await client
    .from(table)
    .select(column, { count: "exact", head: true })
    .eq("organization_id", organizationId);

  if (error) {
    throw new Error("Could not count Stripe records before deletion.");
  }

  return count ?? 0;
}

async function countSecrets(client: SupabaseClient, organizationId: string) {
  const { data, error } = await client
    .from("stripe_bookkeeping_connections")
    .select("id")
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (error || !data) {
    return 0;
  }

  const { count, error: secretError } = await client
    .from("stripe_bookkeeping_secrets")
    .select("connection_id", { count: "exact", head: true })
    .eq("connection_id", (data as { id: string }).id);

  if (secretError) {
    throw new Error("Could not count Stripe records before deletion.");
  }

  return count ?? 0;
}

function mapConnection(row: ConnectionRow): StoredConnection {
  return {
    id: row.id,
    organizationId: row.organization_id,
    stripeAccountId: row.stripe_account_id,
    livemode: row.livemode,
    status: row.status,
    backfillMonths: row.backfill_months,
    backfillCreatedGte: row.backfill_created_gte,
    balanceCursor: row.balance_cursor,
    balanceBackfillComplete: row.balance_backfill_complete,
    invoiceCursor: row.invoice_cursor,
    invoiceBackfillComplete: row.invoice_backfill_complete,
    lastSyncedAt: row.last_synced_at,
    lastSyncError: row.last_sync_error,
  };
}

function monthsAgo(months: number) {
  const date = new Date();
  date.setUTCMonth(date.getUTCMonth() - months);
  return date.toISOString();
}
