import type { SupabaseClient } from "@supabase/supabase-js";
import {
  loadStripeBookkeepingConfig,
  readServerEnv,
  secretKeyForMode,
  type StripeBookkeepingConfig,
} from "./config";
import { disconnectWorkspaceStripe } from "./disconnect";
import { deauthorizeStripeApp } from "./oauth";
import { importBalanceTransaction, importInvoiceObject, publicSyncError, syncConnection, ensureAccessToken } from "./sync";
import {
  completeWebhookEvent,
  createStripeAdminClient,
  deleteOrganizationStripeData,
  getConnectionByOrganization,
  getConnectionByStripeAccount,
  listConnectionsForSync,
  markBalanceCursor,
  updateCustomerSnapshots,
} from "./store";

const DELETE_EVENT_TYPES = new Set([
  "account.application.deauthorized",
  "apps.install.deleted",
  "app.install.deleted",
]);

export async function runNightlyBookkeepingSync(input?: { maxPages?: number; connectionLimit?: number }) {
  const config = loadStripeBookkeepingConfig();

  if (!config.enabled) {
    return { skipped: true, connections: 0 };
  }

  const client = createStripeAdminClient();
  const connections = await listConnectionsForSync(client, input?.connectionLimit ?? 20);
  let synced = 0;

  for (const connection of connections) {
    try {
      const accessToken = await ensureAccessToken({ client, connection, config });
      await syncConnection({
        client,
        connection,
        accessToken,
        maxPages: input?.maxPages ?? 4,
      });
      synced += 1;
    } catch (error) {
      await markBalanceCursor(client, {
        connectionId: connection.id,
        cursor: connection.balanceCursor,
        backfillComplete: connection.balanceBackfillComplete,
        error: publicSyncError(error),
        syncedAt: null,
      }).catch(() => undefined);
    }
  }

  return { skipped: false, connections: synced };
}

export async function runOrganizationBackfill(organizationId: string, maxPages = 25) {
  const config = loadStripeBookkeepingConfig();

  if (!config.enabled) {
    return { skipped: true };
  }

  const client = createStripeAdminClient();
  const connection = await getConnectionByOrganization(client, organizationId);

  if (!connection) {
    return { skipped: true };
  }

  const accessToken = await ensureAccessToken({ client, connection, config });
  await syncConnection({ client, connection, accessToken, maxPages });
  return { skipped: false };
}

export async function applyStripeWebhookEvent(event: {
  id?: string;
  type?: string;
  account?: string;
  data?: { object?: Record<string, unknown> };
}) {
  const config = loadStripeBookkeepingConfig();
  const client = createStripeAdminClient();
  const eventId = String(event.id ?? "");
  const eventType = String(event.type ?? "");
  const accountId = stringValue(event.account) || stringValue(event.data?.object?.account);
  const connection = accountId ? await getConnectionByStripeAccount(client, accountId) : null;

  if (DELETE_EVENT_TYPES.has(eventType)) {
    if (connection) {
      await revokeAndDelete(client, config, connection.organizationId, connection.stripeAccountId, connection.livemode);
    }

    await completeWebhookEvent(client, {
      eventId,
      organizationId: connection?.organizationId ?? null,
    });
    return;
  }

  if (!connection) {
    await completeWebhookEvent(client, { eventId, organizationId: null });
    return;
  }

  const object = event.data?.object ?? {};
  const accessToken = await ensureAccessToken({ client, connection, config });

  if (eventType.startsWith("invoice.")) {
    await importInvoiceObject({ client, connection, invoice: object });
  } else if (eventType.startsWith("customer.")) {
    const customerId = stringValue(object.id);
    if (customerId) {
      const deleted = object.deleted === true || eventType === "customer.deleted";
      await updateCustomerSnapshots(client, {
        organizationId: connection.organizationId,
        customerId,
        name: deleted ? "" : stringValue(object.name),
        email: deleted ? "" : stringValue(object.email),
      });
    }
  } else {
    const balanceTransactionId =
      stringValue(object.balance_transaction) ||
      stringValue((object.balance_transaction as { id?: string } | undefined)?.id);

    if (balanceTransactionId.startsWith("txn_")) {
      await importBalanceTransaction({
        client,
        connection,
        accessToken,
        balanceTransactionId,
      });
    }
  }

  await completeWebhookEvent(client, {
    eventId,
    organizationId: connection.organizationId,
  });
}

export async function revokeAndDelete(
  client: SupabaseClient,
  config: StripeBookkeepingConfig,
  organizationId: string,
  stripeAccountId: string,
  livemode: boolean,
) {
  return disconnectWorkspaceStripe({
    organizationId,
    store: {
      findConnection: async () => ({ stripeAccountId, livemode }),
      deleteOrganizationStripeData: (id) => deleteOrganizationStripeData(client, id),
    },
    revoke: async (account) => {
      try {
        return await deauthorizeStripeApp({
          secretKey: secretKeyForMode(config, account.livemode),
          clientId: config.clientId,
          stripeUserId: account.stripeAccountId,
        });
      } catch {
        return { ok: false, status: 0 };
      }
    },
  });
}

export async function kickOrganizationBackfill(organizationId: string) {
  const config = loadStripeBookkeepingConfig();
  const base = readServerEnv("URL") || readServerEnv("DEPLOY_PRIME_URL");

  if (config.jobSecret && base) {
    const response = await fetch(new URL("/.netlify/functions/stripe-bookkeeping-sync-background", base), {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-afe-job-secret": config.jobSecret,
      },
      body: JSON.stringify({ organizationId }),
    }).catch(() => null);

    if (response?.ok || response?.status === 202) {
      return;
    }
  }

  await runOrganizationBackfill(organizationId, 2);
}

function stringValue(value: unknown) {
  return typeof value === "string" ? value : "";
}
