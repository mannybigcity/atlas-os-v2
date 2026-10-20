export type DisconnectDeletionCounts = {
  transactions: number;
  rules: number;
  secrets: number;
  states: number;
  receipts: number;
  connections: number;
};

export type StripeDisconnectStore = {
  findConnection: (
    organizationId: string,
  ) => Promise<{ stripeAccountId: string; livemode: boolean } | null>;
  deleteOrganizationStripeData: (organizationId: string) => Promise<DisconnectDeletionCounts>;
};

export type RevokeResult = {
  ok: boolean;
  status: number;
};

export async function disconnectWorkspaceStripe(input: {
  organizationId: string;
  store: StripeDisconnectStore;
  revoke: (account: { stripeAccountId: string; livemode: boolean }) => Promise<RevokeResult>;
}) {
  const connection = await input.store.findConnection(input.organizationId);
  const revokeResult = connection
    ? await input.revoke(connection)
    : { ok: true, status: 204 };
  const deleted = await input.store.deleteOrganizationStripeData(input.organizationId);

  return {
    revoked: revokeResult.ok,
    revokeStatus: revokeResult.status,
    deleted,
  };
}
