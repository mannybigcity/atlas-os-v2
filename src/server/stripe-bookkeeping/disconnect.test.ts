import assert from "node:assert/strict";
import test from "node:test";
import { disconnectWorkspaceStripe, type DisconnectDeletionCounts } from "./disconnect";

type OrgData = {
  stripeAccountId: string;
  livemode: boolean;
  transactions: number;
  rules: number;
  secrets: number;
  states: number;
  receipts: number;
};

test("disconnect revokes the token and hard-deletes only that workspace", async () => {
  const orgs = new Map<string, OrgData>([
    ["org-a", { stripeAccountId: "acct_a", livemode: true, transactions: 4, rules: 8, secrets: 1, states: 1, receipts: 2 }],
    ["org-b", { stripeAccountId: "acct_b", livemode: false, transactions: 3, rules: 8, secrets: 1, states: 0, receipts: 1 }],
  ]);
  const revoked: string[] = [];
  const store = {
    findConnection: async (organizationId: string) => {
      const org = orgs.get(organizationId);
      return org ? { stripeAccountId: org.stripeAccountId, livemode: org.livemode } : null;
    },
    deleteOrganizationStripeData: async (organizationId: string): Promise<DisconnectDeletionCounts> => {
      const org = orgs.get(organizationId);

      if (!org) {
        return { transactions: 0, rules: 0, secrets: 0, states: 0, receipts: 0, connections: 0 };
      }

      orgs.delete(organizationId);
      return {
        transactions: org.transactions,
        rules: org.rules,
        secrets: org.secrets,
        states: org.states,
        receipts: org.receipts,
        connections: 1,
      };
    },
  };

  const result = await disconnectWorkspaceStripe({
    organizationId: "org-a",
    store,
    revoke: async (account) => {
      revoked.push(account.stripeAccountId);
      return { ok: true, status: 200 };
    },
  });

  assert.deepEqual(revoked, ["acct_a"]);
  assert.equal(result.revoked, true);
  assert.equal(result.deleted.transactions, 4);
  assert.equal(result.deleted.connections, 1);
  assert.equal(orgs.has("org-a"), false);
  assert.equal(orgs.get("org-b")?.transactions, 3);
});

test("local deletion still happens when Stripe revocation fails", async () => {
  const deleted: string[] = [];
  const result = await disconnectWorkspaceStripe({
    organizationId: "org-a",
    store: {
      findConnection: async () => ({ stripeAccountId: "acct_a", livemode: true }),
      deleteOrganizationStripeData: async (organizationId) => {
        deleted.push(organizationId);
        return { transactions: 1, rules: 1, secrets: 1, states: 0, receipts: 0, connections: 1 };
      },
    },
    revoke: async () => ({ ok: false, status: 404 }),
  });

  assert.equal(result.revoked, false);
  assert.equal(result.revokeStatus, 404);
  assert.deepEqual(deleted, ["org-a"]);
});
