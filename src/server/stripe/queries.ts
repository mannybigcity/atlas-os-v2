import "server-only";

import type Stripe from "stripe";
import {
  getAtlasStripeClient,
  getAtlasStripeMode,
  type StripeMode,
} from "@/server/stripe/client";

const LIST_LIMIT = 8;

export type StripeDataSection<T> =
  | { status: "ready"; data: T }
  | { status: "unavailable" };

export type StripeBalanceEntry = {
  amount: number;
  currency: string;
};

export type StripePaymentSummary = {
  id: string;
  amount: number;
  currency: string;
  createdAt: string;
  status: string;
};

export type StripeSubscriptionSummary = {
  id: string;
  billingCycleAnchor: string;
  createdAt: string;
  status: string;
};

export type StripeInvoiceSummary = {
  id: string;
  amountPaid: number;
  currency: string;
  createdAt: string;
  status: string;
  total: number;
};

export type AtlasMoneySnapshot =
  | {
      configured: false;
    }
  | {
      configured: true;
      mode: StripeMode;
      fetchedAt: string;
      balance: StripeDataSection<{
        available: StripeBalanceEntry[];
        pending: StripeBalanceEntry[];
      }>;
      payments: StripeDataSection<StripePaymentSummary[]>;
      subscriptions: StripeDataSection<StripeSubscriptionSummary[]>;
      invoices: StripeDataSection<StripeInvoiceSummary[]>;
    };

export async function getAtlasMoneySnapshot(): Promise<AtlasMoneySnapshot> {
  const stripe = getAtlasStripeClient();

  if (!stripe) {
    return { configured: false };
  }

  const [balanceResult, paymentsResult, subscriptionsResult, invoicesResult] =
    await Promise.allSettled([
      stripe.balance.retrieve(),
      stripe.paymentIntents.list({ limit: LIST_LIMIT }),
      stripe.subscriptions.list({ limit: LIST_LIMIT, status: "all" }),
      stripe.invoices.list({ limit: LIST_LIMIT }),
    ]);

  return {
    configured: true,
    mode: getAtlasStripeMode(),
    fetchedAt: new Date().toISOString(),
    balance: mapSettled(balanceResult, summarizeBalance),
    payments: mapSettled(paymentsResult, (payments) =>
      payments.data.map(summarizePayment),
    ),
    subscriptions: mapSettled(subscriptionsResult, (subscriptions) =>
      subscriptions.data.map(summarizeSubscription),
    ),
    invoices: mapSettled(invoicesResult, (invoices) =>
      invoices.data.map(summarizeInvoice),
    ),
  };
}

function mapSettled<TInput, TOutput>(
  result: PromiseSettledResult<TInput>,
  map: (value: TInput) => TOutput,
): StripeDataSection<TOutput> {
  if (result.status === "rejected") {
    return { status: "unavailable" };
  }

  return { status: "ready", data: map(result.value) };
}

function summarizeBalance(balance: Stripe.Balance) {
  return {
    available: balance.available.map(summarizeBalanceEntry),
    pending: balance.pending.map(summarizeBalanceEntry),
  };
}

function summarizeBalanceEntry(
  entry: Stripe.Balance.Available | Stripe.Balance.Pending,
): StripeBalanceEntry {
  return {
    amount: entry.amount,
    currency: entry.currency,
  };
}

function summarizePayment(payment: Stripe.PaymentIntent): StripePaymentSummary {
  return {
    id: payment.id,
    amount:
      payment.status === "succeeded" ? payment.amount_received : payment.amount,
    currency: payment.currency,
    createdAt: toIsoDate(payment.created),
    status: payment.status,
  };
}

function summarizeSubscription(
  subscription: Stripe.Subscription,
): StripeSubscriptionSummary {
  return {
    id: subscription.id,
    billingCycleAnchor: toIsoDate(subscription.billing_cycle_anchor),
    createdAt: toIsoDate(subscription.created),
    status: subscription.status,
  };
}

function summarizeInvoice(invoice: Stripe.Invoice): StripeInvoiceSummary {
  return {
    id: invoice.id,
    amountPaid: invoice.amount_paid,
    currency: invoice.currency,
    createdAt: toIsoDate(invoice.created),
    status: invoice.status ?? "unknown",
    total: invoice.total,
  };
}

function toIsoDate(unixSeconds: number) {
  return new Date(unixSeconds * 1_000).toISOString();
}
